'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Gamepad2, Lightbulb, Maximize2, Minus, RotateCcw, Shield, SkipForward, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { CanvasConnection, CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

type StoryState = { step: number; score: number; skipped: number; seed: number; completed: boolean };
const KEY = 'netsim_story_mode_v3';
const steps = [
  { title: 'İlk Bilgisayar', level: 'Başlangıç', text: 'Öğrenme ağına ilk cihazı ekleyerek başla.', hint: 'Çalışma alanı araçlarından PC’yi seçip boş alana tıkla.', learn: 'PC, ağdaki uç cihazdır.' },
  { title: 'PC’nin Adresi', level: 'Başlangıç', text: 'PC’yi aç ve IP adresini incele veya yapılandır.', hint: 'PC’ye çift tıklayıp IP ayarlarını aç.', learn: 'IP adresi bilgisayarın ağdaki kimliğidir.' },
  { title: 'Yerel Bağlantı', level: 'Başlangıç', text: 'PC’nin bağlanacağı bir switch ekle.', hint: 'L2 switch ekleyebilirsin.', learn: 'Switch aynı yerel ağdaki cihazları bağlar.' },
  { title: 'İlk Kablo', level: 'Başlangıç', text: 'PC ile switch arasında bağlantı kur.', hint: 'Bir porttan diğer porta sürükle.', learn: 'Kablo, cihazlar arasında fiziksel yol oluşturur.' },
  { title: 'Ağ Geçidi', level: 'Orta', text: 'Bir router ekle ve topolojiye bağla.', hint: 'Router farklı ağlar arasında yönlendirme yapar.', learn: 'Router farklı IP ağları arasında paketleri yönlendirir.' },
  { title: 'Güvenlik Katmanı', level: 'İleri', text: 'Çalışma alanına bir firewall ekle.', hint: 'Firewall ağ trafiğini kurallarla denetler.', learn: 'Firewall, izin verilen ve engellenen trafiği kontrol eder.' },
  { title: 'Yönlendiriciyi Yapılandır', level: 'İleri', text: 'Router üzerinde bir IP adresi ve ağ geçidi yapılandır.', hint: 'Router ayarlarında bir arayüzü açıp IP bilgisi ver.', learn: 'Yapılandırılmış router arayüzü, ağlar arasında yönlendirme yapabilir.' },
  { title: 'İlk Güvenlik Kuralı', level: 'İleri', text: 'Firewall üzerinde en az bir izin veya engelleme kuralı oluştur.', hint: 'Firewall penceresinde kural ekleme bölümünü kullan.', learn: 'Firewall kuralları trafiği kaynak, hedef, port ve protokole göre denetler.' },
  { title: 'Ağı Sertleştir', level: 'Uzman', text: 'Güvenlik cihazını topolojiye bağla ve saldırı yüzeyini azalt.', hint: 'Firewall bağlantısını kontrol et; gereksiz açık yollar bırakma.', learn: 'Savunma derinliği; segmentasyon, en az ayrıcalık ve kontrollü geçişlerle güçlenir.' },
];
const missionVariants = [
  [
    'Ofiste yeni başlayan çalışanın bilgisayarını ağa hazırla.',
    'Çalışanın bilgisayarına verilen ağ adresini tanıt.',
    'Ofisin yerel bağlantı merkezini kur.',
    'Çalışan bilgisayarını yerel ağa bağla.',
    'Ofisin dış ağ erişimini hazırla.',
    'Ofis ağının girişine güvenlik katmanı koy.',
    'Router arayüzünü adreslendir ve yönlendirmeye hazırla.',
    'İlk firewall kuralını yazarak trafiği denetle.',
    'Ofis ağını güvenli bir geçiş noktasıyla tamamla.',
  ],
  [
    'Ev laboratuvarındaki ilk bilgisayarı sisteme dahil et.',
    'Laboratuvar bilgisayarının IP kimliğini kontrol et.',
    'Deney ağının switch cihazını yerleştir.',
    'İlk deney bağlantısını kur ve ışıkları kontrol et.',
    'Laboratuvara internet geçidi ekle.',
    'Deney ağını temel güvenlik duvarıyla koru.',
    'Laboratuvar router’ının arayüzünü yapılandır.',
    'Deney ağı için ilk güvenlik kuralını oluştur.',
    'Laboratuvar trafiğini güvenli geçitten geçir.',
  ],
  [
    'Siber eğitim istasyonunu çalışma alanına getir.',
    'İstasyonun IP adresini öğren ve doğru yapılandır.',
    'Eğitim ağının omurgasını oluşturacak switch’i ekle.',
    'İstasyonu omurgaya bağlayarak ilk paketi hazırla.',
    'Güvenli ağ geçidini oluştur.',
    'Saldırı yüzeyini azaltmak için firewall ekle.',
    'Eğitim router’ını adreslendir ve ağı çalıştır.',
    'Şüpheli trafiği sınırlayan bir kural ekle.',
    'Güvenlik katmanını bağlantı testiyle doğrula.',
  ],
];
const subtaskVariants = [
  ['Cihaz adını çalışma arkadaşının adıyla değiştir.', 'PC’yi çalışma alanının boş bir bölümüne yerleştir.', 'İlk cihazı seçip ayrıntılarını incele.'],
  ['IP adresini görev kartındaki ağa uygun seç.', 'IP ve alt ağ maskesini birlikte kontrol et.', 'Cihazın IP bilgisini not al ve bağlantıya hazırla.'],
  ['Switch’i PC’ye yakın konumlandır.', 'Switch modelini yerel ağ için seç.', 'Switch’in kullanılabilir portlarını incele.'],
  ['Uygun Ethernet portlarını kullan.', 'Bağlantının aktif olduğunu kontrol et.', 'Kabloyu cihazların boş portlarına tak.'],
  ['Router’ı yerel ağın çıkışına yerleştir.', 'Router’ın ağ geçidi rolünü hazırla.', 'Router ile dış ağ yolunu oluştur.'],
  ['Firewall’ı ağ geçidinin önüne konumlandır.', 'Güvenlik cihazını topolojiye dahil et.', 'İlk güvenlik katmanını çalışma alanında oluştur.'],
  ['Router arayüzlerinden birini seç.', 'Yerel ağ için bir IP ve maske gir.', 'Yapılandırmayı kaydedip portu aktif et.'],
  ['Varsayılan bir trafiği engelleme kuralı oluştur.', 'Yalnızca gerekli porta izin ver.', 'Kuralın kaynak ve hedef alanlarını doldur.'],
  ['Firewall ile router arasında bağlantıyı doğrula.', 'Açık portları azalt.', 'Güvenlik kuralını test etmeye hazırla.'],
];

function initialState(): StoryState { return { step: 0, score: 0, skipped: 0, seed: Math.floor(Math.random() * 3), completed: false }; }

export function StoryModePanel({ open, onClose, topologyDevices = [], topologyConnections = [], deviceStates }: { open: boolean; onClose: () => void; topologyDevices?: CanvasDevice[]; topologyConnections?: CanvasConnection[]; deviceStates?: Map<string, SwitchState> }) {
  const [state, setState] = useState<StoryState>(initialState);
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 430, height: 620 });
  const interaction = useRef<{ type: 'drag' | 'resize'; x: number; y: number; width: number; height: number } | null>(null);
  const { toast } = useToast();
  const completedActivityKey = useRef<string | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    const closeOnMobileBack = () => onClose();
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('mobile-back-pressed', closeOnMobileBack);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('mobile-back-pressed', closeOnMobileBack);
    };
  }, [open, onClose]);
  useEffect(() => { try { const saved = localStorage.getItem(KEY); if (saved) setState(JSON.parse(saved)); } catch { } }, []);
  useEffect(() => { if (open) localStorage.setItem(KEY, JSON.stringify(state)); }, [state, open]);
  const subtaskIndex = (state.seed + Math.floor(state.score / 100)) % subtaskVariants[state.step].length;
  const current = { ...steps[state.step], text: `${missionVariants[state.seed][state.step]} ${subtaskVariants[state.step][subtaskIndex]}` };
  const reward = 100 + state.step * 25;
  const rank = state.score >= 500 ? 'Siber Kaşif' : state.score >= 300 ? 'Ağ Teknisyeni' : 'Stajyer';
  const greeting = useMemo(() => ['Merhaba!', 'Sistem seni bekliyor. Hazır mısın?'][state.seed], [state.seed]);
  const scenario = ['Küçük ofis ağı', 'Ev laboratuvarı', 'Siber güvenlik eğitim ağı'][state.seed];
  const isValidIpv4 = (value: unknown) => typeof value === 'string' && /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(value.trim());
  const hasConfiguredIp = (device: CanvasDevice) => {
    if (isValidIpv4(device?.ip)) return true;
    const state = deviceStates?.get(device?.id);
    return Object.values(state?.ports ?? {}).some((port) => isValidIpv4(port?.ipAddress));
  };
  const hasConfiguredPcNetwork = (device: CanvasDevice) => isValidIpv4(device.ip) && isValidIpv4(device.subnet) && (device.ipConfigMode === 'static' || device.ipConfigMode === 'dhcp');
  const types = topologyDevices.map((device) => device.type);
  const hasSwitch = types.includes('switchL2') || types.includes('switchL3');
  const connectionCount = topologyConnections.length;
  const activityComplete = [
    types.includes('pc'),
    topologyDevices.some((device) => device.type === 'pc' && hasConfiguredPcNetwork(device)),
    hasSwitch,
    connectionCount >= 1,
    types.includes('router') && connectionCount >= 2,
    types.includes('firewall'),
    topologyDevices.some((device) => device.type === 'router' && hasConfiguredIp(device)),
    types.some((type, index) => type === 'firewall' && Array.isArray(topologyDevices[index]?.firewallRules) && topologyDevices[index].firewallRules.length > 0),
    types.includes('firewall') && connectionCount >= 3,
  ][state.step];
  useEffect(() => {
    if (!open || !activityComplete || state.completed) return;
    const key = `${state.step}:${topologyDevices.length}:${connectionCount}`;
    if (completedActivityKey.current === key) return;
    completedActivityKey.current = key;
    setMessage('Görev tamamlandı! Sonraki aşama açıldı.');
    toast({ title: 'Görev tamamlandı', description: `${current.title} başarıyla tamamlandı. +${reward} puan` });
    setState((previous) => ({ ...previous, score: previous.score + reward, step: Math.min(previous.step + 1, steps.length - 1), completed: previous.step === steps.length - 1 }));
  }, [activityComplete, connectionCount, current.title, deviceStates, open, state.completed, state.step, toast, topologyDevices.length]);
  useEffect(() => {
    const move = (event: MouseEvent) => { const active = interaction.current; if (!active) return; if (active.type === 'drag') setPosition({ x: event.clientX - active.x, y: event.clientY - active.y }); else setSize({ width: Math.max(320, active.width + event.clientX - active.x), height: Math.max(300, active.height + event.clientY - active.y) }); };
    const stop = () => { interaction.current = null; };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', stop);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', stop); };
  }, []);
  const beginDrag = (event: React.MouseEvent) => { interaction.current = { type: 'drag', x: event.clientX - position.x, y: event.clientY - position.y, width: 0, height: 0 }; };
  const beginResize = (event: React.MouseEvent) => { event.stopPropagation(); interaction.current = { type: 'resize', x: event.clientX, y: event.clientY, width: size.width, height: size.height }; };
  if (!open) return null;
  const answer = () => {
    if (!activityComplete) { setMessage('Görev henüz tamamlanmadı. Ağı doğrudan çalışma alanında kur ve tekrar kontrol et.'); return; }
    setMessage(`Tebrikler! ${current.learn}`); setState(s => ({ ...s, score: s.score + reward, step: Math.min(s.step + 1, steps.length - 1), completed: s.step === steps.length - 1 }));
  };
  const skip = () => { setMessage('Aşama geçildi. Öğrenme notunu okuyup daha sonra geri dönebilirsin.'); setState(s => ({ ...s, skipped: s.skipped + 1, step: Math.min(s.step + 1, steps.length - 1), completed: s.step === steps.length - 1 })); };
  const reset = () => { const next = initialState(); setState(next); setMessage('Yeni etkileşimli düzen başlatıldı.'); };
  return <div className="fixed z-[120] pointer-events-none" style={{ right: 12 - position.x, top: 80 + position.y, width: `min(${size.width}px, calc(100vw - 1.5rem))`, height: collapsed ? 58 : `min(${size.height}px, calc(100vh - 6rem))` }}>
    <section title={greeting} className="relative h-full rounded-2xl border border-primary-500/30 bg-secondary-950/95 text-white shadow-2xl overflow-hidden pointer-events-auto" role="dialog" aria-modal="false" aria-label="Etkileşimli Düzen">
      <div onMouseDown={beginDrag} className="h-[58px] p-3 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-primary-950 to-secondary-950 cursor-move select-none"><div className="flex items-center gap-2 text-primary-300 text-xs font-bold tracking-widest"><Gamepad2 className="w-4 h-4" /> ETKİLEŞİMLİ DÜZEN</div><div className="flex items-center"><Button variant="ghost" size="icon" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Genişlet' : 'Daralt'}>{collapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}</Button><Button variant="ghost" size="icon" className="text-error-500 hover:bg-error-500/10 hover:text-error-400" onClick={onClose} aria-label="Kapat"><X /></Button></div></div>
      <div className="p-5 space-y-5"><div className="flex items-center justify-between text-xs"><span className="text-secondary-300">Aşama {Math.min(state.step + 1, steps.length)} / {steps.length} · {current.level} · {scenario}</span><span className="font-bold text-amber-300">{state.score} puan · {rank}</span></div><div className="h-2 bg-white/10 rounded-full"><div className="h-2 bg-primary-500 rounded-full transition-all" style={{ width: `${((state.completed ? steps.length : state.step) / steps.length) * 100}%` }} /></div>
        {state.completed ? <div className="rounded-xl bg-success-500/10 border border-success-500/30 p-6 text-center"><CheckCircle2 className="mx-auto w-12 h-12 text-success-400" /><h3 className="text-xl font-bold mt-3">Etkileşimli düzeni tamamladın!</h3><p className="text-secondary-300 mt-2">Son puanın: <strong className="text-amber-300">{state.score}</strong> · Kademen: <strong>{rank}</strong></p></div> : <><div><div className="flex items-center gap-2 text-primary-300 font-bold"><Shield className="w-5 h-5" />{current.title}</div><p className="text-lg leading-relaxed mt-3">{current.text}</p><div className="mt-4 rounded-xl border border-primary-400/30 bg-primary-500/10 p-4"><p className="text-xs capitalize tracking-widest text-primary-300 font-bold">Çalışma alanı görevi</p><p className="mt-1 text-sm text-secondary-200">{['Çalışma alanına bir PC ekle.', 'PC ayarlarından IP adresini incele veya yapılandır.', 'Çalışma alanına bir switch ekle.', 'PC ile switch’i kabloyla bağla.', 'Bir router ekle ve topolojiye bağla.', 'Çalışma alanına bir firewall ekle.'][state.step]}</p><p className="mt-2 text-xs text-secondary-400">Mevcut: {topologyDevices.length} cihaz · {connectionCount} bağlantı</p></div></div>{message && <p className="text-sm text-primary-200">{message}</p>}<div className="flex flex-wrap gap-2"><Button onClick={answer}><CheckCircle2 /> Kontrol</Button><Button variant="outline" onClick={() => setMessage(`İpucu: ${current.hint}`)}><Lightbulb /> İpucu</Button><Button variant="ghost" onClick={skip}><SkipForward /> Geç</Button></div></>}
        <div className="flex justify-between border-t border-white/10 pt-4"><span className="text-xs text-secondary-400">{state.skipped} geçiş</span><Button variant="ghost" size="sm" onClick={reset}><RotateCcw /> Baştan başla</Button></div></div>{!collapsed && <div onMouseDown={beginResize} className="absolute bottom-1 right-1 w-5 h-5 cursor-se-resize flex items-end justify-end opacity-80 hover:opacity-100 transition-opacity z-[60] select-none" aria-label="Pencereyi yeniden boyutlandır" title="Boyutlandır"><div className="w-2.5 h-2.5 rounded-br-full border-b-2 border-r-2 border-secondary-400 bg-transparent" /></div>}
    </section></div>;
}
