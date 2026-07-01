import { ExampleProject } from './exampleProjects';

export interface NoteItem {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  font: string;
  fontSize: number;
  opacity: number;
}

export interface DevicePort {
  id: string;
  label: string;
  status: string;
  ipAddress?: string;
  mode?: 'access' | 'trunk' | 'routed';
  vlan?: number;
  description?: string;
  wifi?: { ssid: string; mode: string };
  portSecurity?: { enabled: boolean };
  isSubinterface?: boolean;
}

export interface DeviceState {
  hostname?: string;
  ports?: Record<string, DevicePort>;
  dhcpPools?: Record<string, { network: string }>;
  services?: {
    dns?: { enabled: boolean; records?: Array<{ domain: string; address: string }> };
  };
  security?: {
    enableSecret?: string;
    consoleLine?: { password: string };
    vtyLines?: { password: string };
    servicePasswordEncryption?: boolean;
    users?: Array<{ username: string }>;
  };
  staticRoutes?: Array<{ destination: string; prefixLength: number }>;
  ipRouting?: boolean;
  routingProtocol?: 'rip' | 'ospf';
  vtp?: { mode: string };
}

export interface ProjectDevice {
  id: string;
  type: string;
  name?: string;
  ip?: string;
  subnet?: string;
  gateway?: string;
  macAddress?: string;
  status?: string;
  ports?: Array<{ id: string; label: string; status: string }>;
  state?: DeviceState;
}

export interface TopologyData {
  devices: ProjectDevice[];
  connections: Array<{
    sourceDeviceId: string;
    sourcePort: string;
    targetDeviceId: string;
    targetPort: string;
    cableType: string;
    active?: boolean;
  }>;
  notes?: NoteItem[];
}

export interface ProjectData {
  version?: string;
  timestamp?: string;
  devices?: ProjectDevice[];
  deviceOutputs?: unknown[];
  pcOutputs?: unknown[];
  pcHistories?: unknown[];
  topology?: TopologyData;
  cableInfo?: {
    connected: boolean;
    cableType: string;
    sourceDevice: string;
    targetDevice: string;
  };
  activeDeviceId?: string;
  activeDeviceType?: string;
  activeTab?: string;
  zoom?: number;
  pan?: { x: number; y: number };
  tasks?: ExamTask[];
  steps?: ExamTask[];
}

export interface ExamTask {
  id: string;
  title: { tr: string; en: string };
  description: { tr: string; en: string };
  weight: number;
  checkType: 'deviceAccess' | 'command' | 'config' | 'connection' | 'manual';
  checkParams?: {
    deviceType?: 'switch' | 'router' | 'pc' | 'iot' | 'firewall';
    commandPattern?: string;
    configKey?: string;
    configValue?: unknown;
    cableType?: 'straight' | 'crossover' | 'console';
    sourceDevice?: string;
    sourcePort?: string;
    targetDevice?: string;
    targetDeviceId?: string;
    targetPort?: string;
    connections?: Array<{ sourceDevice: string; sourcePort: string; targetDevice: string; targetPort: string }>;
    subnetMask?: string;
    pc1Ip?: string;
    pc2Ip?: string;
  };
  completed: boolean;
  completedAt?: Date;
}

export interface ExamProject extends ExampleProject {
  isExam: true;
  tasks: ExamTask[];
  durationMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  startedAt?: Date;
  finishedAt?: Date;
  isCustom?: boolean; // True if created by a teacher
  integrityHash?: string; // Tamper-proof integrity hash
}

/**
 * Obfuscation utilities for Exam files
 * NOTE: This is NOT a security feature. It only prevents casual viewing of
 * task requirements. The client-side fixed key means a determined user
 * can easily read or forge data. Exam integrity hash (XOR with same key)
 * detects accidental corruption but does NOT protect against intentional
 * tampering — see generateExamIntegrityHash JSDoc for details.
 */
// Key'i karakter kodları şeklinde tutarak daha zor okunur hale getiriyoruz
const EXAM_KEY_BYTES = Uint8Array.from([
  83, 69, 78, 84, 73, 78, 69, 76, 95, 69, 88, 65, 77, 95, 83, 69, 67, 85, 82, 69, 95, 75, 69, 89, 95, 50, 48, 50, 54, 95, 83, 85, 80, 69, 82, 83, 69, 67, 85, 82, 69, 68
]);

// UTF-8 string'i Uint8Array'a dönüştüren yardımcı fonksiyon
function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// Uint8Array'i hex string'e dönüştüren yardımcı fonksiyon
function uint8ArrayToHex(buffer: Uint8Array): string {
  return Array.from(buffer, byte => byte.toString(16).padStart(2, '0')).join('');
}

// XOR şifrelemesi için yardımcı fonksiyon
function xorBytes(data: Uint8Array, key: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i % key.length];
  }
  return result;
}

export function encryptExamData(data: unknown): string {
  const json = JSON.stringify(data);
  const bytes = stringToUint8Array(json);
  const xored = xorBytes(bytes, EXAM_KEY_BYTES);
  // Base64 URL safe encode (standart base64 de iş görür)
  return btoa(String.fromCharCode(...xored));
}

export function decryptExamData(encrypted: string): unknown {
  try {
    const decoded = atob(encrypted);
    const bytes = Uint8Array.from(decoded.split('').map(c => c.charCodeAt(0)));
    const xored = xorBytes(bytes, EXAM_KEY_BYTES);
    const json = new TextDecoder().decode(xored);
    return JSON.parse(json);
  } catch (_e) {
    // console.error('Failed to decrypt exam data', _e);
    return null;
  }
}

/**
 * Generate integrity hash for exam project
 * Detects accidental changes to critical fields.
 * ⚠️ DISCLAIMER: This uses a client-side fixed XOR key and is NOT
 * cryptographically secure. It catches accidental data corruption or
 * unintended modifications, but does NOT protect against intentional
 * tampering by a determined user with browser DevTools access.
 */
export function generateExamIntegrityHash(project: ExamProject): string {
  const criticalData = {
    id: project.id,
    durationMinutes: project.durationMinutes,
    tasks: project.tasks.map(t => ({
      id: t.id,
      weight: t.weight,
      completed: t.completed,
      completedAt: t.completedAt ? t.completedAt.getTime() : null
    })),
    startedAt: project.startedAt ? project.startedAt.getTime() : null,
    finishedAt: project.finishedAt ? project.finishedAt.getTime() : null
  };
  
  const json = JSON.stringify(criticalData);
  const bytes = stringToUint8Array(json);
  const xored = xorBytes(bytes, EXAM_KEY_BYTES);
  return uint8ArrayToHex(xored);
}

/**
 * Verify if exam project integrity is intact
 * Returns true if no accidental corruption detected.
 * ⚠️ See generateExamIntegrityHash disclaimer — this is NOT tamper-proof.
 */
export function verifyExamIntegrity(project: ExamProject): boolean {
  if (!project.integrityHash) return false;
  
  // Create a copy without the integrityHash to generate the hash
  const projectCopy = { ...project, integrityHash: undefined };
  const generatedHash = generateExamIntegrityHash(projectCopy as ExamProject);
  
  return generatedHash === project.integrityHash;
}

// Exam tasks - Basic Connectivity Exam
export const basicConnectivityExamTasks: ExamTask[] = [
  {
    id: 'exam-connect-pc-switch',
    title: { tr: 'PC ve Switch Bağlantısı', en: 'PC and Switch Connection' },
    description: { tr: 'PC-1 cihazını Switch-1\'e doğru kablo ile bağlayın.', en: 'Connect PC-1 to Switch-1 using the correct cable.' },
    weight: 20,
    checkType: 'connection',
    checkParams: {
      cableType: 'straight',
      sourceDevice: 'pc-1',
      sourcePort: 'eth0',
      targetDevice: 'switch-1',
      targetPort: 'fa0/1'
    },
    completed: false
  },
  {
    id: 'exam-config-hostname',
    title: { tr: 'Hostname Yapılandırması', en: 'Hostname Configuration' },
    description: { tr: 'Switch ismini "Sinav-Switch" olarak değiştirin.', en: 'Change switch name to "Sinav-Switch".' },
    weight: 20,
    checkType: 'command',
    checkParams: { commandPattern: 'hostname Sinav-Switch' },
    completed: false
  },
  {
    id: 'exam-config-vlan10',
    title: { tr: 'VLAN 10 Oluşturma', en: 'Create VLAN 10' },
    description: { tr: 'VLAN 10 oluşturun ve ismini "MUHASEBE" yapın.', en: 'Create VLAN 10 and name it "MUHASEBE".' },
    weight: 30,
    checkType: 'command',
    checkParams: { commandPattern: 'vlan 10' }, // Simplified check for creation
    completed: false
  },
  {
    id: 'exam-assign-port',
    title: { tr: 'Port Atama', en: 'Assign Port' },
    description: { tr: 'Fa0/1 portunu VLAN 10\'a atayın.', en: 'Assign Fa0/1 port to VLAN 10.' },
    weight: 30,
    checkType: 'config',
    checkParams: { configKey: 'ports.fa0/1.vlan', configValue: 10 },
    completed: false
  }
];

// Exam tasks - Routing Basics
export const routingBasicsExamTasks: ExamTask[] = [
  {
    id: 'exam-route-connect-pc1',
    title: { tr: 'PC-1 Bağlantısı', en: 'PC-1 Connection' },
    description: { tr: 'PC-1\'i R1 Gi0/0 portuna doğru kablo ile bağlayın.', en: 'Connect PC-1 to R1 Gi0/0 with the correct cable.' },
    weight: 15,
    checkType: 'connection',
    checkParams: {
      cableType: 'straight',
      sourceDevice: 'pc-1',
      sourcePort: 'eth0',
      targetDevice: 'r-1',
      targetPort: 'gi0/0'
    },
    completed: false
  },
  {
    id: 'exam-route-connect-pc2',
    title: { tr: 'PC-2 Bağlantısı', en: 'PC-2 Connection' },
    description: { tr: 'PC-2\'yi R1 Gi0/1 portuna doğru kablo ile bağlayın.', en: 'Connect PC-2 to R1 Gi0/1 with the correct cable.' },
    weight: 15,
    checkType: 'connection',
    checkParams: {
      cableType: 'straight',
      sourceDevice: 'pc-2',
      sourcePort: 'eth0',
      targetDevice: 'r-1',
      targetPort: 'gi0/1'
    },
    completed: false
  },
  {
    id: 'exam-route-gi00',
    title: { tr: 'R1 Gi0/0 Arayüz Yapılandırması', en: 'R1 Gi0/0 Interface Configuration' },
    description: { tr: 'R1 Gi0/0 portuna 192.168.1.1/24 IP atayın ve no shutdown ile aktif edin.', en: 'Assign 192.168.1.1/24 to R1 Gi0/0 and enable it with no shutdown.' },
    weight: 20,
    checkType: 'command',
    checkParams: { commandPattern: 'ip address 192.168.1.1 255.255.255.0' },
    completed: false
  },
  {
    id: 'exam-route-gi01',
    title: { tr: 'R1 Gi0/1 Arayüz Yapılandırması', en: 'R1 Gi0/1 Interface Configuration' },
    description: { tr: 'R1 Gi0/1 portuna 192.168.2.1/24 IP atayın ve no shutdown ile aktif edin.', en: 'Assign 192.168.2.1/24 to R1 Gi0/1 and enable it with no shutdown.' },
    weight: 20,
    checkType: 'command',
    checkParams: { commandPattern: 'ip address 192.168.2.1 255.255.255.0' },
    completed: false
  },
  {
    id: 'exam-route-pc1',
    title: { tr: 'PC-1 IP Yapılandırması', en: 'PC-1 IP Configuration' },
    description: { tr: 'PC-1\'e 192.168.1.10/24 IP ve 192.168.1.1 gateway atayın.', en: 'Assign IP 192.168.1.10/24 and gateway 192.168.1.1 to PC-1.' },
    weight: 10,
    checkType: 'config',
    checkParams: { configKey: 'pc.pc-1.ip', configValue: '192.168.1.10', subnetMask: '255.255.255.0' },
    completed: false
  },
  {
    id: 'exam-route-pc2',
    title: { tr: 'PC-2 IP Yapılandırması', en: 'PC-2 IP Configuration' },
    description: { tr: 'PC-2\'ye 192.168.2.10/24 IP ve 192.168.2.1 gateway atayın.', en: 'Assign IP 192.168.2.10/24 and gateway 192.168.2.1 to PC-2.' },
    weight: 10,
    checkType: 'config',
    checkParams: { configKey: 'pc.pc-2.ip', configValue: '192.168.2.10', subnetMask: '255.255.255.0' },
    completed: false
  },
  {
    id: 'exam-route-static',
    title: { tr: 'Statik Rota', en: 'Static Route' },
    description: { tr: 'R1 üzerinde 10.0.0.0/24 ağına giden statik rota tanımlayın.', en: 'Define a static route to 10.0.0.0/24 on R1.' },
    weight: 10,
    checkType: 'command',
    checkParams: { commandPattern: 'ip route 10.0.0.0 255.255.255.0' },
    completed: false
  }
];

// Exam tasks - L3 Switch & DHCP
export const l3SwitchDhcpExamTasks: ExamTask[] = [
  {
    id: 'exam-l3-enable-routing',
    title: { tr: 'IP Routing Etkinleştirme', en: 'Enable IP Routing' },
    description: { tr: 'L3 Switch üzerinde "ip routing" komutunu çalıştırın.', en: 'Run "ip routing" command on L3 Switch.' },
    weight: 20,
    checkType: 'command',
    checkParams: { commandPattern: 'ip routing' },
    completed: false
  },
  {
    id: 'exam-l3-vlan20-create',
    title: { tr: 'VLAN 20 Oluşturma', en: 'Create VLAN 20' },
    description: { tr: 'VLAN 20 oluşturun.', en: 'Create VLAN 20.' },
    weight: 20,
    checkType: 'command',
    checkParams: { commandPattern: 'vlan 20' },
    completed: false
  },
  {
    id: 'exam-l3-svi20-ip',
    title: { tr: 'SVI VLAN 20 IP Atama', en: 'Assign SVI VLAN 20 IP' },
    description: { tr: 'Interface VLAN 20\'ye 172.16.20.1/24 IP\'sini atayın.', en: 'Assign 172.16.20.1/24 IP to Interface VLAN 20.' },
    weight: 20,
    checkType: 'config',
    checkParams: { configKey: 'interfaces.vlan20.ip', configValue: '172.16.20.1' },
    completed: false
  },
  {
    id: 'exam-l3-dhcp-pool-create',
    title: { tr: 'DHCP Havuzu Oluşturma', en: 'Create DHCP Pool' },
    description: { tr: 'L3 Switch üzerinde "MY-POOL" isminde bir DHCP havuzu oluşturun.', en: 'Create a DHCP pool named "MY-POOL" on L3 Switch.' },
    weight: 5,
    checkType: 'command',
    checkParams: { commandPattern: 'ip dhcp pool MY-POOL' },
    completed: false
  },
  {
    id: 'exam-l3-dhcp-excluded',
    title: { tr: 'DHCP Hariç Tutulan IP', en: 'DHCP Excluded IP' },
    description: { tr: '172.16.20.1 adresini DHCP dağıtımından hariç tutun.', en: 'Exclude 172.16.20.1 from DHCP allocation.' },
    weight: 5,
    checkType: 'command',
    checkParams: { commandPattern: 'ip dhcp excluded-address 172.16.20.1' },
    completed: false
  },
  {
    id: 'exam-l3-dhcp-network',
    title: { tr: 'DHCP Network Tanımı', en: 'DHCP Network Definition' },
    description: { tr: 'DHCP havuzunda ağı 172.16.20.0/24 olarak tanımlayın.', en: 'Define DHCP pool network as 172.16.20.0/24.' },
    weight: 10,
    checkType: 'command',
    checkParams: { commandPattern: 'network 172.16.20.0 255.255.255.0' },
    completed: false
  },
  {
    id: 'exam-l3-dhcp-default-router',
    title: { tr: 'DHCP Varsayılan Ağ Geçidi', en: 'DHCP Default Gateway' },
    description: { tr: 'DHCP havuzunda varsayılan ağ geçidi olarak 172.16.20.1 tanımlayın.', en: 'Set DHCP default gateway to 172.16.20.1 in the pool.' },
    weight: 10,
    checkType: 'command',
    checkParams: { commandPattern: 'default-router 172.16.20.1' },
    completed: false
  },
  {
    id: 'exam-l3-dhcp-dns',
    title: { tr: 'DHCP DNS Tanımı', en: 'DHCP DNS Definition' },
    description: { tr: 'DHCP havuzunda DNS sunucusu olarak 8.8.8.8 tanımlayın.', en: 'Set DHCP DNS server to 8.8.8.8 in the pool.' },
    weight: 5,
    checkType: 'command',
    checkParams: { commandPattern: 'dns-server 8.8.8.8' },
    completed: false
  },
  {
    id: 'exam-l3-dhcp-lease',
    title: { tr: 'DHCP Lease Süresi', en: 'DHCP Lease Duration' },
    description: { tr: 'DHCP havuzunda kira süresini 7 gün olarak ayarlayın.', en: 'Set DHCP lease time to 7 days in the pool.' },
    weight: 5,
    checkType: 'command',
    checkParams: { commandPattern: 'lease 7' },
    completed: false
  }
];

// Exam tasks - VLAN Trunking & VTP
export const vlanTrunkingExamTasks: ExamTask[] = [
  {
    id: 'exam-vtp-mode-server',
    title: { tr: 'VTP Mode Server', en: 'VTP Mode Server' },
    description: { tr: 'SW1 cihazını VTP server moduna alın.', en: 'Set SW1 to VTP server mode.' },
    weight: 20,
    checkType: 'command',
    checkParams: { commandPattern: 'vtp mode server' },
    completed: false
  },
  {
    id: 'exam-vtp-domain',
    title: { tr: 'VTP Domain', en: 'VTP Domain' },
    description: { tr: 'VTP domain adını "SINAV" olarak belirleyin.', en: 'Set VTP domain name to "SINAV".' },
    weight: 20,
    checkType: 'command',
    checkParams: { commandPattern: 'vtp domain SINAV' },
    completed: false
  },
  {
    id: 'exam-trunk-config',
    title: { tr: 'Trunk Yapılandırması', en: 'Trunk Configuration' },
    description: { tr: 'Gi0/1 portunu trunk moduna alın.', en: 'Configure Gi0/1 as a trunk port.' },
    weight: 30,
    checkType: 'command',
    checkParams: { commandPattern: 'switchport mode trunk' },
    completed: false
  },
  {
    id: 'exam-vlan-creation',
    title: { tr: 'VLAN Oluşturma', en: 'VLAN Creation' },
    description: { tr: 'VLAN 50 oluşturun ve ismini "IDARI" yapın.', en: 'Create VLAN 50 and name it "IDARI".' },
    weight: 30,
    checkType: 'command',
    checkParams: { commandPattern: 'vlan 50' },
    completed: false
  }
];

// Exam tasks - Standard ACL
export const basicAclExamTasks: ExamTask[] = [
  {
    id: 'exam-acl-create',
    title: { tr: 'Standard ACL Oluşturma', en: 'Create Standard ACL' },
    description: { tr: '10 numaralı standard ACL oluşturun ve 192.168.1.10 hostunu engelleyin.', en: 'Create standard ACL 10 and deny host 192.168.1.10.' },
    weight: 40,
    checkType: 'command',
    checkParams: { commandPattern: 'access-list 10 deny host 192.168.1.10' },
    completed: false
  },
  {
    id: 'exam-acl-permit-any',
    title: { tr: 'ACL Permit Any', en: 'ACL Permit Any' },
    description: { tr: 'ACL 10 listesine diğer tüm trafiğe izin veren kuralı ekleyin.', en: 'Add a rule to ACL 10 to permit all other traffic.' },
    weight: 20,
    checkType: 'command',
    checkParams: { commandPattern: 'access-list 10 permit any' },
    completed: false
  },
  {
    id: 'exam-acl-apply',
    title: { tr: 'ACL Uygulama', en: 'Apply ACL' },
    description: { tr: 'ACL 10\'u Gi0/0 arayüzüne giriş (in) yönünde uygulayın.', en: 'Apply ACL 10 to Gi0/0 interface in the "in" direction.' },
    weight: 40,
    checkType: 'command',
    checkParams: { commandPattern: 'ip access-group 10 in' },
    completed: false
  }
];

// Comprehensive Final Exam Tasks
export const comprehensiveFinalExamTasks: ExamTask[] = [
  {
    id: 'master-conn-pc-as',
    title: { tr: 'PC-AS1 Bağlantısı', en: 'PC-AS1 Connection' },
    description: { tr: 'PC-1 cihazını AS-1 Switch\'inin Fa0/1 portuna bağlayın.', en: 'Connect PC-1 to Fa0/1 port of AS-1 Switch.' },
    weight: 5,
    checkType: 'connection',
      checkParams: { sourceDevice: 'pc-1', sourcePort: 'eth0', targetDevice: 'as-1', targetPort: 'fa0/1', cableType: 'straight' },
    completed: false
  },
  {
    id: 'master-conn-as-ds',
    title: { tr: 'Trunk Bağlantısı', en: 'Trunk Connection' },
    description: { tr: 'AS-1 (Gi0/1) ile DS-1 (Gi1/0/1) arasını crossover kablo ile bağlayın.', en: 'Connect AS-1 (Gi0/1) and DS-1 (Gi1/0/1) with a crossover cable.' },
    weight: 5,
    checkType: 'connection',
    checkParams: { sourceDevice: 'as-1', sourcePort: 'gi0/1', targetDevice: 'ds-1', targetPort: 'gi1/0/1', cableType: 'crossover' },
    completed: false
  },
  {
    id: 'master-conn-ds-r1',
    title: { tr: 'Dağıtım-Yönlendirici Bağlantısı', en: 'Distribution-Router Connection' },
    description: { tr: 'DS-1 (Gi1/0/2) ile R1 (Gi0/0) arasını crossover kablo ile bağlayın.', en: 'Connect DS-1 (Gi1/0/2) and R1 (Gi0/0) with a crossover cable.' },
    weight: 5,
    checkType: 'connection',
    checkParams: { sourceDevice: 'ds-1', sourcePort: 'gi1/0/2', targetDevice: 'r-1', targetPort: 'gi0/0', cableType: 'crossover' },
    completed: false
  },
  {
    id: 'master-ds1-hostname',
    title: { tr: 'L3 Switch Hostname', en: 'L3 Switch Hostname' },
    description: { tr: 'L3 Switch ismini "DS-1" olarak ayarlayın.', en: 'Set L3 Switch hostname to "DS-1".' },
    weight: 5,
    checkType: 'command',
    checkParams: { deviceType: 'switch', commandPattern: 'hostname DS-1' },
    completed: false
  },
  {
    id: 'master-r1-hostname',
    title: { tr: 'Router Hostname', en: 'Router Hostname' },
    description: { tr: 'Router ismini "R-1" olarak ayarlayın.', en: 'Set Router hostname to "R-1".' },
    weight: 5,
    checkType: 'command',
    checkParams: { deviceType: 'router', commandPattern: 'hostname R-1' },
    completed: false
  },
  {
    id: 'master-vlan10-as1',
    title: { tr: 'AS-1 VLAN 10', en: 'AS-1 VLAN 10' },
    description: { tr: 'AS-1 üzerinde VLAN 10 oluşturun.', en: 'Create VLAN 10 on AS-1.' },
    weight: 5,
    checkType: 'command',
    checkParams: { deviceType: 'switch', targetDeviceId: 'as-1', commandPattern: 'vlan 10' },
    completed: false
  },
  {
    id: 'master-vlan10-assign',
    title: { tr: 'Port VLAN Ataması', en: 'Port VLAN Assignment' },
    description: { tr: 'AS-1 Fa0/1 portunu VLAN 10\'a atayın.', en: 'Assign AS-1 Fa0/1 port to VLAN 10.' },
    weight: 5,
    checkType: 'config',
    checkParams: { targetDeviceId: 'as-1', configKey: 'ports.fa0/1.vlan', configValue: 10 },
    completed: false
  },
  {
    id: 'master-trunk-as1',
    title: { tr: 'AS-1 Trunk', en: 'AS-1 Trunk' },
    description: { tr: 'AS-1 Gi0/1 portunu trunk moduna alın.', en: 'Set AS-1 Gi0/1 port to trunk mode.' },
    weight: 5,
    checkType: 'command',
    checkParams: { deviceType: 'switch', targetDeviceId: 'as-1', commandPattern: 'switchport mode trunk' },
    completed: false
  },
  {
    id: 'master-trunk-ds1',
    title: { tr: 'Trunk Yapılandırması (DS-1)', en: 'Trunk Configuration (DS-1)' },
    description: { tr: 'DS-1 Gi1/0/1 portunu trunk moduna alın.', en: 'Set DS-1 Gi1/0/1 port to trunk mode.' },
    weight: 5,
    checkType: 'command',
    checkParams: { deviceType: 'switch', targetDeviceId: 'ds-1', commandPattern: 'switchport mode trunk' },
    completed: false
  },
  {
    id: 'master-l3-routing',
    title: { tr: 'L3 Yönlendirme', en: 'L3 Routing' },
    description: { tr: 'DS-1 üzerinde IP yönlendirmeyi etkinleştirin.', en: 'Enable IP routing on DS-1.' },
    weight: 5,
    checkType: 'command',
    checkParams: { deviceType: 'switch', targetDeviceId: 'ds-1', commandPattern: 'ip routing' },
    completed: false
  },
  {
    id: 'master-svi-vlan10',
    title: { tr: 'SVI Yapılandırması', en: 'SVI Configuration' },
    description: { tr: 'DS-1 interface VLAN 10\'a 192.168.10.1/24 IP atayın.', en: 'Assign 192.168.10.1/24 to interface VLAN 10 on DS-1.' },
    weight: 5,
    checkType: 'config',
    checkParams: { targetDeviceId: 'ds-1', configKey: 'ports.vlan10.ipAddress', configValue: '192.168.10.1' },
    completed: false
  },
  {
    id: 'master-routed-port',
    title: { tr: 'Routed Port', en: 'Routed Port' },
    description: { tr: 'DS-1 Gi1/0/2 portunu "no switchport" ile routed port yapın ve 10.0.0.1 IP atayın.', en: 'Make DS-1 Gi1/0/2 a routed port using "no switchport" and assign 10.0.0.1 IP.' },
    weight: 5,
    checkType: 'command',
    checkParams: { deviceType: 'switch', targetDeviceId: 'ds-1', commandPattern: 'no switchport' },
    completed: false
  },
  {
    id: 'master-r1-ip',
    title: { tr: 'Router IP Ataması', en: 'Router IP Assignment' },
    description: { tr: 'R-1 Gi0/0 arayüzüne 10.0.0.2/30 IP adresini atayın.', en: 'Assign 10.0.0.2/30 to R-1 Gi0/0 interface.' },
    weight: 5,
    checkType: 'command',
    checkParams: { deviceType: 'router', targetDeviceId: 'r-1', commandPattern: 'ip address 10.0.0.2 255.255.255.252' },
    completed: false
  },
  {
    id: 'master-r1-dhcp',
    title: { tr: 'Router DHCP Havuzu', en: 'Router DHCP Pool' },
    description: { tr: 'R-1 üzerinde "IOT-POOL" isminde 192.168.100.0/24 ağını dağıtan bir havuz oluşturun.', en: 'Create a DHCP pool named "IOT-POOL" on R-1 distributing 192.168.100.0/24.' },
    weight: 5,
    checkType: 'command',
    checkParams: { deviceType: 'router', targetDeviceId: 'r-1', commandPattern: 'ip dhcp pool IOT-POOL' },
    completed: false
  },
  {
    id: 'master-wifi-ssid',
    title: { tr: 'WiFi SSID Ayarı', en: 'WiFi SSID Config' },
    description: { tr: 'R-1 üzerinde MasterWiFi isminde kablosuz ağ oluşturun.', en: 'Create a wireless network named MasterWiFi on R-1.' },
    weight: 5,
    checkType: 'config',
    checkParams: { targetDeviceId: 'r-1', configKey: 'ports.wlan0.wifi.ssid', configValue: 'MasterWiFi' },
    completed: false
  },
  {
    id: 'master-iot-wifi',
    title: { tr: 'IoT WiFi Bağlantısı', en: 'IoT WiFi Connection' },
    description: { tr: 'IoT-1 cihazını MasterWiFi ağına bağlayın.', en: 'Connect IoT-1 device to MasterWiFi network.' },
    weight: 5,
    checkType: 'config',
    checkParams: { configKey: 'iot.iot-1.ssid', configValue: 'MasterWiFi' },
    completed: false
  },
  {
    id: 'master-static-route',
    title: { tr: 'Varsayılan Rota', en: 'Default Route' },
    description: { tr: 'DS-1 üzerinde tüm trafik için R-1\'i (10.0.0.2) gateway olarak ayarlayın.', en: 'Configure R-1 (10.0.0.2) as the gateway for all traffic on DS-1.' },
    weight: 5,
    checkType: 'command',
    checkParams: { deviceType: 'switch', targetDeviceId: 'ds-1', commandPattern: 'ip route 0.0.0.0 0.0.0.0 10.0.0.2' },
    completed: false
  },
  {
    id: 'master-acl-restrict',
    title: { tr: 'ACL Kısıtlaması', en: 'ACL Restriction' },
    description: { tr: 'R-1 üzerinde 192.168.10.10 hostunun dışarı çıkmasını engelleyen ACL yazın.', en: 'Create an ACL on R-1 to block host 192.168.10.10 from going outside.' },
    weight: 5,
    checkType: 'command',
    checkParams: { deviceType: 'router', targetDeviceId: 'r-1', commandPattern: 'access-list 1 deny 192.168.10.10' },
    completed: false
  },
  {
    id: 'master-fw-ip',
    title: { tr: 'Firewall IP Yapılandırması', en: 'Firewall IP Config' },
    description: { tr: 'Firewall-1 cihazına 10.0.0.10 IP adresini atayın.', en: 'Assign IP 10.0.0.10 to Firewall-1.' },
    weight: 5,
    checkType: 'config',
    checkParams: { configKey: 'firewall.fw-1.ip', configValue: '10.0.0.10' },
    completed: false
  },
  {
    id: 'master-dns-enable',
    title: { tr: 'DNS Servisi', en: 'DNS Service' },
    description: { tr: 'Server-1 üzerinde DNS servisini etkinleştirin.', en: 'Enable DNS service on Server-1.' },
    weight: 5,
    checkType: 'config',
    checkParams: { targetDeviceId: 'server-1', configKey: 'services.dns.enabled', configValue: true },
    completed: false
  }
];

export const getExamProjects = (language: 'tr' | 'en'): ExamProject[] => {
  const isTr = language === 'tr';

  return [
    {
      id: 'exam-template-blank',
      tag: isTr ? 'TASLAK' : 'TEMPLATE',
      title: isTr ? 'Boş Sınav Şablonu' : 'Blank Exam Template',
      description: isTr
        ? 'Kendi sınavınızı oluşturmak için bu şablonu kullanın'
        : 'Use this template to create your own exam',
      detail: isTr
        ? 'Topolojinizi oluşturun ve ardından "Sınav Düzenleyici" panelini kullanarak görevleri tanımlayın.'
        : 'Create your topology and then use the "Exam Editor" panel to define tasks.',
      data: {
        version: '1.0',
        timestamp: new Date().toISOString(),
        devices: [],
        deviceOutputs: [],
        pcOutputs: [],
        pcHistories: [],
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        topology: { devices: [], connections: [] },
        activeTab: 'topology'
      } as unknown as ExampleProject['data'],
      level: 'basic',
      isExam: true,
      isCustom: true,
      tasks: [],
      durationMinutes: 30,
      difficulty: 'beginner'
    },
    {
      id: 'exam-basic-1',
      tag: isTr ? 'SINAV' : 'EXAM',
      title: isTr ? 'Temel Ağ Bilgisi Sınavı' : 'Basic Networking Exam',
      description: isTr
        ? 'Fiziksel bağlantı, hostname ve temel VLAN yapılandırması'
        : 'Physical connection, hostname and basic VLAN configuration',
      detail: isTr
        ? 'Bu sınavda temel switch ayarlarını yapmanız beklenmektedir. Yardım veya ipucu sağlanmaz.'
        : 'In this exam, you are expected to perform basic switch settings. No help or hints provided.',
      data: {
        version: '1.0',
        timestamp: new Date().toISOString(),
        devices: [],
        deviceOutputs: [],
        pcOutputs: [],
        pcHistories: [],
        topology: {
          devices: [
            {
              id: 'switch-1',
              type: 'switchL2',
              name: 'Switch',
              x: 400,
              y: 200,
              ip: '',
              macAddress: '00:1A:2B:3C:4D:99',
              status: 'online',
              switchModel: 'WS-C2960-24TT-L',
              ports: [
                ...Array.from({ length: 24 }, (_, i) => ({
                  id: `fa0/${i + 1}`,
                  label: `Fa0/${i + 1}`,
                  status: 'disconnected' as const
                })),
                { id: 'console', label: 'Console', status: 'disconnected' as const },
                { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const },
                { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const }
              ]
            },
            {
              id: 'pc-1',
              type: 'pc',
              name: 'PC-1',
              x: 150,
              y: 200,
              ip: '192.168.1.10',
              subnet: '255.255.255.0',
              gateway: '192.168.1.1',
              macAddress: '00:50:79:66:68:99',
              status: 'online',
              ports: [
                { id: 'eth0', label: 'Eth0', status: 'disconnected' as const },
                { id: 'com1', label: 'COM1', status: 'disconnected' as const }
              ]
            }
          ],
          connections: [],
          notes: [
            {
              id: 'exam-intro',
              text: isTr
                ? '📝 TEMEL AĞ BİLGİSİ SINAVI\n\nŞu anda bir sınavdasınız. \nGörevleri tamamladıkça puanınız güncellenecektir.\n\nBaşarılar!'
                : '📝 BASIC NETWORKING EXAM\n\nThis is an exam.\nYour score will be updated as you complete tasks.\n\nGood luck!',
              x: 450,
              y: 80,
              width: 350,
              height: 150,
              color: 'var(--color-error-500)',
              font: 'verdana',
              fontSize: 12,
              opacity: 0.75
            }
          ]
        },
        cableInfo: {
          connected: true,
          cableType: 'straight',
          sourceDevice: 'pc',
          targetDevice: 'switchL2'
        },
        activeDeviceId: 'switch-1',
        activeDeviceType: 'switchL2',
        activeTab: 'topology',
        zoom: 1,
        pan: { x: 0, y: 0 }
      },
      level: 'basic',
      isExam: true,
      tasks: basicConnectivityExamTasks,
      durationMinutes: 15,
      difficulty: 'beginner'
    },
    {
      id: 'exam-routing-1',
      tag: isTr ? 'SINAV' : 'EXAM',
      title: isTr ? 'Statik Yönlendirme Sınavı' : 'Static Routing Exam',
      description: isTr
        ? 'Router yapılandırması ve statik rotalar'
        : 'Router configuration and static routes',
      detail: isTr
        ? 'Router arayüzlerini yapılandırın, PC\'lere IP atayın ve statik rota ekleyin.'
        : 'Configure router interfaces, assign IPs to PCs, and add a static route.',
      data: {
        version: '1.0',
        timestamp: new Date().toISOString(),
        devices: [],
        deviceOutputs: [],
        pcOutputs: [],
        pcHistories: [],
        topology: {
          devices: [
            {
              id: 'r-1',
              type: 'router',
              name: 'R1',
              x: 400,
              y: 200,
              ip: '',
              status: 'online',
              ports: [
                { id: 'console', label: 'Console', status: 'disconnected' as const },
                { id: 'gi0/0', label: 'Gi0/0', status: 'disconnected' as const },
                { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const },
                { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const },
                { id: 'gi0/3', label: 'Gi0/3', status: 'disconnected' as const },
                { id: 's0/0/0', label: 'S0/0/0', status: 'disconnected' as const },
                { id: 's0/1/0', label: 'S0/1/0', status: 'disconnected' as const },
                { id: 's0/2/0', label: 'S0/2/0', status: 'disconnected' as const },
                { id: 'wlan0', label: 'WLAN0', status: 'disconnected' as const }
              ]
            },
            {
              id: 'pc-1',
              type: 'pc',
              name: 'PC-1',
              x: 100,
              y: 200,
              ip: '',
              subnet: '',
              gateway: '',
              macAddress: '00:50:79:66:68:01',
              status: 'online',
              ports: [
                { id: 'eth0', label: 'Eth0', status: 'disconnected' as const },
                { id: 'com1', label: 'COM1', status: 'disconnected' as const }
              ]
            },
            {
              id: 'pc-2',
              type: 'pc',
              name: 'PC-2',
              x: 700,
              y: 200,
              ip: '',
              subnet: '',
              gateway: '',
              macAddress: '00:50:79:66:68:02',
              status: 'online',
              ports: [
                { id: 'eth0', label: 'Eth0', status: 'disconnected' as const },
                { id: 'com1', label: 'COM1', status: 'disconnected' as const }
              ]
            }
          ],
          connections: [],
          notes: [
            {
              id: 'exam-intro',
              text: isTr
                ? '📝 STATİK YÖNLENDİRME SINAVI\n\nKabloları ve IP yapılandırmalarını kendiniz yapmalısınız.\nGörevleri tamamladıkça puanınız güncellenir.\n\nBaşarılar!'
                : '📝 STATIC ROUTING EXAM\n\nYou must make the cable connections and IP configurations yourself.\nYour score will be updated as you complete tasks.\n\nGood luck!',
              x: 50,
              y: 50,
              width: 400,
              height: 140,
              color: 'var(--color-error-500)',
              font: 'verdana',
              fontSize: 12,
              opacity: 0.75
            }
          ]
        },
        cableInfo: {
          connected: true,
          cableType: 'straight',
          sourceDevice: 'pc',
          targetDevice: 'router'
        },
        activeDeviceId: 'r-1',
        activeDeviceType: 'router',
        activeTab: 'topology',
        zoom: 1,
        pan: { x: 0, y: 0 }
      } as unknown as ExampleProject['data'],
      level: 'intermediate',
      isExam: true,
      tasks: routingBasicsExamTasks,
      durationMinutes: 15,
      difficulty: 'intermediate'
    },
    {
      id: 'exam-l3-1',
      tag: isTr ? 'SINAV' : 'EXAM',
      title: isTr ? 'L3 Switch ve DHCP Sınavı' : 'L3 Switch and DHCP Exam',
      description: isTr
        ? 'Layer 3 switch ayarları ve DHCP servisi'
        : 'Layer 3 switch settings and DHCP service',
      detail: isTr
        ? 'L3 Switch üzerinde yönlendirme ve DHCP havuzu oluşturma becerinizi test edin.'
        : 'Test your L3 Switch routing and DHCP pool creation skills.',
      data: {
        version: '1.0',
        timestamp: new Date().toISOString(),
        devices: [],
        deviceOutputs: [],
        pcOutputs: [],
        pcHistories: [],
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        topology: {
          devices: [
            {
              id: 'l3-1',
              type: 'switchL3',
              name: 'L3-Switch',
              ip: '',
              subnet: '',
              x: 400,
              y: 200,
              status: 'online',
              ports: [
                ...Array.from({ length: 24 }, (_, i) => ({
                  id: `gi1/0/${i + 1}`,
                  label: `Gi1/0/${i + 1}`,
                  status: 'disconnected' as const
                })),
                { id: 'console', label: 'Console', status: 'disconnected' as const },
                { id: 'gi1/1/1', label: 'Gi1/1/1', status: 'disconnected' as const },
                { id: 'gi1/1/2', label: 'Gi1/1/2', status: 'disconnected' as const },
                { id: 'gi1/1/3', label: 'Gi1/1/3', status: 'disconnected' as const },
              { id: 'gi1/1/4', label: 'Gi1/1/4', status: 'disconnected' as const },
              { id: 'wlan0', label: 'WLAN0', status: 'disconnected' as const }
                ]
              }
            ],
            connections: [],
            notes: []
          },
          activeDeviceId: 'l3-1',
        activeDeviceType: 'switchL3',
        activeTab: 'topology',
        zoom: 1,
        pan: { x: 0, y: 0 }
      } as unknown as ExampleProject['data'],
      level: 'advanced',
      isExam: true,
      tasks: l3SwitchDhcpExamTasks,
      durationMinutes: 25,
      difficulty: 'advanced'
    },
    {
      id: 'exam-vtp-1',
      tag: isTr ? 'SINAV' : 'EXAM',
      title: isTr ? 'VLAN Trunking & VTP Sınavı' : 'VLAN Trunking & VTP Exam',
      description: isTr
        ? 'VTP yönetimi ve trunk bağlantı becerileri'
        : 'VTP management and trunk connection skills',
      detail: isTr
        ? 'Switchler arası VLAN senkronizasyonu için VTP ve trunk yapılandırın.'
        : 'Configure VTP and trunk for VLAN synchronization between switches.',
      data: {
        version: '1.0',
        timestamp: new Date().toISOString(),
        devices: [],
        deviceOutputs: [],
        pcOutputs: [],
        pcHistories: [],
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        topology: {
          devices: [
            {
              id: 'switch-1',
              type: 'switchL2',
              name: 'SW1',
              ip: '',
              subnet: '',
              x: 200,
              y: 200,
              status: 'online',
              ports: [
                ...Array.from({ length: 24 }, (_, i) => ({
                  id: `fa0/${i + 1}`,
                  label: `Fa0/${i + 1}`,
                  status: 'disconnected' as const
                })),
                { id: 'console', label: 'Console', status: 'disconnected' as const },
                { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const },
                { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const }
              ]
            },
            {
              id: 'switch-2',
              type: 'switchL2',
              name: 'SW2',
              ip: '',
              subnet: '',
              x: 500,
              y: 200,
              status: 'online',
              ports: [
                ...Array.from({ length: 24 }, (_, i) => ({
                  id: `fa0/${i + 1}`,
                  label: `Fa0/${i + 1}`,
                  status: 'disconnected' as const
                })),
                { id: 'console', label: 'Console', status: 'disconnected' as const },
                { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const },
                { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const }
              ]
            }
          ],
          connections: [],
          notes: []
        },
        activeDeviceId: 'switch-1',
        activeDeviceType: 'switchL2',
        activeTab: 'topology',
        zoom: 1,
        pan: { x: 0, y: 0 }
      },
      level: 'intermediate',
      isExam: true,
      tasks: vlanTrunkingExamTasks,
      durationMinutes: 20,
      difficulty: 'intermediate'
    },
    {
      id: 'exam-acl-1',
      tag: isTr ? 'SINAV' : 'EXAM',
      title: isTr ? 'Standard ACL Sınavı' : 'Standard ACL Exam',
      description: isTr
        ? 'Erişim kontrol listeleri ile trafik filtreleme'
        : 'Traffic filtering with access control lists',
      detail: isTr
        ? 'Router üzerinde belirli bir hostun erişimini kısıtlayan ACL yapılandırın.'
        : 'Configure ACL on router to restrict access of a specific host.',
      data: {
        version: '1.0',
        timestamp: new Date().toISOString(),
        devices: [],
        deviceOutputs: [],
        pcOutputs: [],
        pcHistories: [],
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        topology: {
          devices: [
            {
              id: 'router-1',
              type: 'router',
              name: 'R1',
              ip: '',
              subnet: '',
              x: 400,
              y: 200,
              status: 'online',
              ports: [
                { id: 'console', label: 'Console', status: 'disconnected' as const },
                { id: 'gi0/0', label: 'Gi0/0', status: 'disconnected' as const },
                { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const },
                { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const },
                { id: 'gi0/3', label: 'Gi0/3', status: 'disconnected' as const },
                { id: 's0/0/0', label: 'S0/0/0', status: 'disconnected' as const },
                { id: 's0/1/0', label: 'S0/1/0', status: 'disconnected' as const },
                { id: 's0/2/0', label: 'S0/2/0', status: 'disconnected' as const },
                { id: 'wlan0', label: 'WLAN0', status: 'disconnected' as const }
              ]
            }
          ],
          connections: [],
          notes: []
        },
        activeDeviceId: 'router-1',
        activeDeviceType: 'router',
        activeTab: 'topology',
        zoom: 1,
        pan: { x: 0, y: 0 }
      },
      level: 'advanced',
      isExam: true,
      tasks: basicAclExamTasks,
      durationMinutes: 20,
      difficulty: 'advanced'
    },
    {
      id: 'exam-comprehensive-master',
      tag: isTr ? 'FİNAL' : 'FINAL',
      title: isTr ? 'Kapsamlı Ağ Uzmanlığı Sınavı' : 'Comprehensive Network Master Exam',
      description: isTr
        ? 'Tüm cihaz türlerini ve protokolleri içeren ileri seviye final sınavı.'
        : 'Advanced final exam covering all device types and protocols.',
      detail: isTr
        ? 'Bu sınav; L2/L3 Switchleme, Router yapılandırması, DHCP, WiFi ve ACL konularını kapsar.'
        : 'This exam covers L2/L3 Switching, Router config, DHCP, WiFi, and ACLs.',
      data: {
        version: '1.0',
        timestamp: new Date().toISOString(),
        devices: [],
        deviceOutputs: [],
        pcOutputs: [],
        pcHistories: [],
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        topology: {
          devices: [
            { id: 'r-1', type: 'router', name: 'R1', ip: '', subnet: '', x: 500, y: 100, status: 'online', ports: [
              { id: 'console', label: 'Console', status: 'disconnected' },
              { id: 'gi0/0', label: 'Gi0/0', status: 'disconnected' },
              { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' },
              { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' },
              { id: 'gi0/3', label: 'Gi0/3', status: 'disconnected' },
              { id: 's0/0/0', label: 'S0/0/0', status: 'disconnected' },
              { id: 's0/1/0', label: 'S0/1/0', status: 'disconnected' },
              { id: 's0/2/0', label: 'S0/2/0', status: 'disconnected' },
              { id: 'wlan0', label: 'WLAN0', status: 'disconnected', wifi: { ssid: '', mode: 'ap', security: 'open', channel: '2.4GHz' } }
            ]},
            { id: 'ds-1', type: 'switchL3', name: 'DS1', ip: '', subnet: '', x: 500, y: 250, status: 'online', switchModel: 'WS-C3650-24PS', ports: [
              ...Array.from({ length: 24 }, (_, i) => ({ id: `gi1/0/${i + 1}`, label: `Gi1/0/${i + 1}`, status: 'disconnected' as const })),
              { id: 'console', label: 'Console', status: 'disconnected' as const },
              { id: 'gi1/1/1', label: 'Gi1/1/1', status: 'disconnected' as const },
              { id: 'gi1/1/2', label: 'Gi1/1/2', status: 'disconnected' as const },
              { id: 'gi1/1/3', label: 'Gi1/1/3', status: 'disconnected' as const },
              { id: 'gi1/1/4', label: 'Gi1/1/4', status: 'disconnected' as const },
              { id: 'wlan0', label: 'WLAN0', status: 'disconnected' as const }
            ]},
            { id: 'as-1', type: 'switchL2', name: 'AS1', ip: '', subnet: '', x: 300, y: 400, status: 'online', switchModel: 'WS-C2960-24TT-L', ports: [
              ...Array.from({ length: 24 }, (_, i) => ({ id: `fa0/${i + 1}`, label: `Fa0/${i + 1}`, status: 'disconnected' as const })),
              { id: 'console', label: 'Console', status: 'disconnected' as const },
              { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const },
              { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const }
            ]},
            { id: 'pc-1', type: 'pc', name: 'PC-1', x: 100, y: 400, status: 'online', ip: '', subnet: '', gateway: '', ports: [{ id: 'eth0', label: 'Eth0', status: 'disconnected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] },
            { id: 'iot-1', type: 'iot', name: 'IoT-1', x: 700, y: 100, status: 'online', ip: '', wifi: { enabled: true, ssid: '', mode: 'client', security: 'open', channel: '2.4GHz' }, ports: [{ id: 'wlan0', label: 'WLAN0', status: 'disconnected' as const, wifi: { ssid: '', security: 'open', channel: '2.4GHz', mode: 'client' } }] },
            { id: 'fw-1', type: 'firewall', name: 'FW-1', x: 750, y: 250, status: 'online', ip: '', subnet: '', ports: [
              { id: 'gi0/0', label: 'Gi0/0', status: 'disconnected' as const },
              { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const }
            ]},
            { id: 'server-1', type: 'pc', name: 'Server-1', x: 750, y: 400, status: 'online', ip: '10.0.0.100', subnet: '255.0.0.0', ports: [{ id: 'eth0', label: 'Eth0', status: 'disconnected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] }
          ],
          connections: [],
          notes: [
            {
              id: 'master-note',
              text: isTr
                ? '🎓 KAPSAMLI FİNAL SINAVI\n\nBu sınavda tüm ağ becerilerinizi sergilemeniz beklenmektedir.\nKablolamadan ACL yapılandırmasına kadar tüm adımları tamamlayın.'
                : '🎓 COMPREHENSIVE FINAL EXAM\n\nYou are expected to demonstrate all your networking skills in this exam.\nComplete all steps from cabling to ACL configuration.',
              x: 50, y: 50, width: 400, height: 120, color: 'var(--color-warning-500)', font: 'verdana', fontSize: 12, opacity: 0.75
            }
          ]
        },
        activeDeviceId: 'r-1',
        activeDeviceType: 'router',
        activeTab: 'topology',
        zoom: 1,
        pan: { x: 0, y: 0 }
      },
      level: 'advanced',
      isExam: true,
      tasks: comprehensiveFinalExamTasks,
      durationMinutes: 60,
      difficulty: 'advanced'
    }
  ];
};

  /**
   * Extract CLI commands from note text and return them as a deduplicated array.
   * Detects lines that start with known NOS command verbs.
   */
  function extractCliCommandsFromNotes(notes: NoteItem[]): string[] {
  if (!notes || !Array.isArray(notes)) return [];

  const reservedVlanIds = new Set([1002, 1003, 1004, 1005]);

  const knownCliVerbs = [
    'enable', 'disable', 'configure', 'conf', 'hostname', 'interface',
    'ip', 'ipv6', 'vlan', 'name', 'no', 'show', 'do', 'ping', 'traceroute',
    'switchport', 'username', 'banner', 'motd', 'line', 'router',
    'network', 'passive-interface', 'default-router', 'dns-server', 'domain-name',
    'dhcp', 'lease', 'excluded-address', 'exit', 'end',
    'write', 'copy', 'reload', 'delete', 'erase',
    'description', 'speed', 'duplex', 'mac', 'arp',
    'service', 'login', 'password', 'secret', 'encryption',
    'ssh', 'crypto', 'access-list', 'access-group', 'nat', 'pool', 'route',
    'standby', 'vtp', 'spanning-tree', 'channel-group', 'channel-protocol',
    'wlan', 'station-role', 'security', 'radius', 'aaa',
    'clock', 'ntp', 'logging', 'snmp', 'privilege',
    'alias', 'prompt', 'exec', 'timeout', 'history',
    'terminal', 'monitor', 'debug', 'undebug', 'clear',
    'lacp', 'pagp', 'lldp', 'cdp', 'mls', 'sdm',
    'power', 'environment', 'redundancy', 'errdisable',
    'storm-control', 'port-security', 'dot1x',
    'default', 'set', 'reset', 'restart', 'startup',
    'help', 'telnet', 'shutdown', 'state', 'active', 'suspend',
    'ipconfig', 'ifconfig', 'arp', 'nslookup',
    'ip host', 'wget', 'curl',  'ssh', 'crypto',
  ];

  const seen = new Set<string>();
  const commands: string[] = [];

  for (const note of notes) {
    if (!note.text) continue;
    const lines = note.text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Skip lines that clearly aren't CLI commands
      if (/^[\u{1F000}-\u{1FFFF}]/u.test(trimmed)) continue;
      if (/^#{1,6}\s/.test(trimmed)) continue;
      if (/^[A-ZÖÇŞİĞÜ]/u.test(trimmed) && trimmed.length > 3) continue;

      // Remove bullet markers and numbering prefixes
      const cleaned = trimmed.replace(/^[-–*•]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
      if (!cleaned) continue;

      // Skip remaining non-command patterns
      if (/^[A-ZÖÇŞİĞÜ]/u.test(cleaned) && !cleaned.startsWith('IP') && !cleaned.startsWith('PC-')) continue;
      if (/^["'`()[\]]/.test(cleaned)) continue;
      if (cleaned.length < 2) continue;
      if (/^[\d]+$/.test(cleaned)) continue;

      // Check if the line starts with a known CLI verb
      const lowerLine = cleaned.toLowerCase();
      const matched = knownCliVerbs.some(verb =>
        lowerLine === verb || lowerLine.startsWith(verb + ' ')
      );

      if (matched && !seen.has(lowerLine)) {
        // Skip reserved VLAN creation (1002-1005)
        const vlanMatch = lowerLine.match(/^vlan\s+(\d+)$/);
        if (vlanMatch && reservedVlanIds.has(parseInt(vlanMatch[1]))) continue;

        // Skip reserved VLAN in switchport access (1002-1005)
        const switchportVlanMatch = lowerLine.match(/^switchport\s+access\s+vlan\s+(\d+)$/);
        if (switchportVlanMatch && reservedVlanIds.has(parseInt(switchportVlanMatch[1]))) continue;

        seen.add(lowerLine);
        commands.push(cleaned);
      }
    }
  }

  return commands;
}

/**
 * Extract PC IP configuration information from note text.
 * Parses patterns like "PC-1: IP 192.168.1.10, Subnet 255.255.255.0"
 * or "PC-1: IP 192.168.1.10, DNS 192.168.1.10"
 * or "PC-1 → IP: 192.168.1.10 /24"
 * Returns an array of { deviceId, ip, subnet, gateway, dns } objects.
 */
interface NotePcConfig {
  deviceId: string;
  ip?: string;
  subnet?: string;
  gateway?: string;
  dns?: string;
}

function extractPcConfigsFromNotes(notes: NoteItem[]): NotePcConfig[] {
  if (!notes || !Array.isArray(notes)) return [];
  const configs: NotePcConfig[] = [];
  const seen = new Set<string>();

  for (const note of notes) {
    if (!note.text) continue;
    const lines = note.text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Remove numbering prefixes like "1) ", "1. ", "- ", "* "
      const cleaned = trimmed.replace(/^[-–*•\d]+[.)]\s*/, '').trim();
      if (!cleaned) continue;

      // Pattern: "PC-X: IP a.b.c.d, Subnet w.x.y.z"
      // or "PC-X: IP a.b.c.d, DNS w.x.y.z"
      // or "PC-X: IP a.b.c.d, Subnet w.x.y.z, Gateway a.b.c.d"
      const pcMatch = cleaned.match(/^(PC-[\w-]+)\s*[:\-–→]\s*IP\s+([\d.]+)/i);
      if (pcMatch) {
        const deviceId = pcMatch[1].toLowerCase();
        const ip = pcMatch[2];
        if (!seen.has(deviceId)) {
          seen.add(deviceId);
          configs.push({ deviceId, ip });
        } else {
          const existing = configs.find(c => c.deviceId === deviceId);
          if (existing) existing.ip = ip;
        }

        // Extract Subnet from same line
        const subnetMatch = cleaned.match(/Subnet\s+([\d.]+)/i);
        if (subnetMatch) {
          const existing = configs.find(c => c.deviceId === deviceId);
          if (existing) existing.subnet = subnetMatch[1];
        }

        // Extract Gateway from same line
        const gwMatch = cleaned.match(/Gateway\s+([\d.]+)/i);
        if (gwMatch) {
          const existing = configs.find(c => c.deviceId === deviceId);
          if (existing) existing.gateway = gwMatch[1];
        }

        // Extract DNS from same line
        const dnsMatch = cleaned.match(/DNS\s+([\d.]+)/i);
        if (dnsMatch) {
          const existing = configs.find(c => c.deviceId === deviceId);
          if (existing) existing.dns = dnsMatch[1];
        }
      }
    }
  }
  return configs;
}

/**
 * Extract connection information from note text.
 * Parses patterns like "PC-1 (eth0) ile Switch-1 (fa0/1) arasını bağlayın"
 * Returns an array of { sourceDevice, sourcePort, targetDevice, targetPort } objects.
 */
interface NoteConnectionInfo {
  sourceDevice: string;
  sourcePort?: string;
  targetDevice: string;
  targetPort?: string;
}

function extractConnectionsFromNotes(notes: NoteItem[]): NoteConnectionInfo[] {
  if (!notes || !Array.isArray(notes)) return [];
  const connections: NoteConnectionInfo[] = [];
  const seen = new Set<string>();

  for (const note of notes) {
    if (!note.text) continue;
    const lines = note.text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Remove numbering prefixes like "3) ", "1. ", "- ", "* "
      const cleaned = trimmed.replace(/^[-–*•\d]+[.)]\s*/, '').trim();
      if (!cleaned) continue;

      // Pattern: "PC-1 (eth0) ile Switch-1 (fa0/1) arasını bağlayın"
      // or "PC-1 → Switch-1"
      // or "PC-1 bağla Switch-1"
      const connMatch = cleaned.match(/([\w-]+)\s*(?:\((\w+)\))?\s*(?:ile|→|bağla|bağlayın|connect)\s+([\w-]+)\s*(?:\((\w+)\))?/i);
      if (connMatch) {
        const source = connMatch[1].toLowerCase();
        const sourcePort = connMatch[2]?.toLowerCase();
        const target = connMatch[3]?.toLowerCase();
        const targetPort = connMatch[4]?.toLowerCase();
        if (source && target) {
          const key = `${source}-${target}`;
          if (!seen.has(key)) {
            seen.add(key);
            connections.push({
              sourceDevice: source,
              sourcePort: sourcePort || undefined,
              targetDevice: target,
              targetPort: targetPort || undefined,
            });
          }
        }
      }
    }
  }
  return connections;
}

/**
 * Automatically generates exam tasks from a project data object.
 * Analyzes connections, hostnames, IP configs, and VLANs.
 * Also extracts CLI commands from topology notes.
 */
export function generateExamFromProject(projectData: ProjectData, language: 'tr' | 'en'): ExamProject {
  const isTr = language === 'tr';
  let tasks: ExamTask[] = [];

  // 0. Use existing tasks/steps if present, but filter out completed ones and connection tasks.
  const sourceItems = projectData.tasks || projectData.steps || [];
  if (sourceItems.length > 0) {
    const seenItems = new Set<string>();
    tasks = sourceItems
      .filter((item: ExamTask) => {
        if (item.completed || item.checkType === 'connection') return false;
        const key = `${item.checkType}-${JSON.stringify(item.checkParams)}`;
        if (seenItems.has(key)) return false;
        seenItems.add(key);
        return true;
      })
      .map((item: ExamTask) => ({
        ...item,
        id: item.id || `task-${Date.now()}-${Math.random()}`,
        completed: false,
        completedAt: undefined
      }));
  }

  const addDeviceTask = (deviceId: string, title: { tr: string; en: string }, desc: { tr: string; en: string }, type: ExamTask['checkType'], params: ExamTask['checkParams']) => {
    // Deduplication - don't add the same task twice
    const isDuplicate = tasks.some(t =>
      t.checkType === type &&
      JSON.stringify(t.checkParams) === JSON.stringify(params)
    );
    if (isDuplicate) return;

    tasks.push({
      id: `task-${deviceId}-${tasks.length}`,
      title,
      description: desc,
      weight: 0, // Will be balanced later
      checkType: type,
      checkParams: params,
      completed: false
    });
  };

  // 1. Hostname Tasks
  if (Array.isArray(projectData.devices)) {
    projectData.devices.forEach((d: ProjectDevice) => {
      if (d.state?.hostname && d.state.hostname !== 'Switch' && d.state.hostname !== 'Router' && d.state.hostname !== 'L3-Switch') {
        addDeviceTask(d.id,
          { tr: `${d.id} Hostname Ayarı`, en: `${d.id} Hostname Config` },
          { tr: `${d.id} cihazının ismini "${d.state.hostname}" olarak ayarlayın.`, en: `Set hostname of ${d.id} to "${d.state.hostname}".` },
          'command',
          { commandPattern: `hostname ${d.state.hostname}` }
        );
      }
    });
  }

  // 2. Physical Connection Tasks - skip already-active connections
  if ((projectData.topology?.connections?.length ?? 0) > 0) {
    (projectData.topology?.connections ?? [])
      .filter((conn: { sourceDeviceId: string; sourcePort: string; targetDeviceId: string; targetPort: string; cableType: string; active?: boolean; }) => !conn.active)
      .forEach((conn: { sourceDeviceId: string; sourcePort: string; targetDeviceId: string; targetPort: string; cableType: string; active?: boolean; }) => {
        addDeviceTask(conn.sourceDeviceId,
          { tr: 'Fiziksel Bağlantı', en: 'Physical Connection' },
          {
            tr: `${conn.sourceDeviceId} (${conn.sourcePort}) ile ${conn.targetDeviceId} (${conn.targetPort}) arasını bağlayın.`,
            en: `Connect ${conn.sourceDeviceId} (${conn.sourcePort}) to ${conn.targetDeviceId} (${conn.targetPort}).`
          },
          'connection',
          {
            sourceDevice: conn.sourceDeviceId,
            sourcePort: conn.sourcePort,
            targetDevice: conn.targetDeviceId,
            targetPort: conn.targetPort,
            cableType: conn.cableType as 'straight' | 'crossover' | 'console'
          }
        );
      });
  }

  // 2b. Connection tasks extracted from notes
  const noteConnections = extractConnectionsFromNotes(projectData.topology?.notes ?? []);
  noteConnections.forEach(conn => {
    addDeviceTask(conn.sourceDevice,
      { tr: 'Fiziksel Bağlantı (Not)', en: 'Physical Connection (Note)' },
      {
        tr: `${conn.sourceDevice} (${conn.sourcePort || 'uygun port'}) ile ${conn.targetDevice} (${conn.targetPort || 'uygun port'}) arasını bağlayın.`,
        en: `Connect ${conn.sourceDevice} (${conn.sourcePort || 'appropriate port'}) to ${conn.targetDevice} (${conn.targetPort || 'appropriate port'}).`
      },
      'connection',
      {
        sourceDevice: conn.sourceDevice,
        sourcePort: conn.sourcePort,
        targetDevice: conn.targetDevice,
        targetPort: conn.targetPort,
      }
    );
  });

  // 3. PC IP Configuration Tasks from Topology Devices
  if ((projectData.topology?.devices?.length ?? 0) > 0) {
    projectData.topology?.devices?.forEach((d: ProjectDevice) => {
      if (d.type === 'pc' && d.ip && d.ip !== '') {
        addDeviceTask(d.id,
          { tr: `${d.name || d.id} IP Yapılandırması`, en: `${d.name || d.id} IP Configuration` },
          {
            tr: `${d.name || d.id} cihazına IP ${d.ip}${d.subnet ? ', Subnet ' + d.subnet : ''}${d.gateway ? ', Gateway ' + d.gateway : ''} atayın.`,
            en: `Assign IP ${d.ip}${d.subnet ? ', Subnet ' + d.subnet : ''}${d.gateway ? ', Gateway ' + d.gateway : ''} to ${d.name || d.id}.`
          },
          'config',
          {
            configKey: `pc.${d.id}.ip`,
            configValue: d.ip,
            subnetMask: d.subnet,
          }
        );
      }
    });
  }

  // 3b. PC IP Configuration Tasks from Notes
  const notePcConfigs = extractPcConfigsFromNotes(projectData.topology?.notes ?? []);
  notePcConfigs.forEach(pcConfig => {
    // Only add if a topology device with this id exists and has matching ip
    const topoDevice = projectData.topology?.devices?.find((d: ProjectDevice) =>
      d.id === pcConfig.deviceId || d.id === pcConfig.deviceId
    );
    if (topoDevice && topoDevice.ip && topoDevice.ip !== '') {
      // Already added from topology data above
      return;
    }
    const deviceLabel = pcConfig.deviceId.toUpperCase();
    addDeviceTask(pcConfig.deviceId,
      { tr: `${deviceLabel} IP Yapılandırması`, en: `${deviceLabel} IP Configuration` },
      {
        tr: `${deviceLabel} cihazına IP ${pcConfig.ip}${pcConfig.subnet ? ', Subnet ' + pcConfig.subnet : ''}${pcConfig.gateway ? ', Gateway ' + pcConfig.gateway : ''}${pcConfig.dns ? ', DNS ' + pcConfig.dns : ''} atayın.`,
        en: `Assign IP ${pcConfig.ip}${pcConfig.subnet ? ', Subnet ' + pcConfig.subnet : ''}${pcConfig.gateway ? ', Gateway ' + pcConfig.gateway : ''}${pcConfig.dns ? ', DNS ' + pcConfig.dns : ''} to ${deviceLabel}.`
      },
      'config',
      {
        configKey: `pc.${pcConfig.deviceId}.ip`,
        configValue: pcConfig.ip,
        subnetMask: pcConfig.subnet,
      }
    );
  });

  // 4. VLAN & Interface Tasks (Simplified)
  if (Array.isArray(projectData.devices)) {
    projectData.devices.forEach((d: ProjectDevice) => {
      // Interface IPs (Router/L3 Switch) & WLAN
      if (d.state?.ports) {
        Object.values(d.state.ports).forEach((p: DevicePort) => {
          if (p.ipAddress && p.ipAddress !== '0.0.0.0' && !p.isSubinterface) {
            addDeviceTask(d.id,
              { tr: `${p.id} IP Yapılandırması`, en: `${p.id} IP Configuration` },
              {
                tr: `${d.id} cihazının ${p.id} arayüzüne ${p.ipAddress} IP adresini atayın.`,
                en: `Assign IP ${p.ipAddress} to interface ${p.id} on ${d.id}.`
              },
              'command',
              { commandPattern: `ip address ${p.ipAddress}` }
            );
          }

          if (p.wifi?.ssid) {
            addDeviceTask(d.id,
              { tr: `${p.id} WLAN Yapılandırması`, en: `${p.id} WLAN Configuration` },
              {
                tr: `${d.id} cihazının ${p.id} arayüzünde SSID="${p.wifi.ssid}" olacak şekilde kablosuz ağ oluşturun.`,
                en: `Configure wireless network on ${d.id} interface ${p.id} with SSID="${p.wifi.ssid}".`
              },
              'config',
              {
                configKey: `ports.${p.id}.wifi.ssid`,
                configValue: p.wifi.ssid
              }
            );
          }
        });
      }

      // DHCP Pools
      if (d.state?.dhcpPools) {
        Object.entries(d.state.dhcpPools).forEach(([name, pool]: [string, { network: string }]) => {
          addDeviceTask(d.id,
            { tr: `DHCP Havuzu: ${name}`, en: `DHCP Pool: ${name}` },
            {
              tr: `${d.id} üzerinde "${name}" isminde, ${pool.network} ağını dağıtan bir DHCP havuzu oluşturun.`,
              en: `Create a DHCP pool named "${name}" on ${d.id} for network ${pool.network}.`
            },
            'config',
            {
              configKey: `dhcpPools.${name}.network`,
              configValue: pool.network
            }
          );
        });
      }

      // DNS & HTTP Services
      if (d.state?.services) {
        const s = d.state.services;
        if (s.dns?.enabled) {
          addDeviceTask(d.id,
            { tr: 'DNS Servisini Etkinleştir', en: 'Enable DNS Service' },
            { tr: `${d.id} üzerinde DNS servisini aktif edin.`, en: `Enable DNS service on ${d.id}.` },
            'config',
            { configKey: 'services.dns.enabled', configValue: true }
          );

          if ((s.dns.records?.length ?? 0) > 0) {
            (s.dns.records ?? []).forEach((rec: { domain: string; address: string }) => {
              addDeviceTask(d.id,
                { tr: `DNS Kaydı: ${rec.domain}`, en: `DNS Record: ${rec.domain}` },
                { tr: `${rec.domain} alan adını ${rec.address} IP adresine yönlendirin.`, en: `Add DNS record for ${rec.domain} pointing to ${rec.address}.` },
                'config',
                { configKey: 'services.dns.records', configValue: [rec] }
              );
            });
          }
        }
      }
    });
  }

  // 5. Comprehensive Device Configuration Tasks (Security, Routing, Ports)
  if (Array.isArray(projectData.devices)) {
    projectData.devices.forEach((d: ProjectDevice) => {
      if (!d.state) return;

      // Security: enable secret
      if (d.state.security?.enableSecret) {
        addDeviceTask(d.id,
          { tr: `Enable Secret`, en: `Enable Secret` },
          { tr: `${d.id} üzerinde enable secret şifresi belirleyin.`, en: `Set enable secret password on ${d.id}.` },
          'command',
          { commandPattern: 'enable secret' }
        );
      }

      // Security: console line password
      if (d.state.security?.consoleLine?.password) {
        addDeviceTask(d.id,
          { tr: `Console Şifresi`, en: `Console Password` },
          { tr: `${d.id} üzerinde console hattına şifre ve login ekleyin.`, en: `Set console line password and login on ${d.id}.` },
          'command',
          { commandPattern: 'line con 0' }
        );
      }

      // Security: VTY line password
      if (d.state.security?.vtyLines?.password) {
        addDeviceTask(d.id,
          { tr: `VTY Şifresi`, en: `VTY Password` },
          { tr: `${d.id} üzerinde VTY hatlarına şifre ve login ekleyin.`, en: `Set VTY line password and login on ${d.id}.` },
          'command',
          { commandPattern: 'line vty' }
        );
      }

      // Security: password encryption
      if (d.state.security?.servicePasswordEncryption) {
        addDeviceTask(d.id,
          { tr: `Şifre Şifreleme`, en: `Password Encryption` },
          { tr: `${d.id} üzerinde şifre şifrelemeyi etkinleştirin.`, en: `Enable password encryption on ${d.id}.` },
          'command',
          { commandPattern: 'service password-encryption' }
        );
      }

      // Security: local users
      if ((d.state.security?.users?.length ?? 0) > 0) {
        (d.state.security?.users ?? []).forEach((u: { username: string }) => {
          addDeviceTask(d.id,
            { tr: `Kullanıcı: ${u.username}`, en: `User: ${u.username}` },
            { tr: `${d.id} üzerinde "${u.username}" kullanıcısını oluşturun.`, en: `Create user "${u.username}" on ${d.id}.` },
            'command',
            { commandPattern: `username ${u.username}` }
          );
        });
      }

      // Static Routes
      if ((d.state.staticRoutes?.length ?? 0) > 0) {
        (d.state.staticRoutes ?? []).forEach((r: { destination: string; prefixLength: number }) => {
          addDeviceTask(d.id,
            { tr: `Statik Rota: ${r.destination}`, en: `Static Route: ${r.destination}` },
            { tr: `${d.id} üzerinde ${r.destination}/${r.prefixLength} ağına statik rota ekleyin.`, en: `Add static route to ${r.destination}/${r.prefixLength} on ${d.id}.` },
            'command',
            { commandPattern: `ip route ${r.destination}` }
          );
        });
      }

      // IP Routing enabled
      if (d.state.ipRouting) {
        addDeviceTask(d.id,
          { tr: `IP Routing`, en: `IP Routing` },
          { tr: `${d.id} üzerinde IP routing'i etkinleştirin.`, en: `Enable IP routing on ${d.id}.` },
          'command',
          { commandPattern: 'ip routing' }
        );
      }

      // Routing Protocol
      if (d.state.routingProtocol === 'rip') {
        addDeviceTask(d.id,
          { tr: `RIP Protokolü`, en: `RIP Protocol` },
          { tr: `${d.id} üzerinde RIP routing protokolünü yapılandırın.`, en: `Configure RIP routing protocol on ${d.id}.` },
          'command',
          { commandPattern: 'router rip' }
        );
      }
      if (d.state.routingProtocol === 'ospf') {
        addDeviceTask(d.id,
          { tr: `OSPF Protokolü`, en: `OSPF Protocol` },
          { tr: `${d.id} üzerinde OSPF routing protokolünü yapılandırın.`, en: `Configure OSPF routing protocol on ${d.id}.` },
          'command',
          { commandPattern: 'router ospf' }
        );
      }

      // Port configurations
      if (d.state.ports) {
        Object.values(d.state.ports).forEach((p: DevicePort) => {
          // Trunk port
          if (p.mode === 'trunk') {
            addDeviceTask(d.id,
              { tr: `${p.id} Trunk`, en: `${p.id} Trunk` },
              { tr: `${d.id} cihazının ${p.id} portunu trunk moduna alın.`, en: `Configure ${p.id} as trunk port on ${d.id}.` },
              'command',
              { commandPattern: `switchport mode trunk` }
            );
          }

          // Port access VLAN (skip default VLAN 1 and reserved VLANs 1002-1005)
          if (p.mode === 'access' && p.vlan && p.vlan !== 1 && p.vlan !== 1002 && p.vlan !== 1003 && p.vlan !== 1004 && p.vlan !== 1005) {
            addDeviceTask(d.id,
              { tr: `${p.id} VLAN ${p.vlan}`, en: `${p.id} VLAN ${p.vlan}` },
              { tr: `${d.id} cihazının ${p.id} portunu VLAN ${p.vlan}'a atayın.`, en: `Assign ${d.id} port ${p.id} to VLAN ${p.vlan}.` },
              'command',
              { commandPattern: `switchport access vlan ${p.vlan}` }
            );
          }

          // Port description
          if (p.description) {
            addDeviceTask(d.id,
              { tr: `${p.id} Açıklaması`, en: `${p.id} Description` },
              { tr: `${d.id} cihazının ${p.id} portuna açıklama ekleyin.`, en: `Add description to ${d.id} port ${p.id}.` },
              'command',
              { commandPattern: `description ${p.description}` }
            );
          }

          // Port-security
          if (p.portSecurity?.enabled) {
            addDeviceTask(d.id,
              { tr: `${p.id} Port Güvenliği`, en: `${p.id} Port Security` },
              { tr: `${d.id} cihazının ${p.id} portunda port güvenliğini etkinleştirin.`, en: `Enable port security on ${d.id} port ${p.id}.` },
              'command',
              { commandPattern: `switchport port-security` }
            );
          }

          // Routed port (no switchport)
          if (p.mode === 'routed') {
            addDeviceTask(d.id,
              { tr: `${p.id} Routed Port`, en: `${p.id} Routed Port` },
              { tr: `${d.id} cihazının ${p.id} portunu routed moda alın.`, en: `Configure ${d.id} port ${p.id} as routed port.` },
              'command',
              { commandPattern: `no switchport` }
            );
          }
        });
      }

      // VTP
      if (d.state.vtp?.mode && d.state.vtp.mode !== 'transparent') {
        addDeviceTask(d.id,
          { tr: `VTP ${d.state.vtp.mode.toUpperCase()}`, en: `VTP ${d.state.vtp.mode.toUpperCase()}` },
          { tr: `${d.id} üzerinde VTP ${d.state.vtp.mode} modunu yapılandırın.`, en: `Configure VTP ${d.state.vtp.mode} mode on ${d.id}.` },
          'command',
          { commandPattern: `vtp mode ${d.state.vtp.mode}` }
        );
      }
    });
  }

  // 6. CLI Commands from Notes
  const noteCommands = extractCliCommandsFromNotes(projectData.topology?.notes ?? []);
  noteCommands.forEach(cmd => {
    addDeviceTask('note-cmd',
      { tr: `Komut: ${cmd}`, en: `Command: ${cmd}` },
      { tr: `"${cmd}" komutunu çalıştırın.`, en: `Execute the command "${cmd}".` },
      'command',
      { commandPattern: cmd }
    );
  });

  // Smart weight balancing based on task complexity
  if (tasks.length > 0) {
    // Priority-based weight assignment
    // High priority (2x weight): routing, security, static routes, trunk
    // Medium priority (1.5x weight): VLAN, DHCP, DNS, port-security, VTP
    // Normal priority (1x weight): hostname, IP configs, connections, show commands, notes
    const highPriorityPatterns = [
      'ip route ', 'ip routing', 'router rip', 'router ospf',
      'static route', 'statik rota',
      'enable secret',
      'switchport mode trunk', 'trunk',
      'port-security', 'port security',
      'no switchport', 'routed port',
      'ip dhcp pool',
    ];
    const mediumPriorityPatterns = [
      ' vlan', 'VLAN',
      'switchport access vlan',
      'dhcp', 'DHCP',
      'dns-server', 'dns server', 'dns record', 'DNS',
      'vtp mode', 'VTP',
      'username', 'kullanıcı',
      'line con', 'line vty', 'console şifre', 'vty şifre',
      'ip host',
      'ip domain',
      'service dhcp',
      'ssh',
      'password-encryption', 'password encryption',
    ];

    let _highCount = 0, _mediumCount = 0, _normalCount = 0;

    tasks.forEach(t => {
      const text = `${t.title.tr} ${t.title.en} ${t.checkParams?.commandPattern || ''} ${t.checkParams?.configKey || ''}`;
      const isHigh = highPriorityPatterns.some(p => text.includes(p));
      const isMedium = mediumPriorityPatterns.some(p => text.includes(p));

      if (isHigh) { t.weight = 3; _highCount++; }
      else if (isMedium) { t.weight = 2; _mediumCount++; }
      else { t.weight = 1; _normalCount++; }
    });

    // Calculate total raw weight and scale to 100
    const rawTotal = tasks.reduce((sum, t) => sum + t.weight, 0);
    if (rawTotal > 0) {
      let assigned = 0;
      tasks.forEach((t, _i) => {
        const scaled = Math.round((t.weight / rawTotal) * 100);
        t.weight = scaled;
        assigned += scaled;
      });
      // Adjust remainder to reach exactly 100
      const diff = 100 - assigned;
      if (diff !== 0 && tasks.length > 0) {
        tasks[tasks.length - 1].weight += diff;
      }
      // Ensure no task has 0 weight
      tasks.forEach(t => { if (t.weight <= 0) t.weight = 1; });
      // Re-balance if needed after zero-fix
      const finalTotal = tasks.reduce((sum, t) => sum + t.weight, 0);
      if (finalTotal !== 100 && tasks.length > 0) {
        const finalDiff = 100 - finalTotal;
        tasks[tasks.length - 1].weight += finalDiff;
      }
    }
  }

  return {
    id: `exam-custom-${Date.now()}`,
    tag: isTr ? 'ÖZEL SINAV' : 'CUSTOM EXAM',
    title: isTr ? 'Dönüştürülmüş Sınav' : 'Converted Exam',
    description: isTr ? 'Otomatik olarak bir projeden dönüştürüldü' : 'Automatically converted from a project',
    level: 'intermediate',
    isExam: true,
    isCustom: true,
    tasks,
    durationMinutes: 30,
    difficulty: 'intermediate',
    data: projectData as unknown as import('./exampleProjects').ExampleProject['data']
  };
}





