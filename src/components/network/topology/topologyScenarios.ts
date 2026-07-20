'use client';

import {
  Server, Compass, Layers, RefreshCw, Network, Link2,
  Triangle, Globe, Shield, Lock, GitBranch, Wifi,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ---------------------------------------------------------------------------
// Scenario type union
// ---------------------------------------------------------------------------
export type ScenarioType =
  | 'soho'
  | 'routing'
  | 'roas'
  | 'ospf'
  | 'vlan-trunk'
  | 'etherchannel'
  | 'triangle'
  | 'nat'
  | 'acl'
  | 'port-security'
  | 'stp'
  | 'wireless';

// ---------------------------------------------------------------------------
// Scenario metadata
// ---------------------------------------------------------------------------
export interface ScenarioDefinition {
  id: ScenarioType;
  icon: LucideIcon;
  labelTr: string;
  labelEn: string;
  descTr: string;
  descEn: string;
  /** Whether the pcCount selector should be shown */
  showPcCount: boolean;
  /** Category for grouping in UI */
  category: 'basic' | 'routing' | 'switching' | 'security' | 'wireless';
}

export const SCENARIOS: ScenarioDefinition[] = [
  // ── Basic ──────────────────────────────────────────────────────────────
  {
    id: 'soho',
    icon: Server,
    labelTr: 'SOHO (DHCP)',
    labelEn: 'SOHO (DHCP)',
    descTr: '1 Router, 1 Switch, N PC – DHCP ile otomatik IP dağıtımı',
    descEn: '1 Router, 1 Switch, N PCs – Automatic IP via DHCP',
    showPcCount: true,
    category: 'basic',
  },
  {
    id: 'wireless',
    icon: Wifi,
    labelTr: 'Kablosuz Ağ',
    labelEn: 'Wireless Network',
    descTr: '1 Router, 1 Switch, 1 AP – WPA2 kablosuz ağ',
    descEn: '1 Router, 1 Switch, 1 AP – WPA2 wireless network',
    showPcCount: true,
    category: 'wireless',
  },

  // ── Switching ──────────────────────────────────────────────────────────
  {
    id: 'vlan-trunk',
    icon: Network,
    labelTr: 'VLAN & Trunk',
    labelEn: 'VLAN & Trunk',
    descTr: '2 Switch, trunk bağlantı, VLAN segmentasyonu',
    descEn: '2 Switches, trunk link, VLAN segmentation',
    showPcCount: true,
    category: 'switching',
  },
  {
    id: 'etherchannel',
    icon: Link2,
    labelTr: 'EtherChannel (LACP)',
    labelEn: 'EtherChannel (LACP)',
    descTr: '2 Switch arası çoklu bağlantı toplama',
    descEn: '2 Switches with link aggregation',
    showPcCount: true,
    category: 'switching',
  },
  {
    id: 'stp',
    icon: GitBranch,
    labelTr: 'STP (Spanning Tree)',
    labelEn: 'STP (Spanning Tree)',
    descTr: '3 Switch, üçgen topoloji, döngü önleme',
    descEn: '3 Switches, triangle topology, loop prevention',
    showPcCount: true,
    category: 'switching',
  },
  {
    id: 'roas',
    icon: Layers,
    labelTr: 'ROAS (Inter-VLAN)',
    labelEn: 'ROAS (Inter-VLAN)',
    descTr: '1 Router, 1 Switch – Sub-interface ile VLAN arası yönlendirme',
    descEn: '1 Router, 1 Switch – Inter-VLAN routing via sub-interfaces',
    showPcCount: false,
    category: 'switching',
  },

  // ── Routing ────────────────────────────────────────────────────────────
  {
    id: 'routing',
    icon: Compass,
    labelTr: 'Statik Yönlendirme',
    labelEn: 'Static Routing',
    descTr: '2 Router, 2 Switch – ip route ile statik yönlendirme',
    descEn: '2 Routers, 2 Switches – Static routing with ip route',
    showPcCount: true,
    category: 'routing',
  },
  {
    id: 'ospf',
    icon: RefreshCw,
    labelTr: 'OSPF (Dinamik)',
    labelEn: 'OSPF (Dynamic)',
    descTr: '2 Router, 2 Switch – OSPF dinamik yönlendirme protokolü',
    descEn: '2 Routers, 2 Switches – OSPF dynamic routing protocol',
    showPcCount: true,
    category: 'routing',
  },
  {
    id: 'triangle',
    icon: Triangle,
    labelTr: 'Üçgen Topoloji',
    labelEn: 'Triangle Topology',
    descTr: '3 Router, 3 Switch – Üçgen yapıda OSPF yönlendirme',
    descEn: '3 Routers, 3 Switches – Triangle OSPF routing',
    showPcCount: true,
    category: 'routing',
  },
  {
    id: 'nat',
    icon: Globe,
    labelTr: 'NAT / PAT',
    labelEn: 'NAT / PAT',
    descTr: '2 Router, 1 Switch – Ağ adresi çevirisi (overload)',
    descEn: '2 Routers, 1 Switch – Network address translation (overload)',
    showPcCount: true,
    category: 'routing',
  },

  // ── Security ───────────────────────────────────────────────────────────
  {
    id: 'acl',
    icon: Shield,
    labelTr: 'ACL (Erişim Listesi)',
    labelEn: 'ACL (Access List)',
    descTr: '1 Router, 1 Switch – Extended ACL ile trafik filtreleme',
    descEn: '1 Router, 1 Switch – Traffic filtering with Extended ACL',
    showPcCount: true,
    category: 'security',
  },
  {
    id: 'port-security',
    icon: Lock,
    labelTr: 'Port Güvenliği',
    labelEn: 'Port Security',
    descTr: '1 Switch – Sticky MAC, violation shutdown',
    descEn: '1 Switch – Sticky MAC, violation shutdown',
    showPcCount: true,
    category: 'security',
  },
];

// Category labels for UI grouping
export const CATEGORY_LABELS: Record<string, { tr: string; en: string }> = {
  basic: { tr: 'Temel', en: 'Basic' },
  wireless: { tr: 'Kablosuz', en: 'Wireless' },
  switching: { tr: 'Anahtarlama', en: 'Switching' },
  routing: { tr: 'Yönlendirme', en: 'Routing' },
  security: { tr: 'Güvenlik', en: 'Security' },
};
