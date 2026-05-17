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
    id: 'exam-route-config-ip',
    title: { tr: 'Interface IP Yapılandırması', en: 'Interface IP Configuration' },
    description: { tr: 'R1 Gi0/0 portuna 192.168.1.1/24 IP adresini atayın ve aktif edin.', en: 'Assign 192.168.1.1/24 to R1 Gi0/0 and enable it.' },
    weight: 25,
    checkType: 'config',
    checkParams: { configKey: 'interfaces.gi0/0.ip', configValue: '192.168.1.1' },
    completed: false
  },
  {
    id: 'exam-route-static',
    title: { tr: 'Statik Rota', en: 'Static Route' },
    description: { tr: 'R1 üzerinde 10.0.0.0/24 ağına giden bir statik rota tanımlayın.', en: 'Define a static route to 10.0.0.0/24 network on R1.' },
    weight: 35,
    checkType: 'command',
    checkParams: { commandPattern: 'ip route 10.0.0.0 255.255.255.0' },
    completed: false
  },
  {
    id: 'exam-route-ping',
    title: { tr: 'Uçtan Uca Bağlantı', en: 'End-to-End Connectivity' },
    description: { tr: 'PC-1\'den PC-2\'ye (10.0.0.10) ping atın.', en: 'Ping from PC-1 to PC-2 (10.0.0.10).' },
    weight: 40,
    checkType: 'command',
    checkParams: { commandPattern: 'ping 10.0.0.10' },
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
    id: 'exam-l3-vlan-svi',
    title: { tr: 'VLAN ve SVI Yapılandırması', en: 'VLAN and SVI Configuration' },
    description: { tr: 'VLAN 20 oluşturun ve Interface VLAN 20\'ye 172.16.20.1/24 IP\'sini atayın.', en: 'Create VLAN 20 and assign 172.16.20.1/24 IP to Interface VLAN 20.' },
    weight: 40,
    checkType: 'config',
    checkParams: { configKey: 'interfaces.vlan20.ip', configValue: '172.16.20.1' },
    completed: false
  },
  {
    id: 'exam-l3-dhcp-pool',
    title: { tr: 'DHCP Havuzu', en: 'DHCP Pool' },
    description: { tr: 'L3 Switch üzerinde "MY-POOL" isminde bir DHCP havuzu oluşturun.', en: 'Create a DHCP pool named "MY-POOL" on L3 Switch.' },
    weight: 40,
    checkType: 'command',
    checkParams: { commandPattern: 'ip dhcp pool MY-POOL' },
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
        ? 'İki router arasındaki trafiği statik rotalar ile yönlendirmeniz beklenmektedir.'
        : 'You are expected to route traffic between two routers using static routes.',
      data: {
        version: '1.0',
        timestamp: new Date().toISOString(),
        devices: [],
        topology: {
          devices: [
            {
              id: 'r-1',
              type: 'router',
              name: 'R1',
              x: 300,
              y: 200,
              ip: '',
              status: 'online',
              ports: [
                { id: 'gi0/0', label: 'Gi0/0', status: 'disconnected' as const },
                { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const }
              ]
            },
            {
              id: 'pc-1',
              type: 'pc',
              name: 'PC-1',
              x: 100,
              y: 200,
              ip: '192.168.1.10',
              subnet: '255.255.255.0',
              gateway: '192.168.1.1',
              status: 'online',
              ports: [
                { id: 'eth0', label: 'Eth0', status: 'disconnected' as const }
              ]
            }
          ],
          connections: []
        },
        activeDeviceId: 'r-1',
        activeDeviceType: 'router'
      } as any,
      level: 'intermediate',
      isExam: true,
      tasks: routingBasicsExamTasks,
      durationMinutes: 20,
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
                }))
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
