import { Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { cn } from '@/lib/utils';

export interface DeviceToolbarProps {
    isTr: boolean;
    isDark: boolean;
}

export function DeviceToolbar({ isTr, isDark }: DeviceToolbarProps) {
    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-success-500" />
                    {isTr ? 'Cihaz Ekle' : 'Add Device'}
                </h3>
                <span className="text-[9px] opacity-40 font-medium">
                    {isTr ? 'Topolojiye eklemek için tıklayın' : 'Click to add to topology'}
                </span>
            </div>
            <div className={cn(
                "flex items-center gap-1 p-1.5 rounded-xl border",
                isDark ? "bg-secondary-900/40 border-secondary-700/30" : "bg-success-50/50 border-success-100/50"
            )}>
                <TooltipWrapper title={isTr ? 'PC Ekle' : 'Add PC'}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-lg text-primary-500 hover:bg-primary-500/10 transition-colors"
                        onClick={() => window.dispatchEvent(new CustomEvent('add-device', { detail: 'pc' }))}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0 -2-2H5a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2z" />
                        </svg>
                    </Button>
                </TooltipWrapper>
                <TooltipWrapper title={isTr ? 'L2 Switch Ekle' : 'Add L2 Switch'}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-lg text-accent-500 hover:bg-accent-500/10 transition-colors"
                        onClick={() => window.dispatchEvent(new CustomEvent('add-device', { detail: 'switchL2' }))}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01" />
                        </svg>
                    </Button>
                </TooltipWrapper>
                <TooltipWrapper title={isTr ? 'L3 Switch Ekle' : 'Add L3 Switch'}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-lg text-purple-500 hover:bg-purple-500/10 transition-colors"
                        onClick={() => window.dispatchEvent(new CustomEvent('add-device', { detail: 'switchL3' }))}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01" />
                        </svg>
                    </Button>
                </TooltipWrapper>
                <TooltipWrapper title={isTr ? 'Router Ekle' : 'Add Router'}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-lg text-purple-500 hover:bg-purple-500/10 transition-colors"
                        onClick={() => window.dispatchEvent(new CustomEvent('add-device', { detail: 'router' }))}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="9" strokeWidth={2} />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14M12 5l-2 2m2-2l2 2m-2 12l-2-2m2 2l2-2M5 12l2-2m-2 2l2 2M19 12l-2-2m2 2l-2 2" />
                        </svg>
                    </Button>
                </TooltipWrapper>
                <TooltipWrapper title={isTr ? 'IoT Cihaz Ekle' : 'Add IoT'}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-lg text-warning-500 hover:bg-warning-500/10 transition-colors"
                        onClick={() => window.dispatchEvent(new CustomEvent('add-device', { detail: 'iot' }))}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.247 7.761a6 6 0 0 1 0 8.478" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.075 4.933a10 10 0 0 1 0 14.134" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.925 19.067a10 10 0 0 1 0-14.134" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.753 16.239a6 6 0 0 1 0-8.478" />
                            <circle strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} cx="12" cy="12" r="2" />
                        </svg>
                    </Button>
                </TooltipWrapper>
                <TooltipWrapper title={isTr ? 'Firewall Ekle' : 'Add Firewall'}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-lg text-error-500 hover:bg-error-500/10 transition-colors"
                        onClick={() => window.dispatchEvent(new CustomEvent('add-device', { detail: 'firewall' }))}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                        </svg>
                    </Button>
                </TooltipWrapper>
            </div>
        </section>
    );
}
