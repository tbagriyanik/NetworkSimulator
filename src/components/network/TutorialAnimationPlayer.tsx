'use client';

import { useState, useEffect } from 'react';
import { Monitor, MousePointer2, Terminal, Server } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorialAnimationPlayerProps {
  animationId: string;
}

export function TutorialAnimationPlayer({ animationId }: TutorialAnimationPlayerProps) {
  const [frame, setFrame] = useState(0);
  const [windowWidth, setWindowWidth] = useState(1200);

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
          <div className="relative w-full h-40 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-800">
            {/* Toolbar Simulation */}
            <div className="absolute top-2 left-2 flex gap-2 p-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className={cn("p-1 rounded transition-colors", frame % 40 < 20 ? "bg-blue-500/20 text-blue-500" : "text-slate-400")}>
                <Monitor className="w-5 h-5" />
              </div>
              <div className="p-1 text-slate-300 dark:text-slate-600">
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
              <MousePointer2 className="w-5 h-5 text-slate-900 dark:text-white drop-shadow-md" />
            </div>

            {/* Ghost PC appearing */}
            {frame % 40 >= 20 && (
              <div className="animate-in fade-in zoom-in duration-300 flex flex-col items-center gap-1">
                <div className="p-3 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20">
                  <Monitor className="w-8 h-8 text-white" />
                </div>
                <span className="text-[10px] font-bold text-slate-500">PC-1</span>
              </div>
            )}
          </div>
        );

      case 'add-switch':
        return (
          <div className="relative w-full h-40 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-800">
            {/* Toolbar Simulation */}
            <div className="absolute top-2 left-2 flex gap-2 p-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="p-1 text-slate-300 dark:text-slate-600">
                <Monitor className="w-5 h-5" />
              </div>
              <div className={cn("p-1 rounded transition-colors", frame % 40 < 20 ? "bg-green-500/20 text-green-500" : "text-slate-400")}>
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
              <MousePointer2 className="w-5 h-5 text-slate-900 dark:text-white drop-shadow-md" />
            </div>

            {/* Ghost Switch appearing */}
            {frame % 40 >= 20 && (
              <div className="animate-in fade-in zoom-in duration-300 flex flex-col items-center gap-1">
                <div className="p-3 bg-green-500 rounded-xl shadow-lg shadow-green-500/20">
                  <Server className="w-8 h-8 text-white" />
                </div>
                <span className="text-[10px] font-bold text-slate-500">SWITCH-1</span>
              </div>
            )}
          </div>
        );

      case 'connect-cable':
        return (
          <div className="relative w-full h-40 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            {/* PC */}
            <div className="absolute left-10 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
              <div className={cn("p-2 rounded-lg bg-blue-500 text-white shadow-md transition-all", frame % 60 > 20 && frame % 60 < 40 ? "ring-4 ring-blue-400/50" : "")}>
                <Monitor className="w-6 h-6" />
              </div>
              <span className="text-[8px] font-bold text-slate-500">PC-1</span>
            </div>

            {/* Switch */}
            <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
              <div className={cn("p-2 rounded-lg bg-green-500 text-white shadow-md transition-all", frame % 60 >= 40 ? "ring-4 ring-green-400/50" : "")}>
                <Server className="w-6 h-6" />
              </div>
              <span className="text-[8px] font-bold text-slate-500">SW-1</span>
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
              <MousePointer2 className="w-4 h-4 text-slate-900 dark:text-white drop-shadow-md" />
            </div>
          </div>
        );

      case 'open-pc-cmd':
        return (
          <div className="relative w-full h-40 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800">
            {frame % 40 < 20 ? (
              <div className="flex flex-col items-center gap-2">
                <div className="p-4 bg-blue-500 rounded-2xl shadow-xl text-white animate-pulse">
                  <Monitor className="w-10 h-10" />
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                  <MousePointer2 className="w-3 h-3" /> Double Click
                </div>
              </div>
            ) : (
              <div className="w-4/5 h-4/5 bg-slate-950 rounded-md border border-slate-700 shadow-2xl p-2 flex flex-col gap-2 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                  <div className="flex items-center gap-1">
                    <Terminal className="w-3 h-3 text-slate-400" />
                    <span className="text-[8px] text-slate-400 font-mono">Command Prompt</span>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                  </div>
                </div>
                <div className="text-[10px] text-emerald-500 font-mono">
                  C:\Users\Admin&gt; _
                </div>
              </div>
            )}
          </div>
        );

      case 'pc-ipconfig':
        return (
          <div className="relative w-full h-40 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 p-3 font-mono">
             <div className="text-[10px] text-slate-400 mb-1">C:\Users\Admin&gt;
               <span className="text-white ml-1">
                 {"ipconfig".substring(0, Math.floor((frame % 30) / 3))}
                 {frame % 10 < 5 ? "_" : ""}
               </span>
             </div>
             {frame % 60 > 30 && (
               <div className="text-[9px] text-emerald-500 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-500">
                 <div>IPv4 Address. . . : 192.168.1.10</div>
                 <div>Subnet Mask . . . : 255.255.255.0</div>
                 <div>Default Gateway . : 192.168.1.1</div>
               </div>
             )}
          </div>
        );

      case 'pc-help':
        return (
          <div className="relative w-full h-40 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 p-3 font-mono">
             <div className="text-[10px] text-slate-400 mb-1">C:\Users\Admin&gt;
               <span className="text-white ml-1">
                 {"help".substring(0, Math.floor((frame % 30) / 4))}
                 {frame % 10 < 5 ? "_" : ""}
               </span>
             </div>
             {frame % 60 > 30 && (
               <div className="text-[8px] text-slate-300 space-y-0.5 animate-in fade-in duration-500 overflow-hidden">
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
          <div className="relative w-full h-40 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800">
            {frame % 40 < 20 ? (
              <div className="flex flex-col items-center gap-2">
                <div className="p-4 bg-green-500 rounded-2xl shadow-xl text-white animate-pulse">
                  <Server className="w-10 h-10" />
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                  <MousePointer2 className="w-3 h-3" /> Double Click
                </div>
              </div>
            ) : (
              <div className="w-4/5 h-4/5 bg-slate-950 rounded-md border border-slate-700 shadow-2xl p-2 flex flex-col gap-2 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center gap-2 text-white bg-slate-900 px-2 py-1 rounded text-[8px] mb-1">
                  <Terminal className="w-2.5 h-2.5" /> Console
                </div>
                <div className="text-[10px] text-slate-300 font-mono">
                  Switch&gt; _
                </div>
              </div>
            )}
          </div>
        );

      case 'cli-enable':
        return (
          <div className="relative w-full h-40 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 p-3 font-mono">
             <div className="text-[10px] text-slate-300 mb-1">Switch&gt;
               <span className="text-white ml-1">
                 {"enable".substring(0, Math.floor((frame % 30) / 4))}
                 {frame % 10 < 5 ? "_" : ""}
               </span>
             </div>
             {frame % 60 > 30 && (
               <div className="text-[10px] text-slate-300 animate-in fade-in duration-300">
                 Switch# _
               </div>
             )}
          </div>
        );

      case 'cli-config':
        return (
          <div className="relative w-full h-40 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 p-3 font-mono">
             <div className="text-[10px] text-slate-300 mb-1">Switch#
               <span className="text-white ml-1">
                 {"conf t".substring(0, Math.floor((frame % 30) / 4))}
                 {frame % 10 < 5 ? "_" : ""}
               </span>
             </div>
             {frame % 60 > 30 && (
               <div className="text-[10px] text-slate-300 animate-in fade-in duration-300">
                 Enter configuration commands, one per line.<br/>
                 Switch(config)# _
               </div>
             )}
          </div>
        );

      default:
        return (
          <div className="w-full h-40 bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center justify-center text-slate-400 italic text-xs">
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
