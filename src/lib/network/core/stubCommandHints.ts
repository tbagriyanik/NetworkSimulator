import type { CommandHandler, CommandContext } from './commandTypes';
import type { SwitchState, CommandResult } from '../types';

export const STUB_COMMAND_HINTS: Record<string, { tr: string; en: string }> = {
  'channel-protocol': { tr: 'Kanal protokolü (PAgP/LACP) yapılandırması henüz simüle edilmiyor.', en: 'Channel protocol configuration (PAgP/LACP) not yet simulated.' },
  'priority-queue out': { tr: 'Çıkış öncelik kuyruğu yapılandırması henüz simüle edilmiyor.', en: 'Output priority queue configuration not yet simulated.' },
  'queue-set': { tr: 'Kuyruk seti yapılandırması henüz simüle edilmiyor.', en: 'Queue set configuration not yet simulated.' },
  'tx-queue': { tr: 'İletim kuyruğu yapılandırması henüz simüle edilmiyor.', en: 'Transmit queue configuration not yet simulated.' },
  'power inline': { tr: 'PoE (Power over Ethernet) yapılandırması henüz simüle edilmiyor.', en: 'PoE (Power over Ethernet) configuration not yet simulated.' },
  'power inline consumption': { tr: 'PoE tüketim değeri yapılandırması henüz simüle edilmiyor.', en: 'PoE consumption value configuration not yet simulated.' },
  'ip directed-broadcast': { tr: 'Yönlü yayın IP yapılandırması henüz simüle edilmiyor.', en: 'Directed broadcast IP configuration not yet simulated.' },
  'no ip directed-broadcast': { tr: 'Yönlü yayın IP devre dışı bırakma henüz simüle edilmiyor.', en: 'Directed broadcast IP disable not yet simulated.' },
  'ip arp inspection limit': { tr: 'ARP denetimi sınırı yapılandırması henüz simüle edilmiyor.', en: 'ARP inspection limit configuration not yet simulated.' },
  'carrier-delay': { tr: 'Taşıyıcı gecikmesi yapılandırması henüz simüle edilmiyor.', en: 'Carrier delay configuration not yet simulated.' },
  'load-interval': { tr: 'İstatistik aralığı yapılandırması henüz simüle edilmiyor.', en: 'Load interval configuration not yet simulated.' },
  'cdp timer': { tr: 'CDP zamanlayıcı süresi yapılandırması henüz simüle edilmiyor.', en: 'CDP timer configuration not yet simulated.' },
  'cdp holdtime': { tr: 'CDP bekleme süresi yapılandırması henüz simüle edilmiyor.', en: 'CDP holdtime configuration not yet simulated.' },
  'snmp-server community': { tr: 'SNMP topluluk (community) yapılandırması henüz simüle edilmiyor.', en: 'SNMP community configuration not yet simulated.' },
  'snmp-server contact': { tr: 'SNMP iletişim bilgisi yapılandırması henüz simüle edilmiyor.', en: 'SNMP contact configuration not yet simulated.' },
  'snmp-server location': { tr: 'SNMP konum yapılandırması henüz simüle edilmiyor.', en: 'SNMP location configuration not yet simulated.' },
  'archive': { tr: 'Arşiv yapılandırması henüz simüle edilmiyor.', en: 'Archive configuration not yet simulated.' },
  'macro': { tr: 'Komut makrosu yapılandırması henüz simüle edilmiyor.', en: 'Command macro configuration not yet simulated.' },
  'default interface': { tr: 'Varsayılan arayüz yapılandırması henüz simüle edilmiyor.', en: 'Default interface configuration not yet simulated.' },
  'configure replace': { tr: 'Yapılandırma değiştirme (replace) henüz simüle edilmiyor.', en: 'Configuration replace not yet simulated.' },
  'mac access-list': { tr: 'MAC erişim listesi yapılandırması henüz simüle edilmiyor.', en: 'MAC access-list configuration not yet simulated.' },
  'class-map': { tr: 'Sınıf haritası (class-map) yapılandırması henüz simüle edilmiyor.', en: 'Class-map configuration not yet simulated.' },
  'policy-map': { tr: 'Politika haritası (policy-map) yapılandırması henüz simüle edilmiyor.', en: 'Policy-map configuration not yet simulated.' },
  'template': { tr: 'Şablon (template) yapılandırması henüz simüle edilmiyor.', en: 'Template configuration not yet simulated.' },
  'transport output': { tr: 'Çıkış protokolü yapılandırması henüz simüle edilmiyor.', en: 'Output transport configuration not yet simulated.' },
  'transport preferred': { tr: 'Tercih edilen protokol yapılandırması henüz simüle edilmiyor.', en: 'Preferred transport configuration not yet simulated.' },
  'access-class': { tr: 'Erişim sınıfı (access-class) yapılandırması henüz simüle edilmiyor.', en: 'Access-class configuration not yet simulated.' },
  'session-limit': { tr: 'Oturum sınırı yapılandırması henüz simüle edilmiyor.', en: 'Session limit configuration not yet simulated.' },
  'lockable': { tr: 'Kilitlenebilir hat yapılandırması henüz simüle edilmiyor.', en: 'Lockable line configuration not yet simulated.' },
};

export function createStubHandler(commandKey: string): CommandHandler {
  return (_state: SwitchState, input: string, _ctx: CommandContext): CommandResult => {
    const hint = STUB_COMMAND_HINTS[commandKey] || {
      tr: 'Bu komut kabul edildi ancak simülasyonu henüz mevcut değil.',
      en: 'Command accepted but its simulation is not yet available.'
    };
    return {
      success: true,
      output: `% ${input.trim()} configured`,
      realismLevel: 'stub',
      hint
    };
  };
}
