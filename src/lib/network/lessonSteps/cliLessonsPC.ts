import type { GuidedStep } from '../guidedMode.types';

export const cliLessonsPC: GuidedStep[] = [
  // ===== PC İŞLEMİ (57) =====
  {
    id: 'cli-lesson-1-2',
    order: 57,
    sectionTitle: { tr: 'Bölüm: PC İşlemi', en: 'Section: PC Operation' },
    title: { tr: 'Ping Komutu', en: 'Ping Command' },
    description: { tr: 'Ping komutu ile ağ bağlantısını test edin', en: 'Test network connectivity with ping command' },
    hint: { tr: 'ping 192.168.1.2 yazın\nPC-1>', en: 'Type ping 192.168.1.2\nPC-1>' },
    checkType: 'command',
    checkParams: { commandPattern: 'ping', deviceType: 'pc', targetDeviceId: 'pc-1' },
    completed: false,
    points: 15
  }
];