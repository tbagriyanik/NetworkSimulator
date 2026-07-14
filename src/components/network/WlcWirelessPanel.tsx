'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WlcIcon } from './PCPanelWidgets';
import { sanitizeInput } from '@/lib/security/sanitizer';
import type { SwitchState } from '@/lib/network/types';

interface WlcWirelessPanelProps {
    state: SwitchState;
    isDark: boolean;
    language: string;
    isDevicePoweredOff: boolean;
    onExecuteCommand: (command: string) => Promise<void>;
}

export function WlcWirelessPanel({
    state,
    isDark,
    language,
    isDevicePoweredOff,
    onExecuteCommand,
}: WlcWirelessPanelProps) {
    const tr = (en: string, tr: string) => (language === 'tr' ? tr : en);
    const [wlanName, setWlanName] = useState('');
    const [wlanId, setWlanId] = useState('');
    const [wlanSsid, setWlanSsid] = useState('');
    const [busy, setBusy] = useState(false);

    const wlans = state.wlcWlans || {};
    const aps = state.wlcAps || {};

    const createWlan = async () => {
        if (!wlanName || !wlanId || !wlanSsid) return;

        const cleanName = sanitizeInput(wlanName).replace(/\s+/g, '');
        const cleanId = wlanId.replace(/[^0-9]/g, '');
        const cleanSsid = sanitizeInput(wlanSsid).replace(/\s+/g, '');

        if (!cleanName || !cleanId || !cleanSsid) return;

        setBusy(true);
        try {
            await onExecuteCommand(`wlan ${cleanName} ${cleanId} ${cleanSsid}`);
            setWlanName('');
            setWlanId('');
            setWlanSsid('');
        } finally {
            setBusy(false);
        }
    };

    const cardClass = isDark ? 'bg-secondary-900/60 border-secondary-700' : 'bg-white border-secondary-200';
    const muted = isDark ? 'text-secondary-400' : 'text-secondary-500';

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <WlcIcon className="w-4 h-4" />
                {tr('Wireless LAN Controller', 'Kablosuz LAN Denetleyici')}
            </div>

            {/* Quick WLAN creation */}
            <Card className={cardClass}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{tr('Create WLAN', 'WLAN Oluştur')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Input
                            placeholder={tr('Profile name', 'Profil adı')}
                            value={wlanName}
                            onChange={(e) => setWlanName(e.target.value)}
                            disabled={isDevicePoweredOff || busy}
                        />
                        <Input
                            placeholder={tr('WLAN ID', 'WLAN ID')}
                            value={wlanId}
                            onChange={(e) => setWlanId(e.target.value.replace(/[^0-9]/g, ''))}
                            disabled={isDevicePoweredOff || busy}
                        />
                        <Input
                            placeholder={tr('SSID', 'SSID')}
                            value={wlanSsid}
                            onChange={(e) => setWlanSsid(e.target.value)}
                            disabled={isDevicePoweredOff || busy}
                        />
                    </div>
                    <Button
                        size="sm"
                        onClick={createWlan}
                        disabled={isDevicePoweredOff || busy || !wlanName || !wlanId || !wlanSsid}
                    >
                        {tr('Add WLAN', 'WLAN Ekle')}
                    </Button>
                </CardContent>
            </Card>

            {/* WLAN list */}
            <Card className={cardClass}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{tr('Configured WLANs', 'Yapılandırılmış WLAN\'lar')}</CardTitle>
                </CardHeader>
                <CardContent>
                    {Object.keys(wlans).length === 0 ? (
                        <p className={`text-xs ${muted}`}>{tr('No WLANs configured.', 'WLAN yapılandırılmamış.')}</p>
                    ) : (
                        <div className="space-y-2">
                            {Object.entries(wlans).map(([id, wlan]) => (
                                <div key={id} className="flex items-center justify-between gap-2 rounded-md border border-secondary-200 dark:border-secondary-700 px-3 py-2">
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{wlan.name}</div>
                                        <div className={`text-xs ${muted}`}>SSID: {wlan.ssid} · ID: {wlan.id}</div>
                                    </div>
                                    <Badge variant={wlan.status === 'enabled' ? 'outline' : 'secondary'} className={wlan.status === 'enabled' ? 'bg-success-500 text-white border-transparent' : ''}>
                                        {wlan.status === 'enabled' ? tr('Enabled', 'Etkin') : tr('Disabled', 'Devre Dışı')}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* AP list */}
            <Card className={cardClass}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{tr('Joined Access Points', 'Bağlı Erişim Noktaları')}</CardTitle>
                </CardHeader>
                <CardContent>
                    {Object.keys(aps).length === 0 ? (
                        <p className={`text-xs ${muted}`}>{tr('No APs joined.', 'Bağlı AP yok.')}</p>
                    ) : (
                        <div className="space-y-2">
                            {Object.entries(aps).map(([name, ap]) => (
                                <div key={name} className="flex items-center justify-between gap-2 rounded-md border border-secondary-200 dark:border-secondary-700 px-3 py-2">
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{ap.name}</div>
                                        <div className={`text-xs ${muted}`}>{ap.macAddress}</div>
                                    </div>
                                    <Badge variant={ap.status === 'joined' ? 'outline' : 'secondary'} className={ap.status === 'joined' ? 'bg-success-500 text-white border-transparent' : ''}>
                                        {ap.status === 'joined' ? tr('Joined', 'Bağlı') : tr('Down', 'Kapalı')}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
