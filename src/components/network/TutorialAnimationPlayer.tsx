'use client';

import { useState, useEffect } from 'react';
import { Monitor, MousePointer2, Terminal, Server, Check, X, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

const animTranslations = {
  tr: {
    broadcastDesc: "Broadcast (Yayın): Gönderilen paket, aynı yerel ağdaki tüm cihazlara iletilir. Switch gelen paketi kaynak portu hariç tüm portlara kopyalar.",
    arpReqDesc: "ARP İsteği (Broadcast): PC-A (192.168.1.10), PC-B'nin MAC adresini bilmediği için ağa yayın yapar.",
    arpRepDesc: "ARP Yanıtı (Unicast): Sadece hedef PC-B bu isteğe kendi MAC adresini içeren doğrudan bir yanıt verir.",
    pingReqDesc: "Ping İsteği (ICMP Request): PC-A, hedef PC-B'ye bir Echo Request paketi göndererek erişilebilirliğini test eder.",
    pingRepDesc: "Ping Yanıtı (ICMP Reply): PC-B, paketi aldığında onay olarak bir Echo Reply paketi ile cevap döner.",
    dhcpDiscDesc: "1. Discover (Keşif): İstemci IP adresi almak için ağa yayın (broadcast) yaparak DHCP sunucusu arar.",
    dhcpOffDesc: "2. Offer (Teklif): Sunucu, istemciye kullanabileceği bir IP adresi teklif eder.",
    dhcpReqDesc: "3. Request (İstek): İstemci, sunulan IP adresini kullanmak istediğini ağa bildirir.",
    dhcpAckDesc: "4. Acknowledgment (Onay): Sunucu işlemi onaylar, istemci IP adresini yapılandırır."
  },
  en: {
    broadcastDesc: "Broadcast: The packet is sent to all devices in the local network. The Switch floods the packet to all ports except the incoming one.",
    arpReqDesc: "ARP Request (Broadcast): PC-A (192.168.1.10) broadcasts to resolve the MAC address of PC-B.",
    arpRepDesc: "ARP Reply (Unicast): Only target PC-B replies directly with its MAC address.",
    pingReqDesc: "Ping Request (ICMP Request): PC-A sends an Echo Request packet to test target PC-B's reachability.",
    pingRepDesc: "Ping Reply (ICMP Reply): PC-B answers with an Echo Reply packet confirming receipt.",
    dhcpDiscDesc: "1. Discover: Client broadcasts a search for a DHCP server to request an IP address.",
    dhcpOffDesc: "2. Offer: Server offers an available IP address to the client.",
    dhcpReqDesc: "3. Request: Client requests to lease the offered IP address.",
    dhcpAckDesc: "4. Acknowledgment: Server confirms and client configures the IP address."
  }
};

interface TutorialAnimationPlayerProps {
  animationId: string;
}

export function TutorialAnimationPlayer({ animationId }: TutorialAnimationPlayerProps) {
  const { language } = useLanguage();
  const [frame, setFrame] = useState(0);
  const [windowWidth, setWindowWidth] = useState(1200);
  const activeLang = language === 'tr' ? 'tr' : 'en';
  const tAnim = animTranslations[activeLang];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTimeout(() => setWindowWidth(window.innerWidth), 0);
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
    return;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % 100);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const renderAnimation = () => {
    switch (animationId) {
      case 'add-pc':
        return (
          <div className="relative w-full h-40 bg-secondary-100 dark:bg-secondary-900 rounded-lg overflow-hidden flex items-center justify-center border border-secondary-200 dark:border-secondary-800">
            {/* Toolbar Simulation */}
            <div className="absolute top-2 left-2 flex gap-2 p-1 bg-white dark:bg-secondary-800 rounded border border-secondary-200 dark:border-secondary-700 shadow-sm">
              <div className={cn("p-1 rounded transition-colors", frame % 40 < 20 ? "bg-primary-500/20 text-primary-500" : "text-secondary-400")}>
                <Monitor className="w-5 h-5" />
              </div>
              <div className="p-1 text-secondary-300 dark:text-secondary-600">
                <Server className="w-5 h-5" />
              </div>
            </div>

            {/* Mouse Pointer */}
            <div
              className="absolute z-10 transition-all duration-500 ease-in-out"
              style={{
                left: frame % 40 < 20 ? '20px' : '50%',
                top: frame % 40 < 20 ? '20px' : '50%',
                transform: 'translate(-50%, -50%)'
              }}
            >
              <MousePointer2 className="w-5 h-5 text-secondary-900 dark:text-white drop-shadow-md" />
            </div>

            {/* Ghost PC appearing */}
            {frame % 40 >= 20 && (
              <div className="animate-in fade-in zoom-in duration-300 flex flex-col items-center gap-1">
                <div className="p-3 bg-primary-500 rounded-xl shadow-lg shadow-primary-500/20">
                  <Monitor className="w-8 h-8 text-white" />
                </div>
                <span className="text-[10px] font-bold text-secondary-500">PC-1</span>
              </div>
            )}
          </div>
        );

      case 'add-switch':
        return (
          <div className="relative w-full h-40 bg-secondary-100 dark:bg-secondary-900 rounded-lg overflow-hidden flex items-center justify-center border border-secondary-200 dark:border-secondary-800">
            {/* Toolbar Simulation */}
            <div className="absolute top-2 left-2 flex gap-2 p-1 bg-white dark:bg-secondary-800 rounded border border-secondary-200 dark:border-secondary-700 shadow-sm">
              <div className="p-1 text-secondary-300 dark:text-secondary-600">
                <Monitor className="w-5 h-5" />
              </div>
              <div className={cn("p-1 rounded transition-colors", frame % 40 < 20 ? "bg-success-500/20 text-success-500" : "text-secondary-400")}>
                <Server className="w-5 h-5" />
              </div>
            </div>

            {/* Mouse Pointer */}
            <div
              className="absolute z-10 transition-all duration-500 ease-in-out"
              style={{
                left: frame % 40 < 20 ? '50px' : '50%',
                top: frame % 40 < 20 ? '20px' : '50%',
                transform: 'translate(-50%, -50%)'
              }}
            >
              <MousePointer2 className="w-5 h-5 text-secondary-900 dark:text-white drop-shadow-md" />
            </div>

            {/* Ghost Switch appearing */}
            {frame % 40 >= 20 && (
              <div className="animate-in fade-in zoom-in duration-300 flex flex-col items-center gap-1">
                <div className="p-3 bg-success-500 rounded-xl shadow-lg shadow-success-500/20">
                  <Server className="w-8 h-8 text-white" />
                </div>
                <span className="text-[10px] font-bold text-secondary-500">SWITCH-1</span>
              </div>
            )}
          </div>
        );

      case 'connect-cable':
        return (
          <div className="relative w-full h-40 bg-secondary-100 dark:bg-secondary-900 rounded-lg overflow-hidden border border-secondary-200 dark:border-secondary-800">
            {/* PC */}
            <div className="absolute left-10 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
              <div className={cn("p-2 rounded-lg bg-primary-500 text-white shadow-md transition-all", frame % 60 > 20 && frame % 60 < 40 ? "ring-4 ring-primary-400/50" : "")}>
                <Monitor className="w-6 h-6" />
              </div>
              <span className="text-[8px] font-bold text-secondary-500">PC-1</span>
            </div>

            {/* Switch */}
            <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
              <div className={cn("p-2 rounded-lg bg-success-500 text-white shadow-md transition-all", frame % 60 >= 40 ? "ring-4 ring-success-400/50" : "")}>
                <Server className="w-6 h-6" />
              </div>
              <span className="text-[8px] font-bold text-secondary-500">SW-1</span>
            </div>

            {/* Cable Line */}
            {frame % 60 >= 20 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <line
                  x1="65" y1="50%"
                  x2={frame % 60 < 40 ? 65 + (frame % 60 - 20) * (windowWidth < 400 ? 5 : 8) : "255"}
                  y2="50%"
                  stroke="var(--color-secondary-500)"
                  strokeWidth="2"
                  strokeDasharray={frame % 60 < 40 ? "5,5" : "none"}
                />
              </svg>
            )}

            {/* Mouse Pointer */}
            <div
              className="absolute z-10 transition-all duration-300"
              style={{
                left: frame % 60 < 20 ? '40px' : frame % 60 < 40 ? '40px' : '280px',
                top: frame % 60 < 20 ? '70%' : '50%',
                transform: 'translate(-50%, -50%)'
              }}
            >
              <MousePointer2 className="w-4 h-4 text-secondary-900 dark:text-white drop-shadow-md" />
            </div>
          </div>
        );

      case 'open-pc-cmd':
        return (
          <div className="relative w-full h-40 bg-secondary-100 dark:bg-secondary-900 rounded-lg overflow-hidden flex flex-col items-center justify-center border border-secondary-200 dark:border-secondary-800">
            {frame % 40 < 20 ? (
              <div className="flex flex-col items-center gap-2">
                <div className="p-4 bg-primary-500 rounded-2xl shadow-xl text-white animate-pulse">
                  <Monitor className="w-10 h-10" />
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-secondary-500">
                  <MousePointer2 className="w-3 h-3" /> Double Click
                </div>
              </div>
            ) : (
              <div className="w-4/5 h-4/5 bg-secondary-950 rounded-md border border-secondary-700 shadow-2xl p-2 flex flex-col gap-2 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between border-b border-secondary-800 pb-1">
                  <div className="flex items-center gap-1">
                    <Terminal className="w-3 h-3 text-secondary-400" />
                    <span className="text-[8px] text-secondary-400 font-mono">Command Prompt</span>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary-700" />
                    <div className="w-1.5 h-1.5 rounded-full bg-error-500/50" />
                  </div>
                </div>
                <div className="text-[10px] text-success-500 font-mono">
                  C:\Users\Admin&gt; _
                </div>
              </div>
            )}
          </div>
        );

      case 'pc-ipconfig':
        return (
          <div className="relative w-full h-40 bg-secondary-950 rounded-lg overflow-hidden border border-secondary-800 p-3 font-mono">
             <div className="text-[10px] text-secondary-400 mb-1">C:\Users\Admin&gt;
               <span className="text-white ml-1">
                 {"ipconfig".substring(0, Math.floor((frame % 30) / 3))}
                 {frame % 10 < 5 ? "_" : ""}
               </span>
             </div>
             {frame % 60 > 30 && (
               <div className="text-[9px] text-success-500 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-500">
                 <div>IPv4 Address. . . : 192.168.1.10</div>
                 <div>Subnet Mask . . . : 255.255.255.0</div>
                 <div>Default Gateway . : 192.168.1.1</div>
               </div>
             )}
          </div>
        );

      case 'pc-help':
        return (
          <div className="relative w-full h-40 bg-secondary-950 rounded-lg overflow-hidden border border-secondary-800 p-3 font-mono">
             <div className="text-[10px] text-secondary-400 mb-1">C:\Users\Admin&gt;
               <span className="text-white ml-1">
                 {"help".substring(0, Math.floor((frame % 30) / 4))}
                 {frame % 10 < 5 ? "_" : ""}
               </span>
             </div>
             {frame % 60 > 30 && (
               <div className="text-[8px] text-secondary-300 space-y-0.5 animate-in fade-in duration-500 overflow-hidden">
                 <div>IPCONFIG - Shows IP config</div>
                 <div>PING - Test connectivity</div>
                 <div>TRACERT - Trace route</div>
                 <div>HELP - Show commands</div>
               </div>
             )}
          </div>
        );

      case 'open-cli':
        return (
          <div className="relative w-full h-40 bg-secondary-100 dark:bg-secondary-900 rounded-lg overflow-hidden flex flex-col items-center justify-center border border-secondary-200 dark:border-secondary-800">
            {frame % 40 < 20 ? (
              <div className="flex flex-col items-center gap-2">
                <div className="p-4 bg-success-500 rounded-2xl shadow-xl text-white animate-pulse">
                  <Server className="w-10 h-10" />
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-secondary-500">
                  <MousePointer2 className="w-3 h-3" /> Double Click
                </div>
              </div>
            ) : (
              <div className="w-4/5 h-4/5 bg-secondary-950 rounded-md border border-secondary-700 shadow-2xl p-2 flex flex-col gap-2 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center gap-2 text-white bg-secondary-900 px-2 py-1 rounded text-[8px] mb-1">
                  <Terminal className="w-2.5 h-2.5" /> Console
                </div>
                <div className="text-[10px] text-secondary-300 font-mono">
                  Switch&gt; _
                </div>
              </div>
            )}
          </div>
        );

      case 'cli-enable':
        return (
          <div className="relative w-full h-40 bg-secondary-950 rounded-lg overflow-hidden border border-secondary-800 p-3 font-mono">
             <div className="text-[10px] text-secondary-300 mb-1">Switch&gt;
               <span className="text-white ml-1">
                 {"enable".substring(0, Math.floor((frame % 30) / 4))}
                 {frame % 10 < 5 ? "_" : ""}
               </span>
             </div>
             {frame % 60 > 30 && (
               <div className="text-[10px] text-secondary-300 animate-in fade-in duration-300">
                 Switch# _
               </div>
             )}
          </div>
        );

      case 'cli-config':
        return (
          <div className="relative w-full h-40 bg-secondary-950 rounded-lg overflow-hidden border border-secondary-800 p-3 font-mono">
             <div className="text-[10px] text-secondary-300 mb-1">Switch#
               <span className="text-white ml-1">
                 {"conf t".substring(0, Math.floor((frame % 30) / 4))}
                 {frame % 10 < 5 ? "_" : ""}
               </span>
             </div>
             {frame % 60 > 30 && (
               <div className="text-[10px] text-secondary-300 animate-in fade-in duration-300">
                 Enter configuration commands, one per line.<br/>
                 Switch(config)# _
               </div>
             )}
          </div>
        );

      case 'broadcast-vis': {
        // Frame ranges: 0-25: PC-A -> SW, 25-35: SW glows, 35-65: SW -> PC-B,C,D, 65-85: PCs glow green, 85-100: Done
        const showP1 = frame % 100 < 25;
        const showSWGlow = frame % 100 >= 25 && frame % 100 < 35;
        const showP2 = frame % 100 >= 35 && frame % 100 < 65;
        const showSuccess = frame % 100 >= 65 && frame % 100 < 85;

        // Coordinates
        const pca = { x: 15, y: 20 };
        const pcb = { x: 85, y: 20 };
        const pcc = { x: 15, y: 80 };
        const pcd = { x: 85, y: 80 };
        const sw = { x: 50, y: 50 };

        // Intermediate coordinates for packet 1
        let pktX = pca.x;
        let pktY = pca.y;
        if (showP1) {
          const ratio = (frame % 100) / 25;
          pktX = pca.x + (sw.x - pca.x) * ratio;
          pktY = pca.y + (sw.y - pca.y) * ratio;
        }

        // Intermediate coordinates for packet 2 (broadcast replicas)
        const replicaRatio = showP2 ? ((frame % 100) - 35) / 30 : 0;
        const replicaB = { x: sw.x + (pcb.x - sw.x) * replicaRatio, y: sw.y + (pcb.y - sw.y) * replicaRatio };
        const replicaC = { x: sw.x + (pcc.x - sw.x) * replicaRatio, y: sw.y + (pcc.y - sw.y) * replicaRatio };
        const replicaD = { x: sw.x + (pcd.x - sw.x) * replicaRatio, y: sw.y + (pcd.y - sw.y) * replicaRatio };

        return (
          <div className="relative w-full h-56 bg-secondary-900 border border-secondary-800 rounded-lg overflow-hidden flex flex-col justify-between p-3 select-none">
            <div className="flex-1 relative">
              {/* Topology SVG lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-45">
                <line x1={`${pca.x}%`} y1={`${pca.y}%`} x2={`${sw.x}%`} y2={`${sw.y}%`} stroke="#6366f1" strokeWidth="2" />
                <line x1={`${pcb.x}%`} y1={`${pcb.y}%`} x2={`${sw.x}%`} y2={`${sw.y}%`} stroke="#6366f1" strokeWidth="2" />
                <line x1={`${pcc.x}%`} y1={`${pcc.y}%`} x2={`${sw.x}%`} y2={`${sw.y}%`} stroke="#6366f1" strokeWidth="2" />
                <line x1={`${pcd.x}%`} y1={`${pcd.y}%`} x2={`${sw.x}%`} y2={`${sw.y}%`} stroke="#6366f1" strokeWidth="2" />
              </svg>

              {/* PC-A (Sender) */}
              <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5" style={{ left: `${pca.x}%`, top: `${pca.y}%` }}>
                <div className="p-2 bg-indigo-600 rounded-lg text-white border border-indigo-400/30 shadow-lg">
                  <Monitor className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-mono text-secondary-300">PC-A</span>
              </div>

              {/* Switch */}
              <div className={cn("absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 transition-all duration-300", showSWGlow ? "scale-110" : "")} style={{ left: `${sw.x}%`, top: `${sw.y}%` }}>
                <div className={cn("p-2 rounded-lg text-white border shadow-lg transition-all", showSWGlow ? "bg-amber-500 border-amber-400 ring-4 ring-amber-500/30" : "bg-secondary-800 border-secondary-700")}>
                  <Server className="w-6 h-6" />
                </div>
                <span className="text-[9px] font-mono text-secondary-300">Switch</span>
              </div>

              {/* PC-B (Target) */}
              <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5" style={{ left: `${pcb.x}%`, top: `${pcb.y}%` }}>
                <div className={cn("p-2 rounded-lg text-white border transition-colors", showSuccess ? "bg-success-600 border-success-400 shadow-success-500/20" : "bg-secondary-850 border-secondary-700")}>
                  <Monitor className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-mono text-secondary-300">PC-B</span>
              </div>

              {/* PC-C (Target) */}
              <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5" style={{ left: `${pcc.x}%`, top: `${pcc.y}%` }}>
                <div className={cn("p-2 rounded-lg text-white border transition-colors", showSuccess ? "bg-success-600 border-success-400 shadow-success-500/20" : "bg-secondary-850 border-secondary-700")}>
                  <Monitor className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-mono text-secondary-300">PC-C</span>
              </div>

              {/* PC-D (Target) */}
              <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5" style={{ left: `${pcd.x}%`, top: `${pcd.y}%` }}>
                <div className={cn("p-2 rounded-lg text-white border transition-colors", showSuccess ? "bg-success-600 border-success-400 shadow-success-500/20" : "bg-secondary-850 border-secondary-700")}>
                  <Monitor className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-mono text-secondary-300">PC-D</span>
              </div>

              {/* Packet 1 (A -> SW) */}
              {showP1 && (
                <div className="absolute -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-amber-500 border border-amber-300 rounded-full flex items-center justify-center text-[7px] text-secondary-950 font-bold shadow-lg shadow-amber-500/40 animate-pulse" style={{ left: `${pktX}%`, top: `${pktY}%` }}>
                  BC
                </div>
              )}

              {/* Replicas (SW -> B, C, D) */}
              {showP2 && (
                <>
                  <div className="absolute -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-amber-500 border border-amber-300 rounded-full flex items-center justify-center text-[7px] text-secondary-950 font-bold shadow-lg shadow-amber-500/40 animate-pulse" style={{ left: `${replicaB.x}%`, top: `${replicaB.y}%` }}>BC</div>
                  <div className="absolute -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-amber-500 border border-amber-300 rounded-full flex items-center justify-center text-[7px] text-secondary-950 font-bold shadow-lg shadow-amber-500/40 animate-pulse" style={{ left: `${replicaC.x}%`, top: `${replicaC.y}%` }}>BC</div>
                  <div className="absolute -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-amber-500 border border-amber-300 rounded-full flex items-center justify-center text-[7px] text-secondary-950 font-bold shadow-lg shadow-amber-500/40 animate-pulse" style={{ left: `${replicaD.x}%`, top: `${replicaD.y}%` }}>BC</div>
                </>
              )}

              {/* Success Checkmarks */}
              {showSuccess && (
                <>
                  <div className="absolute -translate-x-1/2 -translate-y-1/2 bg-success-500 text-white rounded-full p-0.5 border border-white animate-bounce" style={{ left: `85%`, top: `10%` }}><Check className="w-2.5 h-2.5" /></div>
                  <div className="absolute -translate-x-1/2 -translate-y-1/2 bg-success-500 text-white rounded-full p-0.5 border border-white animate-bounce" style={{ left: `15%`, top: `70%` }}><Check className="w-2.5 h-2.5" /></div>
                  <div className="absolute -translate-x-1/2 -translate-y-1/2 bg-success-500 text-white rounded-full p-0.5 border border-white animate-bounce" style={{ left: `85%`, top: `70%` }}><Check className="w-2.5 h-2.5" /></div>
                </>
              )}
            </div>

            {/* Description Bar */}
            <div className="mt-2 bg-secondary-950/80 border border-secondary-800 px-2 py-1.5 rounded text-[10px] text-secondary-200 text-center leading-relaxed h-12 flex items-center justify-center">
              {tAnim.broadcastDesc}
            </div>
          </div>
        );
      }

      case 'arp-anim': {
        // Stages: 
        // 0-20: A -> SW (Yellow Packet, ARP Request)
        // 20-25: SW glows
        // 25-50: SW -> B (grows green) and C (grows red)
        // 50-65: Processing: B accepts, C rejects/X
        // 65-85: B -> SW (Green Packet, ARP Reply)
        // 85-95: SW -> A
        // 95-100: Done
        const cycle = frame % 100;
        const phase1 = cycle < 20;
        const phase2 = cycle >= 20 && cycle < 25;
        const phase3 = cycle >= 25 && cycle < 50;
        const phase4 = cycle >= 50 && cycle < 65;
        const phase5 = cycle >= 65 && cycle < 85;
        const phase6 = cycle >= 85 && cycle < 95;
        const isRequest = cycle < 60;

        const pca = { x: 15, y: 50 };
        const sw = { x: 50, y: 50 };
        const pcb = { x: 85, y: 22 };
        const pcc = { x: 85, y: 78 };

        // Calculate packet coordinates
        let pktX = pca.x;
        let pktY = pca.y;
        let replicaBX = sw.x;
        let replicaBY = sw.y;
        let replicaCX = sw.x;
        let replicaCY = sw.y;
        let replyX = pcb.x;
        let replyY = pcb.y;

        if (phase1) {
          const ratio = cycle / 20;
          pktX = pca.x + (sw.x - pca.x) * ratio;
          pktY = pca.y + (sw.y - pca.y) * ratio;
        } else if (phase3) {
          const ratio = (cycle - 25) / 25;
          replicaBX = sw.x + (pcb.x - sw.x) * ratio;
          replicaBY = sw.y + (pcb.y - sw.y) * ratio;
          replicaCX = sw.x + (pcc.x - sw.x) * ratio;
          replicaCY = sw.y + (pcc.y - sw.y) * ratio;
        } else if (phase5) {
          const ratio = (cycle - 65) / 20;
          replyX = pcb.x + (sw.x - pcb.x) * ratio;
          replyY = pcb.y + (sw.y - pcb.y) * ratio;
        } else if (phase6) {
          const ratio = (cycle - 85) / 10;
          replyX = sw.x + (pca.x - sw.x) * ratio;
          replyY = sw.y + (pca.y - sw.y) * ratio;
        }

        return (
          <div className="relative w-full h-56 bg-secondary-900 border border-secondary-800 rounded-lg overflow-hidden flex flex-col justify-between p-3 select-none">
            <div className="flex-1 relative">
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-45">
                <line x1={`${pca.x}%`} y1={`${pca.y}%`} x2={`${sw.x}%`} y2={`${sw.y}%`} stroke="#6366f1" strokeWidth="2" />
                <line x1={`${pcb.x}%`} y1={`${pcb.y}%`} x2={`${sw.x}%`} y2={`${sw.y}%`} stroke="#6366f1" strokeWidth="2" />
                <line x1={`${pcc.x}%`} y1={`${pcc.y}%`} x2={`${sw.x}%`} y2={`${sw.y}%`} stroke="#6366f1" strokeWidth="2" />
              </svg>

              {/* PC-A */}
              <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center" style={{ left: `${pca.x}%`, top: `${pca.y}%` }}>
                <div className={cn("p-2 rounded-lg text-white border shadow-lg transition-all", cycle >= 90 ? "bg-success-600 border-success-400 ring-4 ring-success-500/20" : "bg-indigo-600 border-indigo-400/30")}>
                  <Monitor className="w-5 h-5" />
                </div>
                <span className="text-[8px] font-mono text-secondary-300">PC-A</span>
                <span className="text-[7px] font-mono text-secondary-400">192.168.1.10</span>
              </div>

              {/* Switch */}
              <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center" style={{ left: `${sw.x}%`, top: `${sw.y}%` }}>
                <div className={cn("p-2 bg-secondary-800 border border-secondary-700 rounded-lg text-white shadow-lg transition-all", phase2 ? "bg-amber-500 border-amber-400 scale-105" : "")}>
                  <Server className="w-6 h-6" />
                </div>
                <span className="text-[8px] font-mono text-secondary-300">Switch</span>
              </div>

              {/* PC-B (Target) */}
              <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center" style={{ left: `${pcb.x}%`, top: `${pcb.y}%` }}>
                <div className={cn("p-2 rounded-lg text-white border transition-colors", phase4 || phase5 ? "bg-success-600 border-success-400 shadow-success-500/20" : "bg-secondary-850 border-secondary-700")}>
                  <Monitor className="w-5 h-5" />
                </div>
                <span className="text-[8px] font-mono text-secondary-300">PC-B</span>
                <span className="text-[7px] font-mono text-secondary-400">192.168.1.20</span>
              </div>

              {/* PC-C (Other) */}
              <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center" style={{ left: `${pcc.x}%`, top: `${pcc.y}%` }}>
                <div className={cn("p-2 rounded-lg text-white border transition-colors", phase4 ? "bg-error-950 border-error-500/50" : "bg-secondary-850 border-secondary-700")}>
                  <Monitor className="w-5 h-5 opacity-60" />
                </div>
                <span className="text-[8px] font-mono text-secondary-400">PC-C</span>
                <span className="text-[7px] font-mono text-secondary-500">192.168.1.30</span>
              </div>

              {/* Phase 1 Packet: A -> SW */}
              {phase1 && (
                <div className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-amber-500 border border-amber-300 rounded-full flex items-center justify-center text-[7px] text-secondary-950 font-bold shadow-lg shadow-amber-500/40" style={{ left: `${pktX}%`, top: `${pktY}%` }}>
                  ARP
                </div>
              )}

              {/* Phase 3 Broadcast Replicas: SW -> B, C */}
              {phase3 && (
                <>
                  <div className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-amber-500 border border-amber-300 rounded-full flex items-center justify-center text-[7px] text-secondary-950 font-bold shadow-lg shadow-amber-500/40" style={{ left: `${replicaBX}%`, top: `${replicaBY}%` }}>ARP</div>
                  <div className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-amber-500 border border-amber-300 rounded-full flex items-center justify-center text-[7px] text-secondary-950 font-bold shadow-lg shadow-amber-500/40" style={{ left: `${replicaCX}%`, top: `${replicaCY}%` }}>ARP</div>
                </>
              )}

              {/* Phase 4 Processing Check/Cross */}
              {phase4 && (
                <>
                  <div className="absolute -translate-x-1/2 -translate-y-1/2 bg-success-500 text-white rounded-full p-0.5 border border-white animate-bounce" style={{ left: `85%`, top: `12%` }}><Check className="w-2.5 h-2.5" /></div>
                  <div className="absolute -translate-x-1/2 -translate-y-1/2 bg-error-500 text-white rounded-full p-0.5 border border-white animate-pulse" style={{ left: `85%`, top: `68%` }}><X className="w-2.5 h-2.5" /></div>
                </>
              )}

              {/* Phase 5 & 6 Unicast Reply: B -> SW -> A */}
              {(phase5 || phase6) && (
                <div className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-success-500 border border-success-300 rounded-full flex items-center justify-center text-[7px] text-white font-bold shadow-lg shadow-success-500/40" style={{ left: `${replyX}%`, top: `${replyY}%` }}>
                  ARP
                </div>
              )}
            </div>

            {/* Description Bar */}
            <div className="mt-2 bg-secondary-950/80 border border-secondary-800 px-2 py-1.5 rounded text-[10px] text-secondary-200 text-center leading-relaxed h-12 flex items-center justify-center">
              {isRequest ? tAnim.arpReqDesc : tAnim.arpRepDesc}
            </div>
          </div>
        );
      }

      case 'ping-anim': {
        // Stages: 
        // 0-35: A -> SW -> B (Blue Packet: Echo Request)
        // 35-50: B glows green
        // 50-85: B -> SW -> A (Purple Packet: Echo Reply)
        // 85-100: Done, Console output success
        const cycle = frame % 100;
        const isRequest = cycle < 45;
        const isProcessing = cycle >= 45 && cycle < 55;
        const isReply = cycle >= 55 && cycle < 90;
        const isDone = cycle >= 90;

        const pca = { x: 20, y: 50 };
        const sw = { x: 50, y: 50 };
        const pcb = { x: 80, y: 50 };

        let pktX = pca.x;
        const pktY = pca.y;

        if (isRequest) {
          // A -> SW -> B
          const ratio = cycle / 45;
          if (ratio < 0.5) {
            // A -> SW
            const segmentRatio = ratio * 2;
            pktX = pca.x + (sw.x - pca.x) * segmentRatio;
          } else {
            // SW -> B
            const segmentRatio = (ratio - 0.5) * 2;
            pktX = sw.x + (pcb.x - sw.x) * segmentRatio;
          }
        } else if (isReply) {
          // B -> SW -> A
          const ratio = (cycle - 55) / 35;
          if (ratio < 0.5) {
            // B -> SW
            const segmentRatio = ratio * 2;
            pktX = pcb.x + (sw.x - pcb.x) * segmentRatio;
          } else {
            // SW -> A
            const segmentRatio = (ratio - 0.5) * 2;
            pktX = sw.x + (pca.x - sw.x) * segmentRatio;
          }
        }

        return (
          <div className="relative w-full h-56 bg-secondary-900 border border-secondary-800 rounded-lg overflow-hidden flex flex-col justify-between p-3 select-none">
            <div className="flex-1 relative">
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-45">
                <line x1={`${pca.x}%`} y1={`${pca.y}%`} x2={`${pcb.x}%`} y2={`${pcb.y}%`} stroke="#6366f1" strokeWidth="2" />
              </svg>

              {/* PC-A */}
              <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center font-mono text-[9px]" style={{ left: `${pca.x}%`, top: `${pca.y}%` }}>
                <div className={cn("p-2 bg-indigo-600 rounded-lg text-white border border-indigo-400/30 shadow-lg", isDone ? "ring-4 ring-success-500/20 bg-success-600 border-success-400" : "")}>
                  <Monitor className="w-5 h-5" />
                </div>
                <span className="text-secondary-300">PC-A</span>
                <span className="text-secondary-400">192.168.1.10</span>
              </div>

              {/* Switch */}
              <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center font-mono text-[9px]" style={{ left: `${sw.x}%`, top: `${sw.y}%` }}>
                <div className="p-2 bg-secondary-800 border border-secondary-700 rounded-lg text-white">
                  <Server className="w-5 h-5" />
                </div>
                <span className="text-secondary-400">Switch</span>
              </div>

              {/* PC-B */}
              <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center font-mono text-[9px]" style={{ left: `${pcb.x}%`, top: `${pcb.y}%` }}>
                <div className={cn("p-2 rounded-lg text-white border transition-colors", isProcessing ? "bg-success-600 border-success-400 scale-105" : "bg-secondary-850 border-secondary-700")}>
                  <Monitor className="w-5 h-5" />
                </div>
                <span className="text-secondary-300">PC-B</span>
                <span className="text-secondary-400">192.168.1.20</span>
              </div>

              {/* Packet */}
              {(isRequest || isReply) && (
                <div className={cn("absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center text-[7px] text-white font-bold shadow-lg animate-pulse", isRequest ? "bg-primary-500 border border-primary-300 shadow-primary-500/40" : "bg-purple-500 border border-purple-300 shadow-purple-500/40")} style={{ left: `${pktX}%`, top: `${pktY}%` }}>
                  {isRequest ? "REQ" : "REP"}
                </div>
              )}

              {/* Target checkmark */}
              {isProcessing && (
                <div className="absolute -translate-x-1/2 -translate-y-1/2 bg-success-500 text-white rounded-full p-0.5 border border-white animate-bounce" style={{ left: `80%`, top: `35%` }}><Check className="w-2.5 h-2.5" /></div>
              )}

              {/* Done / Terminal Log Output */}
              {isDone && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2/3 h-16 bg-black/80 rounded border border-secondary-750 font-mono text-[8px] text-success-400 p-1.5 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                  <div>C:\Users\Admin&gt; ping 192.168.1.20</div>
                  <div className="animate-pulse">Reply from 192.168.1.20: bytes=32 time=4ms TTL=64</div>
                  <div>Ping statistics: Packets: Sent = 1, Received = 1</div>
                </div>
              )}
            </div>

            {/* Description Bar */}
            <div className="mt-2 bg-secondary-950/80 border border-secondary-800 px-2 py-1.5 rounded text-[10px] text-secondary-200 text-center leading-relaxed h-12 flex items-center justify-center">
              {isRequest || isProcessing ? tAnim.pingReqDesc : tAnim.pingRepDesc}
            </div>
          </div>
        );
      }

      case 'dhcp-flow': {
        // Stages: D-O-R-A
        // 0-25: Discover (A -> Sunucu, Broadcast, orange)
        // 25-50: Offer (Sunucu -> A, Unicast, blue)
        // 50-75: Request (A -> Sunucu, Broadcast, pink)
        // 75-95: Ack (Sunucu -> A, Unicast, green)
        // 95-100: Done, Client gets IP (glowing green)
        const cycle = frame % 100;
        const isDiscover = cycle < 25;
        const isOffer = cycle >= 25 && cycle < 50;
        const isRequest = cycle >= 50 && cycle < 75;
        const isAck = cycle >= 75 && cycle < 95;
        const isDone = cycle >= 95;

        const pca = { x: 20, y: 50 };
        const sw = { x: 50, y: 50 };
        const srv = { x: 80, y: 50 };

        let pktX = pca.x;
        const pktY = pca.y;
        let pktLabel = "DISC";
        let pktColorClass = "bg-warning-500 border border-warning-350 text-secondary-950 shadow-warning-500/40";

        if (isDiscover || isRequest) {
          // Client to Server
          const stageRatio = isDiscover ? cycle / 25 : (cycle - 50) / 25;
          pktLabel = isDiscover ? "DISC" : "REQ";
          pktColorClass = isDiscover 
            ? "bg-warning-500 border border-warning-300 text-secondary-950 shadow-warning-500/40"
            : "bg-fuchsia-500 border border-fuchsia-300 text-white shadow-fuchsia-500/40";

          if (stageRatio < 0.5) {
            const ratio = stageRatio * 2;
            pktX = pca.x + (sw.x - pca.x) * ratio;
          } else {
            const ratio = (stageRatio - 0.5) * 2;
            pktX = sw.x + (srv.x - sw.x) * ratio;
          }
        } else if (isOffer || isAck) {
          // Server to Client
          const stageRatio = isOffer ? (cycle - 25) / 25 : (cycle - 75) / 20;
          pktLabel = isOffer ? "OFFR" : "ACK";
          pktColorClass = isOffer
            ? "bg-sky-500 border border-sky-300 text-white shadow-sky-500/40"
            : "bg-success-500 border border-success-300 text-white shadow-success-500/40";

          if (stageRatio < 0.5) {
            const ratio = stageRatio * 2;
            pktX = srv.x + (sw.x - srv.x) * ratio;
          } else {
            const ratio = (stageRatio - 0.5) * 2;
            pktX = sw.x + (pca.x - sw.x) * ratio;
          }
        }

        let stepDesc = tAnim.dhcpDiscDesc;
        if (isOffer) stepDesc = tAnim.dhcpOffDesc;
        else if (isRequest) stepDesc = tAnim.dhcpReqDesc;
        else if (isAck || isDone) stepDesc = tAnim.dhcpAckDesc;

        return (
          <div className="relative w-full h-56 bg-secondary-900 border border-secondary-800 rounded-lg overflow-hidden flex flex-col justify-between p-3 select-none">
            {/* Step badges */}
            <div className="flex justify-center gap-1.5 shrink-0 text-[8px] font-bold font-mono">
              <span className={cn("px-1.5 py-0.5 rounded transition-all", isDiscover ? "bg-warning-500 text-secondary-950 scale-105" : "bg-secondary-800 text-secondary-500")}>D (Discover)</span>
              <span className={cn("px-1.5 py-0.5 rounded transition-all", isOffer ? "bg-sky-500 text-white scale-105" : "bg-secondary-800 text-secondary-500")}>O (Offer)</span>
              <span className={cn("px-1.5 py-0.5 rounded transition-all", isRequest ? "bg-fuchsia-500 text-white scale-105" : "bg-secondary-800 text-secondary-500")}>R (Request)</span>
              <span className={cn("px-1.5 py-0.5 rounded transition-all", isAck || isDone ? "bg-success-500 text-white scale-105" : "bg-secondary-800 text-secondary-500")}>A (Ack)</span>
            </div>

            <div className="flex-1 relative mt-1">
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-45">
                <line x1={`${pca.x}%`} y1={`${pca.y}%`} x2={`${srv.x}%`} y2={`${srv.y}%`} stroke="#6366f1" strokeWidth="2" />
              </svg>

              {/* Client PC */}
              <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center font-mono text-[9px]" style={{ left: `${pca.x}%`, top: `${pca.y}%` }}>
                <div className={cn("p-2 rounded-lg text-white border shadow-lg transition-all duration-300", isDone ? "bg-success-600 border-success-400 ring-4 ring-success-500/20" : "bg-secondary-800 border-secondary-700")}>
                  <Monitor className="w-5 h-5" />
                </div>
                <span className="text-secondary-300">Client</span>
                <span className={cn("text-[7px] px-1 rounded transition-colors", isDone ? "bg-success-500/20 text-success-400 font-bold" : "text-secondary-400")}>
                  {isDone ? "192.168.1.15" : "0.0.0.0"}
                </span>
              </div>

              {/* Switch */}
              <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center font-mono text-[9px]" style={{ left: `${sw.x}%`, top: `${sw.y}%` }}>
                <div className="p-2 bg-secondary-850 border border-secondary-700 rounded-lg text-white">
                  <Server className="w-5 h-5" />
                </div>
                <span className="text-secondary-400">Switch</span>
              </div>

              {/* DHCP Server */}
              <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center font-mono text-[9px]" style={{ left: `${srv.x}%`, top: `${srv.y}%` }}>
                <div className="p-2 bg-primary-600 rounded-lg text-white border border-primary-400/30 shadow-lg">
                  <Globe className="w-5 h-5" />
                </div>
                <span className="text-secondary-300">DHCP Server</span>
                <span className="text-[7px] text-secondary-400">192.168.1.1</span>
              </div>

              {/* Packet traveling */}
              {!isDone && (
                <div className={cn("absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold shadow-lg animate-pulse", pktColorClass)} style={{ left: `${pktX}%`, top: `${pktY}%` }}>
                  {pktLabel}
                </div>
              )}
            </div>

            {/* Description Bar */}
            <div className="mt-2 bg-secondary-950/80 border border-secondary-800 px-2 py-1.5 rounded text-[10px] text-secondary-200 text-center leading-relaxed h-12 flex items-center justify-center">
              {stepDesc}
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="w-full h-40 bg-secondary-100 dark:bg-secondary-900 rounded-lg flex items-center justify-center text-secondary-400 italic text-xs">
            Animation not available
          </div>
        );
    }
  };

  return (
    <div className="p-1">
      {renderAnimation()}
    </div>
  );
}
