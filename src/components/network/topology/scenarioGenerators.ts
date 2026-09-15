import type { ScenarioType } from './topologyScenarios';
import type { SwitchState } from '@/lib/network/types';
import {
  type Ctx,
  type GeneratedTopology,
  generateSoho,
  generateStar,
  generateRing,
  generateFullMesh,
  generatePartialMesh,
  generateGrid2D,
  generateSpineLeaf,
  generateFatTree,
  generateHybridEnterprise,
  generateEnterpriseWlc,
  generateIotSmartHome,
  generateOfficePrinterIot,
  generateEnterpriseServices,
  generateNetautoPython,
  generateMultiAreaOspf,
  generateBgpDualHomed,
  generateDmzFirewall,
  generateStaticRouting,
  generateRoas,
  generateOspf,
  generateVlanTrunk,
  generateEtherChannel,
  generateTriangle,
  generateNat,
  generateAcl,
  generatePortSecurity,
  generateStp,
  generateWireless,
} from './generators';

export type { GeneratedTopology };
export * from './generators';

// ===========================================================================
// Main dispatcher
// ===========================================================================
export function generateTopology(scenario: ScenarioType, pcCount: number): GeneratedTopology {
  let ctx: Ctx;
  switch (scenario) {
    case 'soho': ctx = generateSoho(pcCount); break;
    case 'star': ctx = generateStar(pcCount); break;
    case 'ring': ctx = generateRing(pcCount); break;
    case 'full-mesh': ctx = generateFullMesh(pcCount); break;
    case 'partial-mesh': ctx = generatePartialMesh(pcCount); break;
    case 'grid-2d': ctx = generateGrid2D(); break;
    case 'spine-leaf': ctx = generateSpineLeaf(pcCount); break;
    case 'fat-tree': ctx = generateFatTree(pcCount); break;
    case 'hybrid-enterprise': ctx = generateHybridEnterprise(); break;
    case 'enterprise-wlc': ctx = generateEnterpriseWlc(); break;
    case 'iot-smart-home': ctx = generateIotSmartHome(); break;
    case 'office-printer-iot': ctx = generateOfficePrinterIot(pcCount); break;
    case 'enterprise-services': ctx = generateEnterpriseServices(pcCount); break;
    case 'netauto-python': ctx = generateNetautoPython(pcCount); break;
    case 'multi-area-ospf': ctx = generateMultiAreaOspf(pcCount); break;
    case 'bgp-dual-homed': ctx = generateBgpDualHomed(); break;
    case 'dmz-firewall': ctx = generateDmzFirewall(pcCount); break;
    case 'routing': ctx = generateStaticRouting(pcCount); break;
    case 'roas': ctx = generateRoas(); break;
    case 'ospf': ctx = generateOspf(pcCount); break;
    case 'vlan-trunk': ctx = generateVlanTrunk(pcCount); break;
    case 'etherchannel': ctx = generateEtherChannel(pcCount); break;
    case 'triangle': ctx = generateTriangle(pcCount); break;
    case 'nat': ctx = generateNat(pcCount); break;
    case 'acl': ctx = generateAcl(pcCount); break;
    case 'port-security': ctx = generatePortSecurity(pcCount); break;
    case 'stp': ctx = generateStp(pcCount); break;
    case 'wireless': ctx = generateWireless(pcCount); break;
    default: ctx = generateSoho(pcCount);
  }
  return {
    devices: ctx.devices,
    connections: ctx.connections,
    deviceStates: ctx.states as Map<string, SwitchState>,
  };
}
