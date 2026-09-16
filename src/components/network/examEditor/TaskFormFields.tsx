import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExamTask } from '@/lib/network/examMode';
import type { TopologyDevice } from './examUtils';

export interface TaskFormFieldsProps {
    task: ExamTask;
    updateTask: (id: string, updates: Partial<ExamTask>) => void;
    topologyDevices: TopologyDevice[];
    getDevicePorts: (deviceId: string) => { id: string; label: string }[];
    isTr: boolean;
    isDark: boolean;
}

export function TaskFormFields({
    task,
    updateTask,
    topologyDevices,
    getDevicePorts,
    isTr,
    isDark
}: TaskFormFieldsProps) {
    return (
        <div className={cn(
            "p-2 rounded-lg border space-y-2",
            isDark ? "bg-secondary-950/30 border-secondary-700/50" : "bg-secondary-50 border-secondary-200"
        )}>
            {task.checkType === 'command' && (
                <div className="space-y-1">
                    <label className="text-[9px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Komut Deseni (Regex)' : 'Command Pattern (Regex)'}</label>
                    <div className="flex gap-1">
                        <Input
                            value={task.checkParams?.commandPattern || ''}
                            onChange={(e) => updateTask(task.id, {
                                checkParams: { ...task.checkParams, commandPattern: e.target.value }
                            })}
                            className="h-7 text-[11px] font-mono flex-1 min-w-0"
                            placeholder="orn: hostname .+"
                        />
                        <Select
                            value=""
                            onValueChange={(val) => updateTask(task.id, {
                                checkParams: { ...task.checkParams, commandPattern: val }
                            })}
                        >
                            <SelectTrigger className="h-7 w-[26px] p-0 flex-shrink-0">
                                <span className="text-[10px] opacity-60">↓</span>
                            </SelectTrigger>
                            <SelectContent align="end" className="max-h-[200px]">
                                <div className="text-[10px] font-bold opacity-50 px-2 py-1">{isTr ? 'Hazır Komutlar' : 'Preset Patterns'}</div>
                                <SelectItem value="hostname\\s+.+">hostname .+</SelectItem>
                                <SelectItem value="ip\\s+route\\s+0\\.0\\.0\\.0\\s+0\\.0\\.0\\.0\\s+.+">ip route default</SelectItem>
                                <SelectItem value="interface\\s+.+">interface .+</SelectItem>
                                <SelectItem value="vlan\\s+\\d+">vlan number</SelectItem>
                                <SelectItem value="enable\\s+secret\\s+.+">enable secret .+</SelectItem>
                                <SelectItem value="line\\s+console\\s+0">line console 0</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {task.checkType === 'config' && (
                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Anahtar' : 'Key'}</label>
                            <div className="flex gap-1">
                                <Input
                                    value={task.checkParams?.configKey || ''}
                                    onChange={(e) => updateTask(task.id, {
                                        checkParams: { ...task.checkParams, configKey: e.target.value }
                                    })}
                                    className="h-7 text-[11px] font-mono flex-1 min-w-0"
                                    placeholder="ports.fa0/1.shutdown"
                                />
                                <Select
                                    value=""
                                    onValueChange={(val) => updateTask(task.id, {
                                        checkParams: { ...task.checkParams, configKey: val }
                                    })}
                                >
                                    <SelectTrigger className="h-7 w-[26px] p-0 flex-shrink-0">
                                        <span className="text-[10px] opacity-60">↓</span>
                                    </SelectTrigger>
                                    <SelectContent align="end" className="max-h-[200px]">
                                        <div className="text-[10px] font-bold opacity-50 px-2 py-1">{isTr ? 'Sık kullanılanlar' : 'Suggestions'}</div>
                                        <SelectItem value="security.consoleLine.password">security.consoleLine.password</SelectItem>
                                        <SelectItem value="ports.gi1/0/1.shutdown">ports.gi1/0/1.shutdown (L3)</SelectItem>
                                        <SelectItem value="ports.fa0/1.shutdown">ports.fa0/1.shutdown (L2)</SelectItem>
                                        <SelectItem value="ports.gi1/0/1.vlan">ports.gi1/0/1.vlan (L3)</SelectItem>
                                        <SelectItem value="ports.fa0/1.vlan">ports.fa0/1.vlan (L2)</SelectItem>
                                        <SelectItem value="vlans.10">vlans.10</SelectItem>
                                        <SelectItem value="pc.pc-1.ip">pc.pc-1.ip</SelectItem>
                                        <SelectItem value="pc.pc-2.ip">pc.pc-2.ip</SelectItem>
                                        {topologyDevices.filter(d => d.type === 'router' || d.type === 'switchL3').flatMap(d =>
                                            d.ports.filter(p => p.id !== 'console' && p.id !== 'wlan0').map(p => ({
                                                label: `${d.id}.${p.id}.ipAddress`,
                                                value: `ports.${d.id}.${p.id}.ipAddress`
                                            }))
                                        ).map(item => (
                                            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Değer' : 'Value'}</label>
                            <div className="flex gap-1">
                                <Input
                                    value={String(task.checkParams?.configValue ?? '')}
                                    onChange={(e) => updateTask(task.id, {
                                        checkParams: { ...task.checkParams, configValue: e.target.value }
                                    })}
                                    className="h-7 text-[11px] font-mono flex-1 min-w-0"
                                />
                                <Select
                                    value=""
                                    onValueChange={(val) => updateTask(task.id, {
                                        checkParams: { ...task.checkParams, configValue: val }
                                    })}
                                >
                                    <SelectTrigger className="h-7 w-[26px] p-0 flex-shrink-0">
                                        <span className="text-[10px] opacity-60">↓</span>
                                    </SelectTrigger>
                                    <SelectContent align="end">
                                        <div className="text-[10px] font-bold opacity-50 px-2 py-1">{isTr ? 'Sık Değerler' : 'Common Values'}</div>
                                        <SelectItem value="true">true</SelectItem>
                                        <SelectItem value="false">false</SelectItem>
                                        <SelectItem value="up">up</SelectItem>
                                        <SelectItem value="down">down</SelectItem>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="192.168.1.1">192.168.1.1</SelectItem>
                                        <SelectItem value="255.255.255.0">255.255.255.0</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {task.checkType === 'connection' && (
                <div className="space-y-2">
                    {(() => {
                        const sourceDeviceId = task.checkParams?.sourceDevice || '';
                        const targetDeviceId = task.checkParams?.targetDevice || '';
                        const sourcePorts = getDevicePorts(sourceDeviceId);
                        const targetPorts = getDevicePorts(targetDeviceId);
                        const hasDevices = topologyDevices.length > 0;
                        const sourceDeviceOptions = topologyDevices.filter(d => d.id !== targetDeviceId);
                        const targetDeviceOptions = topologyDevices.filter(d => d.id !== sourceDeviceId);
                        const isValidSourceDevice = sourceDeviceOptions.some(d => d.id === sourceDeviceId);
                        const isValidTargetDevice = targetDeviceOptions.some(d => d.id === targetDeviceId);
                        const selectedSourcePort = task.checkParams?.sourcePort;
                        const selectedTargetPort = task.checkParams?.targetPort;
                        const isValidSourcePort = sourcePorts.some((p) => p.id === selectedSourcePort);
                        const isValidTargetPort = targetPorts.some((p) => p.id === selectedTargetPort);

                        return (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Kablo Tipi' : 'Cable Type'}</label>
                                        <Select
                                            value={task.checkParams?.cableType || ''}
                                            onValueChange={(val) => updateTask(task.id, {
                                                checkParams: { ...task.checkParams, cableType: val as 'straight' | 'crossover' | 'console' }
                                            })}
                                        >
                                            <SelectTrigger className="h-7 text-[11px]">
                                                <SelectValue placeholder={isTr ? 'Seçin...' : 'Select...'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="straight">{isTr ? 'Düz' : 'Straight'}</SelectItem>
                                                <SelectItem value="crossover">{isTr ? 'Çapraz' : 'Crossover'}</SelectItem>
                                                <SelectItem value="console">{isTr ? 'Konsol' : 'Console'}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Kaynak Cihaz ve Port' : 'Source Device & Port'}</label>
                                        <Select
                                            value={(isValidSourceDevice && isValidSourcePort) ? `${sourceDeviceId}::${selectedSourcePort}` : undefined}
                                            onValueChange={(val) => {
                                                const [devId, portId] = val.split('::');
                                                updateTask(task.id, {
                                                    checkParams: { ...task.checkParams, sourceDevice: devId, sourcePort: portId }
                                                });
                                            }}
                                        >
                                            <SelectTrigger className="h-7 text-[11px]">
                                                <SelectValue placeholder={isTr ? 'Cihaz ve Port Seçin...' : 'Select Device and Port...'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {!hasDevices && (
                                                    <SelectItem value="__no_devices__" disabled>
                                                        {isTr ? 'Topolojide cihaz yok' : 'No devices in topology'}
                                                    </SelectItem>
                                                )}
                                                {sourceDeviceOptions.map(d => (
                                                    <SelectGroup key={d.id}>
                                                        <SelectLabel className="text-[10px] bg-secondary-900/50 py-1">{d.name} ({d.id})</SelectLabel>
                                                        {d.ports.length === 0 ? (
                                                            <SelectItem value={`__no_ports_${d.id}__`} disabled className="text-[10px]">
                                                                {isTr ? 'Port yok' : 'No ports'}
                                                            </SelectItem>
                                                        ) : (
                                                            d.ports.map(p => (
                                                                <SelectItem key={`${d.id}::${p.id}`} value={`${d.id}::${p.id}`} className="pl-6 text-[11px]">
                                                                    {p.label || p.id}
                                                                </SelectItem>
                                                            ))
                                                        )}
                                                    </SelectGroup>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Hedef Cihaz ve Port' : 'Target Device & Port'}</label>
                                        <Select
                                            value={(isValidTargetDevice && isValidTargetPort) ? `${targetDeviceId}::${selectedTargetPort}` : undefined}
                                            onValueChange={(val) => {
                                                const [devId, portId] = val.split('::');
                                                updateTask(task.id, {
                                                    checkParams: { ...task.checkParams, targetDevice: devId, targetPort: portId }
                                                });
                                            }}
                                        >
                                            <SelectTrigger className="h-7 text-[11px]">
                                                <SelectValue placeholder={isTr ? 'Cihaz ve Port Seçin...' : 'Select Device and Port...'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {!hasDevices && (
                                                    <SelectItem value="__no_devices_target__" disabled>
                                                        {isTr ? 'Topolojide cihaz yok' : 'No devices in topology'}
                                                    </SelectItem>
                                                )}
                                                {targetDeviceOptions.map(d => (
                                                    <SelectGroup key={d.id}>
                                                        <SelectLabel className="text-[10px] bg-secondary-900/50 py-1">{d.name} ({d.id})</SelectLabel>
                                                        {d.ports.length === 0 ? (
                                                            <SelectItem value={`__no_target_ports_${d.id}__`} disabled className="text-[10px]">
                                                                {isTr ? 'Port yok' : 'No ports'}
                                                            </SelectItem>
                                                        ) : (
                                                            d.ports.map(p => (
                                                                <SelectItem key={`${d.id}::${p.id}`} value={`${d.id}::${p.id}`} className="pl-6 text-[11px]">
                                                                    {p.label || p.id}
                                                                </SelectItem>
                                                            ))
                                                        )}
                                                    </SelectGroup>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}

            {task.checkType === 'deviceAccess' && (
                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Cihaz Tipi' : 'Device Type'}</label>
                            <Select
                                value={task.checkParams?.deviceType || ''}
                                onValueChange={(val) => updateTask(task.id, {
                                    checkParams: { ...task.checkParams, deviceType: val as 'switch' | 'router' | 'pc', targetDeviceId: undefined }
                                })}
                            >
                                <SelectTrigger className="h-7 text-[11px]">
                                    <SelectValue placeholder={isTr ? 'Seçin...' : 'Select...'} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="switch">{isTr ? 'Switch' : 'Switch'}</SelectItem>
                                    <SelectItem value="router">{isTr ? 'Router' : 'Router'}</SelectItem>
                                    <SelectItem value="pc">PC</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Topolojideki Cihaz' : 'Topology Device'}</label>
                            <Select
                                value={task.checkParams?.targetDeviceId || '__any__'}
                                onValueChange={(val) => updateTask(task.id, {
                                    checkParams: { ...task.checkParams, targetDeviceId: val === '__any__' ? undefined : val }
                                })}
                            >
                                <SelectTrigger className="h-7 text-[11px]">
                                    <SelectValue placeholder={isTr ? 'Seçin...' : 'Select...'} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__any__">{isTr ? 'Herhangi biri' : 'Any device'}</SelectItem>
                                    {topologyDevices
                                        .filter((d) => {
                                            if (task.checkParams?.deviceType === 'switch') return d.type === 'switchL2' || d.type === 'switchL3';
                                            if (task.checkParams?.deviceType === 'router') return d.type === 'router';
                                            if (task.checkParams?.deviceType === 'pc') return d.type === 'pc';
                                            return true;
                                        })
                                        .map((d) => (
                                            <SelectItem key={d.id} value={d.id}>{d.name} ({d.id})</SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex items-center gap-1.5 mt-1">
                <Info className="w-3 h-3 text-primary-500 opacity-60" />
                <p className="text-[9px] opacity-50 leading-tight">
                    {isTr ? 'Bu değerler topolojideki cihaz ID\'leri ile eşleşmelidir.' : 'These values must match device IDs in the topology.'}
                </p>
            </div>
        </div>
    );
}
