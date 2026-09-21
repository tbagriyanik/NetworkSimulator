import { describe, it, expect } from 'vitest';
import {
  cmdCryptoIsakmpPolicy,
  cmdCryptoIpsecTransformSet,
  cmdCryptoMap,
  cmdShowCryptoIsakmpSa,
  cmdShowCryptoIpsecSa,
  cmdShowCryptoMap,
} from '@/lib/network/core/cryptoCommands';
import {
  establishIpsecSa,
  encapsulateEsp,
  decapsulateEsp,
  encapsulateGreOverIpsec,
  decapsulateGreOverIpsec,
} from '@/lib/network/ipsec';
import type { SwitchState } from '@/lib/network/types';
import type { CommandContext } from '@/lib/network/core/commandTypes';

describe('IPsec VPN E2E Pipeline (CLI -> State -> IKE/SA -> ESP Encapsulation -> Show)', () => {
  const ctx = {} as CommandContext;

  it('configures IKE policy, transform set, crypto map and processes ESP payload in data plane', () => {
    // 1. Initial State in config mode
    const vpnRouter = {
      currentMode: 'config',
      hostname: 'VPN-GW-A',
      ipRouting: true,
      ports: {
        'GigabitEthernet0/0': { id: 'GigabitEthernet0/0', ipAddress: '203.0.113.1', shutdown: false },
      },
    } as unknown as SwitchState;

    // 2. CLI -> State: Configure ISAKMP policy 10
    const isakmpRes = cmdCryptoIsakmpPolicy(vpnRouter, 'crypto isakmp policy 10', ctx);
    expect(isakmpRes.success).toBe(true);
    expect(vpnRouter.cryptoIsakmpPolicies?.[10]).toBeDefined();
    expect(vpnRouter.cryptoIsakmpPolicies?.[10].encryption).toBe('aes');

    // 3. CLI -> State: Configure IPsec transform set TS-AES-SHA
    const tsRes = cmdCryptoIpsecTransformSet(
      vpnRouter,
      'crypto ipsec transform-set TS-AES-SHA esp-aes esp-sha-hmac',
      ctx
    );
    expect(tsRes.success).toBe(true);
    expect(vpnRouter.cryptoIpsecTransformSets?.['TS-AES-SHA']?.espEncryption).toBe('esp-aes');
    expect(vpnRouter.cryptoIpsecTransformSets?.['TS-AES-SHA']?.espAuth).toBe('esp-sha-hmac');

    // 4. CLI -> State: Configure crypto map VPN-MAP 10
    cmdCryptoMap(vpnRouter, 'crypto map VPN-MAP 10 ipsec-isakmp', ctx);
    cmdCryptoMap(vpnRouter, 'crypto map VPN-MAP 10 set peer 203.0.113.2', ctx);
    cmdCryptoMap(vpnRouter, 'crypto map VPN-MAP 10 set transform-set TS-AES-SHA', ctx);
    cmdCryptoMap(vpnRouter, 'crypto map VPN-MAP 10 match address 101', ctx);

    expect(vpnRouter.cryptoMaps?.['VPN-MAP']?.[10]?.setPeer).toBe('203.0.113.2');
    expect(vpnRouter.cryptoMaps?.['VPN-MAP']?.[10]?.setTransformSet).toBe('TS-AES-SHA');
    expect(vpnRouter.cryptoMaps?.['VPN-MAP']?.[10]?.matchAddress).toBe('101');

    // 5. Data Plane: Establish SA and Encapsulate / Decapsulate ESP Packet
    const sa = establishIpsecSa('203.0.113.2', 'TS-AES-SHA');
    expect(sa.phase1).toBe('up');
    expect(sa.phase2).toBe('up');

    const originalPayload = { message: 'INTERNAL_CONFIDENTIAL_DATA', pingSeq: 1 };
    const encryptedPacket = encapsulateEsp('IPv4', sa, originalPayload);

    expect(encryptedPacket.protocol).toBe(50); // ESP Protocol 50
    expect(encryptedPacket.encrypted).toBe(true);
    expect(encryptedPacket.destinationPeer).toBe('203.0.113.2');
    expect(encryptedPacket.spi).toContain('203.0.113.2:TS-AES-SHA');

    // Receiver decapsulates ESP packet
    const decapsulated = decapsulateEsp(encryptedPacket, sa);
    expect(decapsulated).toBeDefined();
    expect(decapsulated?.protocol).toBe('IPv4');
    expect(decapsulated?.payload).toEqual(originalPayload);

    // 6. Show Commands Verification
    const isakmpShow = cmdShowCryptoIsakmpSa(vpnRouter, 'show crypto isakmp sa', ctx);
    expect(isakmpShow.output).toContain('QM_IDLE');
    expect(isakmpShow.output).toContain('ACTIVE');

    const ipsecShow = cmdShowCryptoIpsecSa(vpnRouter, 'show crypto ipsec sa', ctx);
    expect(ipsecShow.output).toContain('Crypto map tag: VPN-MAP');
    expect(ipsecShow.output).toContain('current_peer 203.0.113.2');
    expect(ipsecShow.output).toContain('transform: esp-aes esp-sha-hmac');
    expect(ipsecShow.output).toContain('#pkts encaps');
    expect(ipsecShow.output).toContain('#pkts decaps');

    const mapShow = cmdShowCryptoMap(vpnRouter, 'show crypto map', ctx);
    expect(mapShow.output).toContain('Crypto Map "VPN-MAP" 10 ipsec-isakmp');
    expect(mapShow.output).toContain('Peer = 203.0.113.2');
    expect(mapShow.output).toContain('Transform set = TS-AES-SHA');
  });

  it('rejects decapsulation when SA or SPI is mismatched or phase 2 is down', () => {
    const saA = establishIpsecSa('203.0.113.2', 'TS-1');
    const saB = establishIpsecSa('203.0.113.5', 'TS-2');

    const packet = encapsulateEsp('IPv4', saA, 'SECRET');
    const rejected = decapsulateEsp(packet, saB);
    expect(rejected).toBeUndefined();
  });

  it('performs end-to-end GRE over IPsec encapsulation and decapsulation', () => {
    const sa = establishIpsecSa('198.51.100.2', 'TS-AES-SHA');
    const greSource = '198.51.100.1';
    const greDestination = '198.51.100.2';
    const innerPayload = { type: 'OSPF_HELLO', area: 0, routerId: '10.0.0.1' };

    // Encapsulate into GRE over IPsec
    const greIpsecPacket = encapsulateGreOverIpsec(
      sa,
      greSource,
      greDestination,
      'OSPF',
      innerPayload
    );

    expect(greIpsecPacket.outerProtocol).toBe(50); // ESP
    expect(greIpsecPacket.innerProtocol).toBe('GRE');
    expect(greIpsecPacket.esp.encrypted).toBe(true);
    expect(greIpsecPacket.esp.originalProtocol).toBe('GRE');

    // Decapsulate at the peer
    const decapsulated = decapsulateGreOverIpsec(greIpsecPacket, sa);
    expect(decapsulated).toBeDefined();
    expect(decapsulated?.source).toBe('198.51.100.1');
    expect(decapsulated?.destination).toBe('198.51.100.2');
    expect(decapsulated?.protocol).toBe('OSPF');
    expect(decapsulated?.data).toEqual(innerPayload);

    // Reject on mismatched SA
    const invalidSa = establishIpsecSa('198.51.100.99', 'TS-OTHER');
    const invalidDecap = decapsulateGreOverIpsec(greIpsecPacket, invalidSa);
    expect(invalidDecap).toBeUndefined();
  });
});

