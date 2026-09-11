import { ExampleProject } from './exampleProjects';
import { ExamProject } from './examTypes';
import {
  basicConnectivityExamTasks,
  routingBasicsExamTasks,
  l3SwitchDhcpExamTasks,
  vlanTrunkingExamTasks,
  basicAclExamTasks,
  comprehensiveFinalExamTasks
} from './examTasks';

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
              switchModel: 'NS-L2-24TT-L',
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
                ? '📝 TEMEL AĞ BİLGİSİ SINAVI\n\nŞu anda bir sınavdasınız. \nGörevleri tamamladıkça puanınız güncellenecektir.\nBaşarılar!\nAd, Soyad ve Numaranızı buraya yazınız:'
                : '📝 BASIC NETWORKING EXAM\n\nThis is an exam.\nYour score will be updated as you complete tasks.\nGood luck!\nWrite your name, surname, and student number here:',
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
                ? '📝 STATİK YÖNLENDİRME SINAVI\n\nKabloları ve IP yapılandırmalarını kendiniz yapmalısınız.\nGörevleri tamamladıkça puanınız güncellenir.\nBaşarılar!\nAd, Soyad ve Numaranızı buraya yazınız:'
                : '📝 STATIC ROUTING EXAM\n\nYou must make the cable connections and IP configurations yourself.\nYour score will be updated as you complete tasks.\nGood luck!\nName, Surname and Student Number:',
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
            {
              id: 'r-1', type: 'router', name: 'R1', ip: '', subnet: '', x: 500, y: 100, status: 'online', ports: [
                { id: 'console', label: 'Console', status: 'disconnected' },
                { id: 'gi0/0', label: 'Gi0/0', status: 'disconnected' },
                { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' },
                { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' },
                { id: 'gi0/3', label: 'Gi0/3', status: 'disconnected' },
                { id: 's0/0/0', label: 'S0/0/0', status: 'disconnected' },
                { id: 's0/1/0', label: 'S0/1/0', status: 'disconnected' },
                { id: 's0/2/0', label: 'S0/2/0', status: 'disconnected' },
                { id: 'wlan0', label: 'WLAN0', status: 'disconnected', wifi: { ssid: '', mode: 'ap', security: 'open', channel: '2.4GHz' } }
              ]
            },
            {
              id: 'ds-1', type: 'switchL3', name: 'DS1', ip: '', subnet: '', x: 500, y: 250, status: 'online', switchModel: 'NS-L3-24PS', ports: [
                ...Array.from({ length: 24 }, (_, i) => ({ id: `gi1/0/${i + 1}`, label: `Gi1/0/${i + 1}`, status: 'disconnected' as const })),
                { id: 'console', label: 'Console', status: 'disconnected' as const },
                { id: 'gi1/1/1', label: 'Gi1/1/1', status: 'disconnected' as const },
                { id: 'gi1/1/2', label: 'Gi1/1/2', status: 'disconnected' as const },
                { id: 'gi1/1/3', label: 'Gi1/1/3', status: 'disconnected' as const },
                { id: 'gi1/1/4', label: 'Gi1/1/4', status: 'disconnected' as const },
                { id: 'wlan0', label: 'WLAN0', status: 'disconnected' as const }
              ]
            },
            {
              id: 'as-1', type: 'switchL2', name: 'AS1', ip: '', subnet: '', x: 300, y: 400, status: 'online', switchModel: 'NS-L2-24TT-L', ports: [
                ...Array.from({ length: 24 }, (_, i) => ({ id: `fa0/${i + 1}`, label: `Fa0/${i + 1}`, status: 'disconnected' as const })),
                { id: 'console', label: 'Console', status: 'disconnected' as const },
                { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const },
                { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const }
              ]
            },
            { id: 'pc-1', type: 'pc', name: 'PC-1', x: 100, y: 400, status: 'online', ip: '', subnet: '', gateway: '', ports: [{ id: 'eth0', label: 'Eth0', status: 'disconnected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] },
            { id: 'iot-1', type: 'iot', name: 'IoT-1', x: 700, y: 100, status: 'online', ip: '', wifi: { enabled: true, ssid: '', mode: 'client', security: 'open', channel: '2.4GHz' }, ports: [{ id: 'wlan0', label: 'WLAN0', status: 'disconnected' as const, wifi: { ssid: '', security: 'open', channel: '2.4GHz', mode: 'client' } }] },
            {
              id: 'fw-1', type: 'firewall', name: 'FW-1', x: 750, y: 250, status: 'online', ip: '', subnet: '', ports: [
                { id: 'gi0/0', label: 'Gi0/0', status: 'disconnected' as const },
                { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const }
              ]
            },
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