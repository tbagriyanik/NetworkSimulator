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

export const getExamProjects = (language: 'tr' | 'en'): ExamProject[] => {
  const isTr = language === 'tr';

  return [
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
                ? '📝 TEMEL AĞ BİLGİSİ SINAVI\n\nBu bir sınavdır. İpucu veya yardım sunulmaz.\nGörevleri tamamladıkça puanınız güncellenecektir.\n\nBaşarılar!'
                : '📝 BASIC NETWORKING EXAM\n\nThis is an exam. No hints or help are provided.\nYour score will be updated as you complete tasks.\n\nGood luck!',
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
    }
  ];
};
