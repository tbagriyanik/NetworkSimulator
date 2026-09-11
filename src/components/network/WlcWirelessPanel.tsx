'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Radio, Laptop, Trash2, Power, Edit3 } from 'lucide-react';
import type { SwitchState } from '@/lib/network/types';
import type { CanvasDevice } from './networkTopology.types';
import { getDeviceWifiConfig, wifiMacFilterMatches } from '@/lib/network/wireless';

interface WlcWirelessPanelProps {
    state: SwitchState;
    isDark: boolean;
    language: string;
    isDevicePoweredOff: boolean;
    onExecuteCommand: (command: string) => Promise<void>;
    topologyDevices?: CanvasDevice[];
    activeDeviceId?: string;
    deviceStates?: Map<string, SwitchState>;
}

export function WlcWirelessPanel({
    state,
    isDark,
    language,
    isDevicePoweredOff,
    onExecuteCommand,
    topologyDevices = [],
    activeDeviceId = '',
    deviceStates,
}: WlcWirelessPanelProps) {
    const tr = (en: string, tr: string) => (language === 'tr' ? tr : en);
    const [wlanName, setWlanName] = useState('');
    const [wlanId, setWlanId] = useState('');
    const [wlanSsid, setWlanSsid] = useState('');
    const [wlanVlan, setWlanVlan] = useState('1');
    const [wlanSecurity, setWlanSecurity] = useState<'open' | 'wpa2' | 'wpa3' | '802.1x'>('open');
    const [wlanPassword, setWlanPassword] = useState('');
    const [busy, setBusy] = useState(false);

    const wlans = state.wlcWlans || {};
    const aps = state.wlcAps || {};

    const createWlan = async () => {
        if (!wlanName || !wlanId || !wlanSsid) return;
        setBusy(true);
        try {
            const vlanArg = wlanVlan ? ` vlan ${wlanVlan}` : '';
            const secArg = ` security ${wlanSecurity}`;
            const pwdArg = wlanPassword ? ` password ${wlanPassword}` : '';
            await onExecuteCommand(`wlan ${wlanName} ${wlanId} ${wlanSsid}${vlanArg}${secArg}${pwdArg}`);
            await onExecuteCommand(`wlan enable ${wlanId}`);
            setWlanName('');
            setWlanId('');
            setWlanSsid('');
            setWlanPassword('');
            setWlanVlan('1');
        } finally {
            setBusy(false);
        }
    };

    const toggleWlan = async (id: number | string, currentStatus: string) => {
        setBusy(true);
        try {
            if (currentStatus === 'enabled') {
                await onExecuteCommand(`wlan disable ${id}`);
            } else {
                await onExecuteCommand(`wlan enable ${id}`);
            }
        } finally {
            setBusy(false);
        }
    };

    const deleteWlan = async (id: number | string) => {
        setBusy(true);
        try {
            await onExecuteCommand(`no wlan ${id}`);
        } finally {
            setBusy(false);
        }
    };

    // Find connected wireless clients (PCs, Laptops, IoT) associated with any active WLAN on this WLC
    const activeWlanSsids = new Set(
        Object.values(wlans)
            .filter((w) => w.status === 'enabled' && w.ssid)
            .map((w) => w.ssid.toLowerCase())
    );

    const connectedClients = topologyDevices.filter((dev) => {
        if (dev.id === activeDeviceId) return false;
        if (dev.status === 'offline') return false;
        const wifi = getDeviceWifiConfig(dev, deviceStates);
        if (!wifi?.enabled || !wifi?.ssid) return false;
        if (!activeWlanSsids.has(wifi.ssid.toLowerCase())) return false;
        const wlcDevice = topologyDevices.find(d => d.id === activeDeviceId);
        const wlcWifi = getDeviceWifiConfig(wlcDevice, deviceStates);
        return wifiMacFilterMatches(wlcWifi, dev, deviceStates);
    });

    const cardClass = isDark ? 'bg-secondary-900/60 border-secondary-700' : 'bg-white border-secondary-200';
    const muted = isDark ? 'text-secondary-400' : 'text-secondary-500';

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Radio className="w-4 h-4" />
                {tr('Wireless Network Administration', 'Kablosuz Ağ Yönetimi')}
            </div>

            {/* Quick WLAN creation */}
            <Card className={cardClass}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{tr('Create New WLAN / SSID', 'Yeni WLAN / SSID Oluştur')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                            <label className="text-[11px] font-medium block mb-1">{tr('Profile Name', 'Profil Adı')}</label>
                            <Input
                                placeholder={tr('e.g. Employee-WiFi', 'örn. Employee-WiFi')}
                                value={wlanName}
                                onChange={(e) => setWlanName(e.target.value)}
                                disabled={isDevicePoweredOff || busy}
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-medium block mb-1">{tr('WLAN ID', 'WLAN ID')}</label>
                            <Input
                                placeholder="1 - 512"
                                value={wlanId}
                                onChange={(e) => setWlanId(e.target.value.replace(/[^0-9]/g, ''))}
                                disabled={isDevicePoweredOff || busy}
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-medium block mb-1">{tr('SSID Broadcast Name', 'SSID Yayın Adı')}</label>
                            <Input
                                placeholder={tr('e.g. Corp_Wireless', 'örn. Corp_Wireless')}
                                value={wlanSsid}
                                onChange={(e) => setWlanSsid(e.target.value)}
                                disabled={isDevicePoweredOff || busy}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                            <label className="text-[11px] font-medium block mb-1">{tr('Interface / Dynamic VLAN', 'Arayüz / Dinamik VLAN')}</label>
                            <Input
                                placeholder={tr('VLAN ID (e.g. 10, 20)', 'VLAN ID (örn. 10, 20)')}
                                value={wlanVlan}
                                onChange={(e) => setWlanVlan(e.target.value.replace(/[^0-9]/g, ''))}
                                disabled={isDevicePoweredOff || busy}
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-medium block mb-1">{tr('Security & Key Mgmt', 'Güvenlik & Anahtar Yönetimi')}</label>
                            <select
                                role="combobox"
                                className={`flex h-9 w-full rounded-md border px-3 py-1 text-xs font-medium shadow-sm transition-colors outline-none cursor-pointer ${isDark ? 'bg-secondary-800 text-secondary-100 border-secondary-700 focus:border-primary-500' : 'bg-white text-secondary-900 border-secondary-300 focus:border-primary-500'}`}
                                value={wlanSecurity}
                                onChange={(e) => setWlanSecurity(e.target.value as 'open' | 'wpa2' | 'wpa3' | '802.1x')}
                                disabled={isDevicePoweredOff || busy}
                            >
                                <option value="open" className={isDark ? 'bg-secondary-800 text-secondary-100' : 'bg-white text-secondary-900'}>{tr('Open (None)', 'Açık (Şifresiz)')}</option>
                                <option value="wpa2" className={isDark ? 'bg-secondary-800 text-secondary-100' : 'bg-white text-secondary-900'}>{tr('WPA2-PSK (AES)', 'WPA2-PSK (AES)')}</option>
                                <option value="wpa3" className={isDark ? 'bg-secondary-800 text-secondary-100' : 'bg-white text-secondary-900'}>{tr('WPA3-SAE (Personal)', 'WPA3-SAE (Kişisel)')}</option>
                                <option value="802.1x" className={isDark ? 'bg-secondary-800 text-secondary-100' : 'bg-white text-secondary-900'}>{tr('WPA2/WPA3 Enterprise (802.1X)', 'WPA2/WPA3 Kurumsal (802.1X)')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] font-medium block mb-1">{tr('Pre-Shared Key / Secret', 'Ön Paylaşımlı Parola')}</label>
                            <Input
                                type="password"
                                placeholder={wlanSecurity === 'open' ? tr('(Not applicable)', '(Gerekli Değil)') : (wlanSecurity === '802.1x' ? tr('RADIUS Secret Key', 'RADIUS Gizli Anahtarı') : tr('Min 8 characters', 'En az 8 karakter'))}
                                value={wlanPassword}
                                onChange={(e) => setWlanPassword(e.target.value)}
                                disabled={isDevicePoweredOff || busy || wlanSecurity === 'open'}
                            />
                        </div>
                    </div>
                    <Button
                        size="sm"
                        onClick={createWlan}
                        disabled={isDevicePoweredOff || busy || !wlanName || !wlanId || !wlanSsid}
                    >
                        {tr('Apply / Create WLAN', 'Uygula / WLAN Oluştur')}
                    </Button>
                </CardContent>
            </Card>

            {/* Configured WLAN list */}
            <Card className={cardClass}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{tr('Configured WLANs / Dynamic VLAN Mapping', 'Yapılandırılmış WLAN\'lar / Dinamik VLAN Eşlemesi')}</CardTitle>
                </CardHeader>
                <CardContent>
                    {Object.keys(wlans).length === 0 ? (
                        <p className={`text-xs ${muted}`}>{tr('No WLANs configured.', 'WLAN yapılandırılmamış.')}</p>
                    ) : (
                        <div className="space-y-2">
                            {Object.entries(wlans).map(([id, wlan]) => (
                                <div key={id} className="flex items-center justify-between gap-2 rounded-md border border-secondary-200 dark:border-secondary-700 px-3 py-2">
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate flex items-center gap-2">
                                            <span>{wlan.name}</span>
                                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">ID: {wlan.id}</Badge>
                                            {wlan.vlan && (
                                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono">VLAN {wlan.vlan}</Badge>
                                            )}
                                        </div>
                                        <div className={`text-xs ${muted}`}>
                                            SSID: <span className="font-semibold text-primary">{wlan.ssid}</span> · {tr('Security', 'Güvenlik')}: <span className="font-mono uppercase">{wlan.security || 'open'}</span>
                                            {wlan.vlan ? ` · ${tr('Interface: Dynamic-Vlan', 'Arayüz: Dinamik-Vlan')}${wlan.vlan}` : ''}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Badge variant={wlan.status === 'enabled' ? 'outline' : 'secondary'} className={wlan.status === 'enabled' ? 'bg-success-500 text-white border-transparent' : ''}>
                                            {wlan.status === 'enabled' ? tr('Enabled', 'Etkin') : tr('Disabled', 'Devre Dışı')}
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-primary-500 hover:text-primary-600"
                                            title={tr('Edit SSID', 'SSID Düzenle')}
                                            disabled={isDevicePoweredOff || busy}
                                            onClick={() => {
                                                setWlanName(wlan.name);
                                                setWlanId(String(wlan.id));
                                                setWlanSsid(wlan.ssid);
                                                setWlanVlan(wlan.vlan ? String(wlan.vlan) : '1');
                                                setWlanSecurity((wlan.security as 'open' | 'wpa2' | 'wpa3' | '802.1x') || 'open');
                                                setWlanPassword(wlan.password || '');
                                            }}
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0"
                                            title={wlan.status === 'enabled' ? tr('Disable', 'Devre Dışı Bırak') : tr('Enable', 'Etkinleştir')}
                                            disabled={isDevicePoweredOff || busy}
                                            onClick={() => toggleWlan(wlan.id, wlan.status)}
                                        >
                                            <Power className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-error-500 hover:text-error-600"
                                            title={tr('Delete', 'Sil')}
                                            disabled={isDevicePoweredOff || busy}
                                            onClick={() => deleteWlan(wlan.id)}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Connected Wireless Clients */}
            <Card className={cardClass}>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{tr('Connected Wireless Clients', 'Bağlı Kablosuz Cihazlar')}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                            {connectedClients.length} {tr('Clients', 'Cihaz')}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {connectedClients.length === 0 ? (
                        <p className={`text-xs ${muted}`}>{tr('No wireless clients currently connected.', 'Şu anda bağlı kablosuz cihaz yok.')}</p>
                    ) : (
                        <div className="space-y-2">
                            {connectedClients.map((client) => {
                                const clientWifi = getDeviceWifiConfig(client, deviceStates);
                                return (
                                    <div key={client.id} className="flex items-center justify-between gap-2 rounded-md border border-secondary-200 dark:border-secondary-700 px-3 py-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
                                                <Laptop className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium truncate">{client.name}</div>
                                                <div className={`text-xs ${muted} font-mono`}>
                                                    IP: {client.ip || tr('Dynamic / DHCP', 'Dinamik / DHCP')} · MAC: {client.macAddress || 'Auto'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <Badge variant="outline" className="bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800 text-[11px]">
                                                SSID: {clientWifi?.ssid}
                                            </Badge>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* AP list (CAPWAP / AP Join view) */}
            <Card className={cardClass}>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{tr('Joined Access Points (CAPWAP / DTLS)', 'Bağlı Erişim Noktaları (CAPWAP / DTLS)')}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                            {Object.keys(aps).length} AP
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {Object.keys(aps).length === 0 ? (
                        <p className={`text-xs ${muted}`}>{tr('No APs joined. Connect an AP to establish CAPWAP tunnel.', 'Bağlı AP yok. CAPWAP tüneli kurmak için bir AP bağlayın.')}</p>
                    ) : (
                        <div className="space-y-2">
                            {Object.entries(aps).map(([name, ap]) => (
                                <div key={name} className="flex items-center justify-between gap-2 rounded-md border border-secondary-200 dark:border-secondary-700 px-3 py-2">
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate flex items-center gap-2">
                                            <span>{ap.name}</span>
                                            <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">{ap.model || 'NS-AP3702I'}</Badge>
                                        </div>
                                        <div className={`text-xs ${muted} font-mono mt-0.5`}>
                                            MAC: {ap.macAddress} · {tr('Mode: Local', 'Mod: Local')} · {tr('Tunnel: CAPWAP Data Encrypt', 'Tünel: CAPWAP Veri Şifreleme')}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Badge variant={ap.status === 'joined' ? 'outline' : 'secondary'} className={ap.status === 'joined' ? 'bg-success-500 text-white border-transparent text-[11px]' : 'text-[11px]'}>
                                            {ap.status === 'joined' ? tr('Registered', 'Kayıtlı (Joined)') : tr('Down', 'Kapalı')}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
