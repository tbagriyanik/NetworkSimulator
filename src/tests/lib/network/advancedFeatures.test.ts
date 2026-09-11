import { describe, expect, it } from 'vitest';
import { calculateRssiDbm, shouldClientRoam } from '@/lib/network/wireless';
import { cmdShowCryptoIsakmpSa, cmdShowCryptoIpsecSa, cmdShowCryptoMap } from '@/lib/network/core/cryptoCommands';
import type { SwitchState } from '@/lib/network/types';
import type { CommandContext } from '@/lib/network/core/commandTypes';

describe('Advanced Networking Features (IPsec, BGP, Option 82, Wireless Roaming)', () => {
  it('calculates RSSI dBm and evaluates wireless client roaming', () => {
    const rssiClose = calculateRssiDbm(20, 10);
    const rssiFar = calculateRssiDbm(20, 100);
    expect(rssiClose).toBeGreaterThan(rssiFar);

    // Client at -75 dBm should roam to candidate AP at -60 dBm (diff > 5 dBm)
    expect(shouldClientRoam(-75, -60)).toBe(true);
    // Client should NOT roam if candidate AP signal is weaker
    expect(shouldClientRoam(-60, -75)).toBe(false);
  });

  it('renders IPsec show crypto outputs correctly', () => {
    const mockState: Partial<SwitchState> = {
      ip: '192.168.1.1',

      cryptoIsakmpKeys: { '203.0.113.2': 'secret123' },
      cryptoMaps: {
        'MY-MAP': { 10: { ipsecIsakmp: true, setPeer: '203.0.113.2', setTransformSet: 'TS-1', matchAddress: '100' } }
      }
    };


    const isakmpRes = cmdShowCryptoIsakmpSa(mockState as SwitchState, 'show crypto isakmp sa', {} as CommandContext);
    expect(isakmpRes.output).toContain('203.0.113.2');
    expect(isakmpRes.output).toContain('QM_IDLE');

    const ipsecRes = cmdShowCryptoIpsecSa(mockState as SwitchState, 'show crypto ipsec sa', {} as CommandContext);
    expect(ipsecRes.output).toContain('Tunnel0');
    expect(ipsecRes.output).toContain('encaps');

    const mapRes = cmdShowCryptoMap(mockState as SwitchState, 'show crypto map', {} as CommandContext);
    expect(mapRes.output).toContain('MY-MAP');
    expect(mapRes.output).toContain('203.0.113.2');
  });
});
