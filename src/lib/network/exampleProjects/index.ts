import type { ExampleProject, ExampleProjectLevel } from './types';
import basicSecure from './basic-secure';
import singleVlan from './single-vlan';
import trunkVtp from './trunk-vtp';
import roas from './roas';
import legacyRouting from './legacy-routing';
import portSecurity from './port-security';
import l3Routing from './l3-routing';
import staticRouting from './static-routing';
import etherchannel from './etherchannel';
import stpRedundant from './stp-redundant';
import stpTriangle from './stp-triangle';
import campusNetwork from './campus-network';
import wifiIntermediate from './wifi-intermediate';
import wlcEnterpriseWireless from './wlc-enterprise-wireless';
import wapMultiSsid from './wap-multi-ssid';
import iotWifiLab from './iot-wifi-lab';
import greenhouseIotLab from './greenhouse-iot-lab';
import routerSsh1pc from './router-ssh-1pc';
import routerDhcp2pc from './router-dhcp-2pc';
import firewallBasic from './firewall-basic';
import nativeVlanBasic from './native-vlan-basic';
import stp3switchPvst from './stp-3switch-pvst';
import l3Switch2vlan from './l3-switch-2vlan';
import staticL3Routing from './static-l3-routing';
import ripDynamicRouting from './rip-dynamic-routing';
import aclStandardBasic from './acl-standard-basic';
import aclExtendedBasic from './acl-extended-basic';
import natStaticBasic from './nat-static-basic';
import natDynamicBasic from './nat-dynamic-basic';
import natPatBasic from './nat-pat-basic';
import hsrpRedundancyBasic from './hsrp-redundancy-basic';
import ospfMultiArea1 from './ospf-multi-area-1';
import ospfMultiArea2 from './ospf-multi-area-2';
import eigrpBasic1 from './eigrp-basic-1';
import ipv6AdvancedLab from './ipv6-advanced-lab';
import ipv6MasterLab from './ipv6-master-lab';
import allServicesLab from './all-services-lab';
import troubleIvr from './trouble-ivr';
import troubleOspfArea from './trouble-ospf-area';
import troubleVlan from './trouble-vlan';
import troubleMask from './trouble-mask';
import troubleShutdown from './trouble-shutdown';
import troubleGateway from './trouble-gateway';
import troubleDuplicate from './trouble-duplicate';
import troubleAcl from './trouble-acl';
import realWorldComprehensive from './real-world-comprehensive';
import officePrinterIot from './office-printer-iot';
import netautoPythonLab from './netauto-python-lab';
import dmzFirewallEnterprise from './dmz-firewall-enterprise';

const builders = [
  basicSecure, singleVlan, trunkVtp, roas, legacyRouting,
  portSecurity, l3Routing, staticRouting, etherchannel,
  stpRedundant, stpTriangle, campusNetwork, wifiIntermediate,
  wlcEnterpriseWireless, wapMultiSsid,
  iotWifiLab, greenhouseIotLab, routerSsh1pc, routerDhcp2pc,
  firewallBasic, dmzFirewallEnterprise, nativeVlanBasic, stp3switchPvst, l3Switch2vlan,
  staticL3Routing, ripDynamicRouting, aclStandardBasic, aclExtendedBasic,
  natStaticBasic, natDynamicBasic, natPatBasic, hsrpRedundancyBasic,
  ospfMultiArea1, ospfMultiArea2, eigrpBasic1, ipv6AdvancedLab,
  ipv6MasterLab, allServicesLab, officePrinterIot, netautoPythonLab,
  troubleIvr, troubleOspfArea, troubleVlan, troubleMask,
  troubleShutdown, troubleGateway, troubleDuplicate, troubleAcl, realWorldComprehensive
];

export const exampleProjects = (language: 'tr' | 'en'): ExampleProject[] => {
  const isTr = language === 'tr';
  return builders.map(build => {
    const project = build(isTr);
    const overviewNote = {
      id: `${project.id}-overview`,
      text: `${project.title}\n\n${project.description}`,
      x: 40,
      y: 40,
      width: 420,
      height: 180,
      color: 'var(--color-warning-500)',
      font: 'verdana',
      fontSize: 12 as const,
      opacity: 0.75 as const,
    };

    return {
      ...project,
      detail: project.detail || project.description,
      data: {
        ...project.data,
        topology: {
          ...project.data.topology,
          notes: project.data.topology.notes.length > 0
            ? project.data.topology.notes
            : [overviewNote],
        },
      },
    };
  });
};

/** Structural and semantic checks shared by the catalog and import flows. */
export function validateExampleProject(project: ExampleProject): string[] {
  const errors: string[] = [];
  const devices = project.data.topology.devices;
  const deviceIds = new Set(devices.map((device) => device.id));
  const canonicalMac = (value?: string) => value?.replace(/[^0-9a-f]/gi, '').toLowerCase();

  for (const device of devices) {
    if (!device.id) errors.push('device without id');
  }
  for (const state of project.data.devices) {
    if (!deviceIds.has(state.id)) errors.push(`orphan state ${state.id}`);
    const device = devices.find((item) => item.id === state.id);
    if (device?.macAddress && state.state.macAddress && canonicalMac(device.macAddress) !== canonicalMac(state.state.macAddress)) {
      errors.push(`MAC mismatch for ${state.id}`);
    }
    const statePorts = Object.values(state.state.ports ?? {});
    for (const port of statePorts) {
      if (!port.ipAddress || !port.subnetMask) continue;
      const ip = port.ipAddress.split('.').map(Number);
      const mask = port.subnetMask.split('.').map(Number);
      if (ip.length !== 4 || mask.length !== 4 || ip.some((part) => !Number.isInteger(part) || part < 0 || part > 255) || mask.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
        errors.push(`invalid interface address on ${state.id}`);
      }
    }
    const dhcpPools = state.state.services?.dhcp?.pools ?? [];
    for (const pool of dhcpPools) {
      if (!pool.startIp || !pool.subnetMask || !pool.defaultGateway) errors.push(`incomplete DHCP pool on ${state.id}`);
      if (pool.defaultGateway === '0.0.0.0') errors.push(`invalid DHCP gateway on ${state.id}`);
    }
    if (device?.ipConfigMode === 'static' && device.ip === '0.0.0.0') errors.push(`static device without address ${device.id}`);
  }
  for (const connection of project.data.topology.connections) {
    if (!deviceIds.has(connection.sourceDeviceId) || !deviceIds.has(connection.targetDeviceId)) {
      errors.push(`connection ${connection.id} references a missing device`);
      continue;
    }
    const source = devices.find((device) => device.id === connection.sourceDeviceId);
    const target = devices.find((device) => device.id === connection.targetDeviceId);
    if (!source?.ports.some((port) => port.id === connection.sourcePort)) errors.push(`invalid source port ${connection.sourcePort}`);
    if (!target?.ports.some((port) => port.id === connection.targetPort)) errors.push(`invalid target port ${connection.targetPort}`);
  }
  return errors;
}

export type { ExampleProject, ExampleProjectLevel };
