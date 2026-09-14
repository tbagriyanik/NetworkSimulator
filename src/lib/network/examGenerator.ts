import { ProjectData, ExamProject, ExamTask } from './examTypes';
import { DevicePort, ProjectDevice } from './examTypes';
import { extractCliCommandsFromNotes, extractPcConfigsFromNotes, extractConnectionsFromNotes } from './examNoteExtractors';
import { deterministicIdWithPrefix } from './randomServices';

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
        id: item.id || deterministicIdWithPrefix('task'),
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
      d.id === pcConfig.deviceId
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