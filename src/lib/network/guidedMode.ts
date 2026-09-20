// Rehberli Ders (Guided Lesson) - Adım adım öğrenme sistemi
import { generateSwitchPorts, generateL3SwitchPorts, generateRouterPorts } from '@/components/network/networkTopology.portGenerators';

import type { GuidedStep, GuidedProject } from './guidedMode.types';
import {
  addDeviceGuidedSteps,
  pcCmdGuidedSteps,
  cliBasicsGuidedSteps,
  basicSwitchGuidedSteps,
  basicLanGuidedSteps,
  vlanGuidedSteps,
  routerDhcpGuidedSteps,
  staticRoutingGuidedSteps,
  portSecurityGuidedSteps,
  ripRoutingGuidedSteps,
  servicesGuidedSteps,
  sohoGuidedSteps,
  campusGuidedSteps,
  hospitalGuidedSteps,
  ecommerceGuidedSteps,
  teachMeBeginnerSteps,
  teachMeIntermediateSteps,
  teachMeAdvancedSteps,
  cliGuidedLessons,
} from './lessonSteps';
export type { GuidedStep, GuidedProject };
export {
  addDeviceGuidedSteps,
  pcCmdGuidedSteps,
  cliBasicsGuidedSteps,
  basicSwitchGuidedSteps,
  basicLanGuidedSteps,
  vlanGuidedSteps,
  routerDhcpGuidedSteps,
  staticRoutingGuidedSteps,
  portSecurityGuidedSteps,
  ripRoutingGuidedSteps,
  servicesGuidedSteps,
  sohoGuidedSteps,
  campusGuidedSteps,
  hospitalGuidedSteps,
  ecommerceGuidedSteps,
  teachMeBeginnerSteps,
  teachMeIntermediateSteps,
  teachMeAdvancedSteps,
  cliGuidedLessons,
};

// Rehberli projeleri oluştur
export const getGuidedProjects = (language: 'tr' | 'en'): GuidedProject[] => {
  const isTr = language === 'tr';

  const projects: GuidedProject[] = [
    {
      id: 'teach-me-beginner',
      tag: isTr ? 'BANA ÖĞRET' : 'TEACH ME',
      title: isTr ? 'Bana Öğret: Temel Seviye' : 'Teach Me: Beginner',
      description: isTr ? 'Temel ağ cihazı etkileşimleri ve komut satırı girişi' : 'Basic network device interactions and command line entry',
      detail: isTr ? 'Sıfırdan ipconfig, enable, configure terminal komutlarını uygulamalı olarak öğrenin.' : 'Learn ipconfig, enable, configure terminal commands practically from scratch.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'pc-1', type: 'pc', name: 'PC1', x: 100, y: 200, ip: '192.168.1.10', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] },
            { id: 'switch-1', type: 'switchL2', name: 'SW1', x: 300, y: 200, ip: '', status: 'online', ports: generateSwitchPorts() }
          ],
          connections: [{ id: 'c1', sourceDeviceId: 'pc-1', sourcePort: 'eth0', targetDeviceId: 'switch-1', targetPort: 'fa0/1', cableType: 'straight', active: true }],
          notes: []
        },
        cableInfo: { connected: true, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'pc-1', activeDeviceType: 'pc', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'basic', isGuided: true, steps: teachMeBeginnerSteps, estimatedTimeMinutes: 10, difficulty: 'beginner',
      totalPoints: teachMeBeginnerSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'teach-me-intermediate',
      tag: isTr ? 'BANA ÖĞRET' : 'TEACH ME',
      title: isTr ? 'Bana Öğret: Orta Seviye' : 'Teach Me: Intermediate',
      description: isTr ? 'Router temel ayarları ve arayüz yapılandırması' : 'Router basic settings and interface configuration',
      detail: isTr ? 'Router arayüzlerine IP atama ve arayüzü aktif hale getirme (no shutdown).' : 'Assigning IPs to Router interfaces and activating the interface (no shutdown).',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'router-1', type: 'router', name: 'R1', x: 300, y: 200, ip: '', status: 'online', ports: generateRouterPorts() }
          ],
          connections: [],
          notes: []
        },
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'router' },
        activeDeviceId: 'router-1', activeDeviceType: 'router', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'intermediate', isGuided: true, steps: teachMeIntermediateSteps, estimatedTimeMinutes: 15, difficulty: 'intermediate',
      totalPoints: teachMeIntermediateSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'teach-me-advanced',
      tag: isTr ? 'BANA ÖĞRET' : 'TEACH ME',
      title: isTr ? 'Bana Öğret: İleri Seviye' : 'Teach Me: Advanced',
      description: isTr ? 'OSPF yapılandırması ve Güvenlik Listeleri (ACL)' : 'OSPF configuration and Access Control Lists (ACL)',
      detail: isTr ? 'OSPF dinamik yönlendirme protokolünü yapılandırın ve standart ACL yazın.' : 'Configure OSPF dynamic routing protocol and write standard ACL.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'router-1', type: 'router', name: 'R1', x: 300, y: 200, ip: '', status: 'online', ports: generateRouterPorts() }
          ],
          connections: [],
          notes: []
        },
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'router' },
        activeDeviceId: 'router-1', activeDeviceType: 'router', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'advanced', isGuided: true, steps: teachMeAdvancedSteps, estimatedTimeMinutes: 20, difficulty: 'advanced',
      totalPoints: teachMeAdvancedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-add-devices',
      tag: isTr ? 'BAŞLANGIÇ' : 'BEGINNER',
      title: isTr ? 'Cihaz Ekleme ve Bağlantı' : 'Adding Devices & Connection',
      description: isTr ? 'Topolojiye cihaz eklemeyi ve kablo bağlamayı öğrenin' : 'Learn how to add devices and connect cables',
      detail: isTr ? 'Sürükle-bırak cihaz ekleme ve temel ağ bağlantısı.' : 'Drag-drop device addition and basic network connection.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: { devices: [], connections: [], notes: [] },
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: '', activeDeviceType: 'pc', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'basic', isGuided: true, steps: addDeviceGuidedSteps, estimatedTimeMinutes: 5, difficulty: 'beginner',
      totalPoints: addDeviceGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-pc-cmd',
      tag: 'CMD',
      title: isTr ? 'PC CMD Komutları' : 'PC CMD Commands',
      description: isTr ? 'PC terminalini ve temel komutları keşfedin' : 'Explore PC terminal and basic commands',
      detail: isTr ? 'ipconfig, ping ve help komutlarının kullanımı.' : 'Using ipconfig, ping, and help commands.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'pc-1', type: 'pc', name: 'PC-1', x: 100, y: 100, ip: '192.168.1.10', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'disconnected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] }
          ],
          connections: [], notes: []
        },
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'pc-1', activeDeviceType: 'pc', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'basic', isGuided: true, steps: pcCmdGuidedSteps, estimatedTimeMinutes: 5, difficulty: 'beginner',
      totalPoints: pcCmdGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-cli-basics',
      tag: 'CLI',
      title: isTr ? 'CLI Temelleri' : 'CLI Basics',
      description: isTr ? 'NOS komut satırına giriş yapın' : 'Introduction to NOS command line',
      detail: isTr ? 'Enable ve Global Config modlarına geçiş.' : 'Switching to Enable and Global Config modes.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'switch-1', type: 'switchL2', name: 'SW-1', x: 100, y: 100, ip: '', status: 'online', ports: generateSwitchPorts() }
          ],
          connections: [], notes: []
        },
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'switch-1', activeDeviceType: 'switchL2', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'basic', isGuided: true, steps: cliBasicsGuidedSteps, estimatedTimeMinutes: 5, difficulty: 'beginner',
      totalPoints: cliBasicsGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-basic-switch',
      tag: isTr ? 'Temel' : 'Basic',
      title: isTr ? 'Temel Switch Yapılandırma' : 'Basic Switch Configuration',
      description: isTr ? 'Switch hostname, port aktifleştirme ve kaydetme' : 'Switch hostname, port activation and saving',
      detail: isTr ? 'Enable/Config modları, hostname ve no shutdown komutları.' : 'Enable/Config modes, hostname and no shutdown commands.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'switch-1', type: 'switchL2', name: 'Switch-1', x: 300, y: 200, ip: '', status: 'online', ports: generateSwitchPorts() },
            { id: 'pc-1', type: 'pc', name: 'PC-1', x: 100, y: 200, ip: '', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'disconnected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] }
          ],
          connections: [], notes: []
        },
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'switch-1', activeDeviceType: 'switchL2', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'basic', isGuided: true, steps: basicSwitchGuidedSteps, estimatedTimeMinutes: 10, difficulty: 'beginner',
      totalPoints: basicSwitchGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-basic-lan',
      tag: 'LAN',
      title: isTr ? 'Temel LAN Kurulumu' : 'Basic LAN Setup',
      description: isTr ? 'İki bilgisayarlı ağ kurma ve ping testi' : 'Set up two-PC network and ping test',
      detail: isTr ? 'IP atama, kablolama ve bağlantı kontrolü.' : 'IP assignment, cabling and connectivity check.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'switch-1', type: 'switchL2', name: 'Switch', x: 400, y: 200, ip: '', status: 'online', ports: generateSwitchPorts() },
            { id: 'pc-1', type: 'pc', name: 'PC0', x: 150, y: 100, ip: '', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'disconnected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] },
            { id: 'pc-2', type: 'pc', name: 'PC1', x: 150, y: 300, ip: '', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'disconnected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] }
          ],
          connections: [], notes: []
        },
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'switch-1', activeDeviceType: 'switchL2', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'basic', isGuided: true, steps: basicLanGuidedSteps, estimatedTimeMinutes: 15, difficulty: 'beginner',
      totalPoints: basicLanGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-vlan-lab',
      tag: 'VLAN',
      title: isTr ? 'VLAN Yapılandırma' : 'VLAN Configuration',
      description: isTr ? 'VLAN oluşturma ve port atama' : 'VLAN creation and port assignment',
      detail: isTr ? 'Sanal ağlar oluşturma ve mantıksal gruplandırma.' : 'Creating virtual networks and logical grouping.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [{ id: 'switch-1', type: 'switchL2', name: 'Switch-1', x: 300, y: 200, ip: '', status: 'online', ports: generateSwitchPorts() }],
          connections: [], notes: []
        },
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'switch-1', activeDeviceType: 'switchL2', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'intermediate', isGuided: true, steps: vlanGuidedSteps, estimatedTimeMinutes: 15, difficulty: 'intermediate',
      totalPoints: vlanGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-router-dhcp',
      tag: 'DHCP',
      title: isTr ? 'Router DHCP Yapılandırma' : 'Router DHCP Configuration',
      description: isTr ? 'Otomatik IP dağıtımı için DHCP havuzu' : 'DHCP pool for automatic IP distribution',
      detail: isTr ? 'Router arayüzü ve DHCP servis ayarları.' : 'Router interface and DHCP service settings.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'router-1', type: 'router', name: 'R1', x: 400, y: 200, ip: '', status: 'online', ports: generateRouterPorts() },
            { id: 'pc-1', type: 'pc', name: 'PC1', x: 150, y: 200, ip: '', status: 'online', ipConfigMode: 'dhcp', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] }
          ],
          connections: [{ id: 'c1', sourceDeviceId: 'pc-1', sourcePort: 'eth0', targetDeviceId: 'router-1', targetPort: 'gi0/0', cableType: 'crossover', active: true }],
          notes: []
        },
        cableInfo: { connected: true, cableType: 'crossover', sourceDevice: 'pc', targetDevice: 'router' },
        activeDeviceId: 'router-1', activeDeviceType: 'router', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'intermediate', isGuided: true, steps: routerDhcpGuidedSteps, estimatedTimeMinutes: 10, difficulty: 'intermediate',
      totalPoints: routerDhcpGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-static-routing',
      tag: 'ROUTING',
      title: isTr ? 'Statik Yönlendirme Lab' : 'Static Routing Lab',
      description: isTr ? 'Manuel rotalar ile ağ birleştirme' : 'Connecting networks with manual routes',
      detail: isTr ? 'Routerlar arası iletişim ve ip route komutu.' : 'Inter-router communication and ip route command.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'router-1', type: 'router', name: 'R1', x: 300, y: 200, ip: '', status: 'online', ports: [{ id: 'console', label: 'Console', status: 'disconnected' as const }, { id: 'gi0/0', label: 'Gi0/0', ipAddress: '10.0.0.1', subnetMask: '255.255.255.0', status: 'connected' as const }, { id: 'gi0/1', label: 'Gi0/1', ipAddress: '192.168.1.1', subnetMask: '255.255.255.0', status: 'connected' as const }, { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const }, { id: 'gi0/3', label: 'Gi0/3', status: 'disconnected' as const }, { id: 's0/0/0', label: 'S0/0/0', status: 'disconnected' as const }, { id: 's0/1/0', label: 'S0/1/0', status: 'disconnected' as const }, { id: 's0/2/0', label: 'S0/2/0', status: 'disconnected' as const }, { id: 'wlan0', label: 'WLAN0', status: 'disconnected' as const }] },
            { id: 'router-2', type: 'router', name: 'R2', x: 600, y: 200, ip: '', status: 'online', ports: [{ id: 'console', label: 'Console', status: 'disconnected' as const }, { id: 'gi0/0', label: 'Gi0/0', ipAddress: '10.0.0.2', subnetMask: '255.255.255.0', status: 'connected' as const }, { id: 'gi0/1', label: 'Gi0/1', ipAddress: '192.168.2.1', subnetMask: '255.255.255.0', status: 'connected' as const }, { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const }, { id: 'gi0/3', label: 'Gi0/3', status: 'disconnected' as const }, { id: 's0/0/0', label: 'S0/0/0', status: 'disconnected' as const }, { id: 's0/1/0', label: 'S0/1/0', status: 'disconnected' as const }, { id: 's0/2/0', label: 'S0/2/0', status: 'disconnected' as const }, { id: 'wlan0', label: 'WLAN0', status: 'disconnected' as const }] },
            { id: 'pc-1', type: 'pc', name: 'PC1', x: 100, y: 200, ip: '192.168.1.10', subnet: '255.255.255.0', gateway: '192.168.1.1', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] },
            { id: 'pc-2', type: 'pc', name: 'PC2', x: 800, y: 200, ip: '192.168.2.10', subnet: '255.255.255.0', gateway: '192.168.2.1', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] }
          ],
          connections: [
            { id: 'c1', sourceDeviceId: 'pc-1', sourcePort: 'eth0', targetDeviceId: 'router-1', targetPort: 'gi0/1', cableType: 'crossover', active: true },
            { id: 'c2', sourceDeviceId: 'router-1', sourcePort: 'gi0/0', targetDeviceId: 'router-2', targetPort: 'gi0/0', cableType: 'crossover', active: true },
            { id: 'c3', sourceDeviceId: 'router-2', sourcePort: 'gi0/1', targetDeviceId: 'pc-2', targetPort: 'eth0', cableType: 'crossover', active: true }
          ],
          notes: []
        },
        cableInfo: { connected: true, cableType: 'crossover', sourceDevice: 'pc', targetDevice: 'router' },
        activeDeviceId: 'router-1', activeDeviceType: 'router', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'advanced', isGuided: true, steps: staticRoutingGuidedSteps, estimatedTimeMinutes: 15, difficulty: 'advanced',
      totalPoints: staticRoutingGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-port-security',
      tag: 'SECURITY',
      title: isTr ? 'Port Güvenliği (Port-Sec)' : 'Port Security Lab',
      description: isTr ? 'MAC sınırı ve ihlal eylemleri' : 'MAC limits and violation actions',
      detail: isTr ? 'Switch portlarını koruma altına alma.' : 'Protecting switch ports.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [{ id: 'switch-1', type: 'switchL2', name: 'SW-Sec', x: 300, y: 200, ip: '', status: 'online', ports: generateSwitchPorts() }],
          connections: [], notes: []
        },
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'switch-1', activeDeviceType: 'switchL2', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'intermediate', isGuided: true, steps: portSecurityGuidedSteps, estimatedTimeMinutes: 10, difficulty: 'intermediate',
      totalPoints: portSecurityGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-rip-routing',
      tag: 'RIP',
      title: isTr ? 'RIP Dinamik Yönlendirme' : 'RIP Dynamic Routing',
      description: isTr ? 'Otomatik rota paylaşımı' : 'Automated route sharing',
      detail: isTr ? 'Dinamik yönlendirme temelleri.' : 'Dynamic routing basics.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [{ id: 'router-1', type: 'router', name: 'R1', x: 300, y: 200, ip: '', status: 'online', ports: generateRouterPorts() }],
          connections: [], notes: []
        },
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'router' },
        activeDeviceId: 'router-1', activeDeviceType: 'router', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'intermediate', isGuided: true, steps: ripRoutingGuidedSteps, estimatedTimeMinutes: 10, difficulty: 'intermediate',
      totalPoints: ripRoutingGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-services',
      tag: 'SERVICES',
      title: isTr ? 'DNS ve HTTP Servisleri' : 'DNS & HTTP Services',
      description: isTr ? 'Web sunucu ve isim çözümleme' : 'Web server and name resolution',
      detail: isTr ? 'Servis kurulumu ve istemci testi.' : 'Service setup and client testing.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'server-1', type: 'pc', name: 'Server-Web', x: 400, y: 100, ip: '192.168.1.10', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] },
            { id: 'dns-server-1', type: 'pc', name: 'DNS-Server', x: 600, y: 100, ip: '192.168.1.5', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] },
            { id: 'pc-1', type: 'pc', name: 'PC1', x: 100, y: 300, ip: '192.168.1.20', dns: '192.168.1.5', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] },
            { id: 'sw-1', type: 'switchL2', name: 'SW1', x: 400, y: 250, ip: '', status: 'online', ports: generateSwitchPorts() }
          ],
          connections: [
            { id: 'c1', sourceDeviceId: 'pc-1', sourcePort: 'eth0', targetDeviceId: 'sw-1', targetPort: 'fa0/1', cableType: 'straight', active: true },
            { id: 'c2', sourceDeviceId: 'server-1', sourcePort: 'eth0', targetDeviceId: 'sw-1', targetPort: 'fa0/2', cableType: 'straight', active: true },
            { id: 'c3', sourceDeviceId: 'dns-server-1', sourcePort: 'eth0', targetDeviceId: 'sw-1', targetPort: 'fa0/3', cableType: 'straight', active: true }
          ],
          notes: []
        },
        cableInfo: { connected: true, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'pc-1', activeDeviceType: 'pc', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'intermediate', isGuided: true, steps: servicesGuidedSteps, estimatedTimeMinutes: 15, difficulty: 'intermediate',
      totalPoints: servicesGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-soho-scenario',
      tag: isTr ? 'SEKTÖREL' : 'INDUSTRY',
      title: isTr ? 'SOHO Ofis Ağ Kurulumu' : 'SOHO Office Network Setup',
      description: isTr ? 'Küçük bir ofis için kablolu ve kablosuz ağ altyapısını sıfırdan kurun' : 'Set up wired and wireless network infrastructure from scratch for a small office',
      detail: isTr ? 'Yönlendirme, DHCP ve WiFi konfigürasyonlarını içeren gerçek dünya senaryosu.' : 'Real-world scenario including routing, DHCP, and WiFi configurations.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'router-1', type: 'router', name: 'Router-1', x: 400, y: 100, ip: '', status: 'online', wifi: { enabled: true, mode: 'ap', ssid: 'Office-Wifi', security: 'open', channel: '6' }, ports: generateRouterPorts() },
            { id: 'switch-1', type: 'switchL2', name: 'Switch-1', x: 400, y: 250, ip: '', status: 'online', ports: generateSwitchPorts() },
            { id: 'pc-1', type: 'pc', name: 'Ofis-PC', x: 200, y: 350, ip: '192.168.1.10', subnet: '255.255.255.0', gateway: '192.168.1.1', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'disconnected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] },
            { id: 'pc-2', type: 'pc', name: 'Laptop', x: 600, y: 350, ip: '', ipConfigMode: 'dhcp', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'disconnected' as const }, { id: 'wlan0', label: 'WLAN0', status: 'disconnected' as const }] }
          ],
          connections: [], notes: []
        },
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'router-1', activeDeviceType: 'router', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'intermediate', isGuided: true, steps: sohoGuidedSteps, estimatedTimeMinutes: 15, difficulty: 'intermediate',
      totalPoints: sohoGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-campus-scenario',
      tag: isTr ? 'SEKTÖREL' : 'INDUSTRY',
      title: isTr ? 'Okul Kampüs Ağı' : 'School Campus Network',
      description: isTr ? 'VLAN segmentasyonu ile okul ağını güvenli hale getirin' : 'Secure the school network with VLAN segmentation',
      detail: isTr ? 'İdari, öğrenci ve misafir birimlerini VLAN\'larla ayırma ve Router-on-a-Stick yapılandırması.' : 'Separating admin, student, and guest units with VLANs and configuring Router-on-a-Stick.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'router-1', type: 'router', name: 'R1-Core', x: 400, y: 100, ip: '', status: 'online', ports: generateRouterPorts() },
            { id: 'switch-1', type: 'switchL2', name: 'SW-Main', x: 400, y: 250, ip: '', status: 'online', ports: generateSwitchPorts() },
            { id: 'pc-1', type: 'pc', name: 'Admin-PC', x: 150, y: 350, ip: '192.168.10.10', subnet: '255.255.255.0', gateway: '192.168.10.1', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] },
            { id: 'pc-2', type: 'pc', name: 'Student-PC', x: 400, y: 400, ip: '192.168.20.10', subnet: '255.255.255.0', gateway: '192.168.20.1', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] },
            { id: 'pc-3', type: 'pc', name: 'Guest-WiFi', x: 650, y: 350, ip: '192.168.30.10', subnet: '255.255.255.0', gateway: '192.168.30.1', status: 'online', ports: [{ id: 'wlan0', label: 'WLAN0', status: 'connected' as const }] }
          ],
          connections: [
            { id: 'c1', sourceDeviceId: 'pc-1', sourcePort: 'eth0', targetDeviceId: 'switch-1', targetPort: 'fa0/1', cableType: 'straight', active: true },
            { id: 'c2', sourceDeviceId: 'pc-2', sourcePort: 'eth0', targetDeviceId: 'switch-1', targetPort: 'fa0/2', cableType: 'straight', active: true },
            { id: 'c3', sourceDeviceId: 'switch-1', sourcePort: 'gi0/1', targetDeviceId: 'router-1', targetPort: 'gi0/0', cableType: 'crossover', active: true }
          ],
          notes: []
        },
        cableInfo: { connected: true, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'switch-1', activeDeviceType: 'switchL2', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'advanced', isGuided: true, steps: campusGuidedSteps, estimatedTimeMinutes: 20, difficulty: 'advanced',
      totalPoints: campusGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-hospital-scenario',
      tag: isTr ? 'SEKTÖREL' : 'INDUSTRY',
      title: isTr ? 'Hastane Ağ Altyapısı' : 'Hospital Network Infrastructure',
      description: isTr ? 'Yüksek güvenlikli segmentasyon ile hastane ağı oluşturun' : 'Create a hospital network with high-security segmentation',
      detail: isTr ? 'Hasta verilerinin güvenliği, tıbbi cihaz izolasyonu ve ACL kısıtlamaları.' : 'Security of patient data, medical device isolation, and ACL restrictions.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'router-1', type: 'router', name: 'R1-Edge', x: 400, y: 100, ip: '', status: 'online', ports: generateRouterPorts() },
            { id: 'switch-1', type: 'switchL2', name: 'SW-Hosp', x: 400, y: 250, ip: '', status: 'online', ports: generateSwitchPorts() },
            { id: 'pc-1', type: 'pc', name: 'Nurse-PC', x: 150, y: 350, ip: '192.168.100.20', subnet: '255.255.255.0', gateway: '192.168.100.1', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] },
            { id: 'server-1', type: 'pc', name: 'Records-Server', x: 400, y: 400, ip: '192.168.100.10', subnet: '255.255.255.0', gateway: '192.168.100.1', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] },
            { id: 'iot-1', type: 'iot', name: 'Ekg-Device', x: 650, y: 350, ip: '192.168.200.10', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] }
          ],
          connections: [
            { id: 'c1', sourceDeviceId: 'pc-1', sourcePort: 'eth0', targetDeviceId: 'switch-1', targetPort: 'fa0/1', cableType: 'straight', active: true },
            { id: 'c2', sourceDeviceId: 'server-1', sourcePort: 'eth0', targetDeviceId: 'switch-1', targetPort: 'fa0/10', cableType: 'straight', active: true },
            { id: 'c3', sourceDeviceId: 'iot-1', sourcePort: 'eth0', targetDeviceId: 'switch-1', targetPort: 'fa0/20', cableType: 'straight', active: true },
            { id: 'c4', sourceDeviceId: 'switch-1', sourcePort: 'gi0/1', targetDeviceId: 'router-1', targetPort: 'gi0/0', cableType: 'crossover', active: true }
          ],
          notes: []
        },
        cableInfo: { connected: true, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'switch-1', activeDeviceType: 'switchL2', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'advanced', isGuided: true, steps: hospitalGuidedSteps, estimatedTimeMinutes: 20, difficulty: 'advanced',
      totalPoints: hospitalGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-ecommerce-scenario',
      tag: isTr ? 'SEKTÖREL' : 'INDUSTRY',
      title: isTr ? 'E-Ticaret Şirket Ağı' : 'E-Commerce Company Network',
      description: isTr ? 'DMZ ve güvenlik odaklı bir kurumsal ağ tasarlayın' : 'Design a corporate network focused on DMZ and security',
      detail: isTr ? 'Dış dünyaya açık sunucuların (DMZ) izolasyonu, Static NAT ve gelişmiş ACL kuralları.' : 'Isolation of publicly accessible servers (DMZ), Static NAT, and advanced ACL rules.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            {
              id: 'router-1', type: 'router', name: 'R1-Gateway', x: 400, y: 100, ip: '', status: 'online',
              ports: generateRouterPorts().map(p => {
                if (p.id === 'gi0/0') return { ...p, ipAddress: '203.0.113.1', subnetMask: '255.255.255.0', status: 'connected' as const, shutdown: false };
                if (p.id === 'gi0/1') return { ...p, ipAddress: '172.16.50.1', subnetMask: '255.255.255.0', status: 'connected' as const, shutdown: false };
                return p;
              })
            },
            { id: 'switch-1', type: 'switchL2', name: 'SW-Core', x: 400, y: 250, ip: '', status: 'online', ports: generateSwitchPorts() },
            { id: 'pc-1', type: 'pc', name: 'Office-PC', x: 150, y: 350, ip: '172.16.50.20', subnet: '255.255.255.0', gateway: '172.16.50.1', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] },
            { id: 'server-1', type: 'pc', name: 'Web-Server', x: 400, y: 400, ip: '172.16.50.10', subnet: '255.255.255.0', gateway: '172.16.50.1', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] },
            { id: 'pc-2', type: 'pc', name: 'Internet-Client', x: 700, y: 100, ip: '203.0.113.100', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] }
          ],
          connections: [
            { id: 'c1', sourceDeviceId: 'pc-1', sourcePort: 'eth0', targetDeviceId: 'switch-1', targetPort: 'fa0/1', cableType: 'straight', active: true },
            { id: 'c2', sourceDeviceId: 'server-1', sourcePort: 'eth0', targetDeviceId: 'switch-1', targetPort: 'fa0/10', cableType: 'straight', active: true },
            { id: 'c3', sourceDeviceId: 'switch-1', sourcePort: 'gi0/1', targetDeviceId: 'router-1', targetPort: 'gi0/1', cableType: 'crossover', active: true },
            { id: 'c4', sourceDeviceId: 'router-1', sourcePort: 'gi0/0', targetDeviceId: 'pc-2', targetPort: 'eth0', cableType: 'crossover', active: true }
          ],
          notes: []
        },
        cableInfo: { connected: true, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'router-1', activeDeviceType: 'router', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'advanced', isGuided: true, steps: ecommerceGuidedSteps, estimatedTimeMinutes: 25, difficulty: 'advanced',
      totalPoints: ecommerceGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-cli-lessons',
      tag: 'CLI',
      title: isTr ? 'Kapsamlı Rehberli Dersler' : 'Comprehensive Guided Lessons',
      description: isTr ? 'Tüm CLI komutlarının pratik uygulaması' : 'Practical application of all CLI commands',
      detail: isTr ? 'Çok aşamalı kapsamlı CLI eğitimi: Temel moddan ileri konulara kadar.' : 'Multi-step comprehensive CLI training: From basic mode to advanced topics.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'switch-1', type: 'switchL3', name: 'SW-Lab', switchModel: 'NS-L3-24PS', x: 300, y: 200, ip: '', status: 'online', ports: generateL3SwitchPorts() },
            { id: 'router-1', type: 'router', name: 'R-Lab', x: 600, y: 200, ip: '', status: 'online', ports: generateRouterPorts() },
            { id: 'pc-1', type: 'pc', name: 'PC-Lab', x: 100, y: 200, ip: '192.168.1.10', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] }
          ],
          connections: [
            { id: 'c1', sourceDeviceId: 'pc-1', sourcePort: 'eth0', targetDeviceId: 'switch-1', targetPort: 'gi1/0/1', cableType: 'straight', active: true },
            { id: 'c2', sourceDeviceId: 'switch-1', sourcePort: 'gi1/0/24', targetDeviceId: 'router-1', targetPort: 'gi0/0', cableType: 'crossover', active: true }
          ],
          notes: []
        },
        cableInfo: { connected: true, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL3' },
        activeDeviceId: 'switch-1', activeDeviceType: 'switchL3', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'advanced', isGuided: true, steps: cliGuidedLessons, estimatedTimeMinutes: 240, difficulty: 'intermediate',
      totalPoints: cliGuidedLessons.reduce((acc, s) => acc + (s.points || 0), 0)
    }
  ];

  // Recommended display order: original lessons 4, 5, then 6.
  const priority = ['guided-add-devices', 'guided-pc-cmd', 'guided-cli-basics'];
  return [
    ...priority.map((id) => projects.find((project) => project.id === id)).filter((project): project is GuidedProject => Boolean(project)),
    ...projects.filter((project) => !priority.includes(project.id)),
  ];
};

// Key'i karakter kodları şeklinde tutarak daha zor okunur hale getiriyoruz
// ⚠️ NOT: Bu yalnızca rastgele değişiklikleri yakalamak içindir, güvenlik özelliği değildir.
// ⚠️ NOTE: This only catches accidental changes, NOT a security feature.
const GUIDED_KEY_BYTES = Uint8Array.from([
  71, 85, 73, 68, 69, 68, 95, 77, 79, 68, 69, 95, 83, 69, 67, 85, 82, 73, 84, 89, 95, 75, 69, 89, 95, 50, 48, 50, 54, 95, 83, 85, 80, 69, 82, 83, 69, 67, 85, 82, 69, 68
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
    // Dynamic rolling position shift to prevent repeating key patterns and frequency analysis
    const keyByte = key[i % key.length];
    const shift = (i * 17) % 256;
    result[i] = data[i] ^ keyByte ^ shift;
  }
  return result;
}

/**
 * Generate integrity hash for guided project
 * Detects accidental changes to critical fields.
 * ⚠️ DISCLAIMER: This uses a client-side fixed XOR key and is NOT
 * cryptographically secure. It catches accidental data corruption or
 * unintended modifications, but does NOT protect against intentional
 * tampering by a determined user with browser DevTools access.
 */
export function generateGuidedIntegrityHash(project: GuidedProject): string {
  const criticalData = {
    id: project.id,
    estimatedTimeMinutes: project.estimatedTimeMinutes,
    steps: project.steps.map(s => ({
      id: s.id,
      points: s.points,
      completed: s.completed,
      completedAt: s.completedAt ? s.completedAt.getTime() : null
    })),
    startedAt: project.startedAt ? project.startedAt.getTime() : null,
    totalPoints: project.totalPoints
  };

  const json = JSON.stringify(criticalData);
  const bytes = stringToUint8Array(json);
  const xored = xorBytes(bytes, GUIDED_KEY_BYTES);
  return uint8ArrayToHex(xored);
}

/**
 * Verify if guided project integrity is intact
 * Returns true if no accidental corruption detected.
 * ⚠️ See generateGuidedIntegrityHash disclaimer — this is NOT tamper-proof.
 */
export function verifyGuidedIntegrity(project: GuidedProject): boolean {
  if (!project.integrityHash) return false;

  // Create a copy without the integrityHash to generate the hash
  const projectCopy = { ...project, integrityHash: undefined };
  const generatedHash = generateGuidedIntegrityHash(projectCopy as GuidedProject);

  return generatedHash === project.integrityHash;
}

export {
  checkStepCompletion,
  getNextIncompleteStep,
  getCompletedStepsCount,
  getProgressPercentage,
} from './guidedModeVerifier';







