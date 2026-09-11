import type { CommandHandler, CommandContext } from './commandTypes';
import type { SwitchState, CommandResult } from '../types';

const STUB_COMMAND_HINTS: Record<string, { tr: string; en: string }> = {
  'priority-queue out': {
    tr: 'priority-queue out, arayüz çıkışında yüksek öncelikli bir kuyruk (expedite queue) oluşturur. VoIP gibi gecikmeye duyarlı trafiğin her zaman gönderilmesini sağlar.',
    en: 'priority-queue out creates an expedite queue on the egress interface. Ensures delay-sensitive traffic (e.g., VoIP) is always transmitted first.'
  },
  'queue-set': {
    tr: 'queue-set, bir arayüz için kuyruk kümesini yapılandırır.',
    en: 'queue-set configures the queue set for an interface.'
  },
  'tx-queue': {
    tr: 'tx-queue, arayüz çıkış kuyruğu parametrelerini yapılandırır.',
    en: 'tx-queue configures egress queue parameters.'
  },
  'ip directed-broadcast': { tr: 'Arayüzde yönlendirilmiş yayını (directed broadcast) etkinleştirir; hedef alt ağın broadcast adresine gönderilen paketlerin işlenmesini sağlar.', en: 'Enables directed broadcast on the interface so packets sent to the subnet broadcast address are handled.' },
  'no ip directed-broadcast': { tr: 'Arayüzde yönlendirilmiş yayını (directed broadcast) devre dışı bırakır.', en: 'Disables directed broadcast on the interface.' },
  'ip arp inspection limit': { tr: 'Arayüzde Dynamic ARP Inspection (DAI) için saniyede işlenecek ARP isteği sayısı sınırını (pps) ayarlar.', en: 'Sets the Dynamic ARP Inspection (DAI) rate limit (ARP requests per second) on the interface.' },
  'carrier-delay': { tr: 'Arayüzün taşıyıcı (carrier) durum değişikliğine karşı yeni duruma geçmeden önce bekleyeceği süreyi saniye cinsinden ayarlar.', en: 'Sets the delay in seconds an interface waits before transitioning after a carrier state change.' },
  'load-interval': { tr: 'Arayüz input/output istatistik hızlarının hesaplandığı ölçüm aralığını (30-600 sn) ayarlar.', en: 'Sets the measurement interval (30-600 s) over which interface input/output rates are calculated.' },
  'cdp timer': { tr: 'CDP komşuluk güncelleme mesajlarının gönderilme aralığını (5-65535 sn) ayarlar.', en: 'Sets the interval at which CDP neighbor updates are sent (5-65535 seconds).' },
  'cdp holdtime': { tr: 'Alınan CDP komşu bilgisinin geçerli kalma süresini (holdtime, 10-65535 sn) ayarlar.', en: 'Sets how long received CDP neighbor information stays valid before expiring (10-65535 seconds).' },
  'default interface': { tr: 'Belirtilen arayüzü tüm yapılandırmasından arındırarak varsayılan değerlere döndürür.', en: 'Resets the specified interface to its default configuration.' },
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
