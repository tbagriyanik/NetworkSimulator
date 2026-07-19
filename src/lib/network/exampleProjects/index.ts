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

const builders = [
  basicSecure, singleVlan, trunkVtp, roas, legacyRouting,
  portSecurity, l3Routing, staticRouting, etherchannel,
  stpRedundant, stpTriangle, campusNetwork, wifiIntermediate,
  iotWifiLab, greenhouseIotLab, routerSsh1pc, routerDhcp2pc,
  firewallBasic, nativeVlanBasic, stp3switchPvst, l3Switch2vlan,
  staticL3Routing, ripDynamicRouting, aclStandardBasic, aclExtendedBasic,
  natStaticBasic, natDynamicBasic, natPatBasic, hsrpRedundancyBasic,
  ospfMultiArea1, ospfMultiArea2, eigrpBasic1, ipv6AdvancedLab,
  ipv6MasterLab, allServicesLab,
  troubleIvr, troubleOspfArea, troubleVlan, troubleMask,
  troubleShutdown, troubleGateway, troubleDuplicate, troubleAcl
];

export const exampleProjects = (language: 'tr' | 'en'): ExampleProject[] => {
  const isTr = language === 'tr';
  return builders.map(build => build(isTr));
};

export type { ExampleProject, ExampleProjectLevel };
