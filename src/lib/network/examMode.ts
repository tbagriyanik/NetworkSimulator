import { ExampleProject } from './exampleProjects';

export interface ExamTask {
  id: string;
  title: { tr: string; en: string };
  description: { tr: string; en: string };
  weight: number;
  checkType: 'deviceAccess' | 'command' | 'config' | 'connection' | 'manual';
  checkParams?: {
    deviceType?: 'switch' | 'router' | 'pc';
    commandPattern?: string;
    configKey?: string;
    configValue?: any;
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
}

/**
 * Security utilities for Exam files
 * Obfuscates the JSON content to prevent students from reading task requirements
 */
const EXAM_KEY = 'SENTINEL_EXAM_SECURE_KEY_2024';

export function encryptExamData(data: any): string {
  const json = JSON.stringify(data);
  let result = '';
  for (let i = 0; i < json.length; i++) {
    result += String.fromCharCode(json.charCodeAt(i) ^ EXAM_KEY.charCodeAt(i % EXAM_KEY.length));
  }
  return btoa(encodeURIComponent(result));
}

export function decryptExamData(encrypted: string): any {
  try {
    const decoded = decodeURIComponent(atob(encrypted));
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ EXAM_KEY.charCodeAt(i % EXAM_KEY.length));
    }
    return JSON.parse(result);
  } catch (e) {
    console.error('Failed to decrypt exam data', e);
    return null;
  }
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
        topology: { devices: [], connections: [] },
        activeTab: 'topology'
      } as any,
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
              color: '#ef4444',
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
                { id: 'gi0/3', label: 'Gi0/3', status: 'disconnected' as const }
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
              color: '#ef4444',
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
      } as any,
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
        topology: {
          devices: [
            {
              id: 'l3-1',
              type: 'switchL3',
              name: 'L3-Switch',
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
                { id: 'gi1/1/4', label: 'Gi1/1/4', status: 'disconnected' as const }
              ]
            }
          ],
          connections: []
        },
        activeDeviceId: 'l3-1',
        activeDeviceType: 'switchL3'
      } as any,
      level: 'advanced',
      isExam: true,
      tasks: l3SwitchDhcpExamTasks,
      durationMinutes: 25,
      difficulty: 'advanced'
    }
  ];
};

/**
 * Automatically generates exam tasks from a project data object.
 * Analyzes connections, hostnames, IP configs, and VLANs.
 */
export function generateExamFromProject(projectData: any, language: 'tr' | 'en'): ExamProject {
  const isTr = language === 'tr';
  const tasks: ExamTask[] = [];

  const addDeviceTask = (deviceId: string, title: { tr: string; en: string }, desc: { tr: string; en: string }, type: ExamTask['checkType'], params: any) => {
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
    projectData.devices.forEach((d: any) => {
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

  // 2. Physical Connection Tasks
  if (projectData.topology?.connections?.length > 0) {
    projectData.topology.connections.forEach((conn: any) => {
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
          cableType: conn.cableType
        }
      );
    });
  }

  // 3. PC IP Configuration Tasks
  if (projectData.topology?.devices) {
    projectData.topology.devices.forEach((d: any) => {
      if (d.type === 'pc' && d.ip && d.ip !== '0.0.0.0') {
        addDeviceTask(d.id,
          { tr: `${d.name} IP Yapılandırması`, en: `${d.name} IP Configuration` },
          {
            tr: `${d.name} cihazına ${d.ip}/${d.subnet} IP adresini ve ${d.gateway || 'yok'} gateway değerini atayın.`,
            en: `Assign IP ${d.ip}/${d.subnet} and gateway ${d.gateway || 'none'} to ${d.name}.`
          },
          'config',
          { configKey: `pc.${d.id}.ip`, configValue: d.ip, subnetMask: d.subnet }
        );
      }
    });
  }

  // 4. VLAN & Interface Tasks (Simplified)
  if (Array.isArray(projectData.devices)) {
    projectData.devices.forEach((d: any) => {
      // VLANs
      if (d.state?.vlans) {
        Object.values(d.state.vlans).forEach((vlan: any) => {
          if (vlan.id > 1) {
            addDeviceTask(d.id,
              { tr: `VLAN ${vlan.id} Oluşturma`, en: `Create VLAN ${vlan.id}` },
              { tr: `${d.id} üzerinde VLAN ${vlan.id} (${vlan.name}) oluşturun.`, en: `Create VLAN ${vlan.id} (${vlan.name}) on ${d.id}.` },
              'command',
              { commandPattern: `vlan ${vlan.id}` }
            );
          }
        });
      }

      // Interface IPs (Router/L3 Switch)
      if (d.state?.ports) {
        Object.values(d.state.ports).forEach((p: any) => {
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
        });
      }
    });
  }

  // Equalize weights to sum up to 100
  if (tasks.length > 0) {
    const baseWeight = Math.floor(100 / tasks.length);
    tasks.forEach(t => t.weight = baseWeight);

    // Add remainder to the first task
    const total = tasks.reduce((sum, t) => sum + t.weight, 0);
    if (total < 100) {
      tasks[0].weight += (100 - total);
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
    data: projectData
  };
}
