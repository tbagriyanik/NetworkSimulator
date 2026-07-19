import { createSwitchDevice, createPcDevice, connectPorts, baseProjectData } from './helpers';
;
import type { ExampleProject } from './types';
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';

const example = (isTr: boolean): ExampleProject => {
  const servicesLabDevices = [
    createPcDevice('pc-dns', 'PC-DNS', 50, 100, '192.168.1.10', 1),
    createPcDevice('pc-http', 'PC-HTTP', 200, 100, '192.168.1.20', 1),
    createPcDevice('pc-dhcp', 'PC-DHCP', 350, 100, '192.168.1.30', 1),
    createPcDevice('pc-ftp', 'PC-FTP', 500, 100, '192.168.1.40', 1),
    createPcDevice('pc-mail', 'PC-MAIL', 650, 100, '192.168.1.50', 1),
    createPcDevice('pc-ntp', 'PC-NTP', 800, 100, '192.168.1.60', 1),
    createSwitchDevice('switch-1', 'SW1', 425, 300)
  ].map(dev => ({ ...dev, dns: '192.168.1.10' }));

  servicesLabDevices[0].services = {
    dns: {
      enabled: true,
      records: [
        { domain: 'www.lab.local', address: '192.168.1.20' },
        { domain: 'web.lab.local', address: '192.168.1.20' },
        { domain: 'ftp.lab.local', address: '192.168.1.40' },
        { domain: 'mail.lab.local', address: '192.168.1.50' }
      ]
    }
  };

  servicesLabDevices[1].services = {
    http: {
      enabled: true,
      content: isTr
        ? '<h1>Laboratuvar Web Sayfası</h1><p>HTTP servisi çalışıyor!</p>'
        : '<h1>Lab Web Page</h1><p>HTTP service is running!</p>',
    }
  };

  servicesLabDevices[2].services = {
    dhcp: {
      enabled: true,
      pools: [{
        poolName: 'LabPool',
        defaultGateway: '192.168.1.1',
        dnsServer: '192.168.1.10',
        startIp: '192.168.1.100',
        subnetMask: '255.255.255.0',
        maxUsers: 50
      }]
    }
  };

  servicesLabDevices[3].services = {
    ftp: {
      enabled: true,
      files: [
        { name: 'welcome.txt', size: 512, modifiedAt: new Date().toISOString() },
        { name: 'data.csv', size: 2048, modifiedAt: new Date().toISOString() }
      ]
    }
  };

  servicesLabDevices[4].services = {
    mail: {
      enabled: true,
      domain: 'lab.local',
      username: 'admin',
      password: 'password123',
      inbox: [],
      sent: []
    }
  };

  servicesLabDevices[5].services = {
    ntp: {
      enabled: true,
      server: 'local-clock',
      date: '2026-02-26',
      time: '10:00:00'
    }
  };

  const servicesLabConnections: CanvasConnection[] = [];
  connectPorts(servicesLabDevices, servicesLabConnections, 'pc-dns', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(servicesLabDevices, servicesLabConnections, 'pc-http', 'eth0', 'switch-1', 'fa0/2');
  connectPorts(servicesLabDevices, servicesLabConnections, 'pc-dhcp', 'eth0', 'switch-1', 'fa0/3');
  connectPorts(servicesLabDevices, servicesLabConnections, 'pc-ftp', 'eth0', 'switch-1', 'fa0/4');
  connectPorts(servicesLabDevices, servicesLabConnections, 'pc-mail', 'eth0', 'switch-1', 'fa0/5');
  connectPorts(servicesLabDevices, servicesLabConnections, 'pc-ntp', 'eth0', 'switch-1', 'fa0/6');

  const servicesLabNotes: CanvasNote[] = [
    {
      id: 'services-lab-note',
      text: isTr
        ? '🌐 Servisler Laboratuvarı:\n\nBu laboratuvarda 6 farklı ağ servisi PC\'ler üzerinde çalışmaktadır:\n\n1) DNS (1.10): www.lab.local, ftp.lab.local çözümlemesi yapar.\n2) HTTP (1.20): Web sunucusu.\n3) DHCP (1.30): 192.168.1.100+ aralığında IP dağıtır.\n4) FTP (1.40): Dosya paylaşım sunucusu.\n5) MAIL (1.50): E-posta sunucusu (admin@lab.local).\n6) NTP (1.60): Zaman sunucusu.\n\nTestler:\n• Bir PC terminalinde "nslookup www.lab.local"\n• "wget www.lab.local" ile web sayfasına bakın.\n• "ftp 192.168.1.40" ile dosya yüklemeyi (put) deneyin.\n• Switch üzerinde "ntp server 192.168.1.60" yapıp "show clock" ile zamanı kontrol edin.'
        : '🌐 Services Lab:\n\nIn this lab, 6 different network services are running on PCs:\n\n1) DNS (1.10): Resolves www.lab.local, ftp.lab.local.\n2) HTTP (1.20): Web server.\n3) DHCP (1.30): Distributes IPs in 192.168.1.100+ range.\n4) FTP (1.40): File sharing server.\n5) MAIL (1.50): Mail server (admin@lab.local).\n6) NTP (1.60): Time server.\n\nTests:\n• Run "nslookup www.lab.local" in a PC terminal.\n• Use "wget www.lab.local" to view the web page.\n• Use "ftp 192.168.1.40" to try file uploading (put).\n• On the Switch: "ntp server 192.168.1.60" then "show clock" to check time sync.',
      x: 50,
      y: 450,
      width: 600,
      height: 350,
      color: 'var(--color-primary-500)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  return {
    id: 'all-services-lab',
    tag: isTr ? 'SERVİSLER' : 'SERVICES',
    title: isTr ? 'Tüm Servisler Laboratuvarı (DNS, HTTP, FTP, MAIL, NTP, DHCP)' : 'All Services Lab (DNS, HTTP, FTP, MAIL, NTP, DHCP)',
    description: isTr
      ? 'PC\'ler üzerinde çalışan temel ağ servislerinin bir arada bulunduğu kapsamlı laboratuvar.'
      : 'A comprehensive lab featuring basic network services running on PCs.',
    detail: 'DNS: 1.10, HTTP: 1.20, DHCP: 1.30, FTP: 1.40, MAIL: 1.50, NTP: 1.60',
    level: 'intermediate',
    data: baseProjectData(servicesLabDevices, servicesLabConnections, servicesLabNotes, [])
  };
};

export default example;

