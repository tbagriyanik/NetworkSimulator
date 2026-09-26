import { Target, Plus, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { FaultDefinition, FaultType } from '@/lib/network/faults';
import { ExamProject } from '@/lib/network/examMode';
import type { TopologyDevice } from './examUtils';

export interface FaultInjectionCardProps {
    activeExam: ExamProject;
    topologyDevices: TopologyDevice[];
    updateExamMeta: (updates: Partial<ExamProject>) => void;
    isTr: boolean;
    isDark: boolean;
}

export function FaultInjectionCard({ activeExam, topologyDevices, updateExamMeta, isTr, isDark }: FaultInjectionCardProps) {
    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                    <Target className="w-4 h-4 text-warning-500" />
                    {isTr ? 'Hata Enjeksiyonu' : 'Fault Injection'}
                </h3>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1 border-warning-500/50 text-warning-600 hover:bg-warning-500/10"
                    onClick={() => {
                        const newFault: FaultDefinition = {
                            id: `fault-${Date.now()}`,
                            faultType: 'wrongSubnetMask',
                            deviceId: topologyDevices[0]?.id || '',
                            configKey: '',
                            faultValue: null,
                            correctValue: null,
                            description: { tr: 'Yanlış Subnet Mask', en: 'Wrong Subnet Mask' }
                        };
                        updateExamMeta({
                            injectedFaults: [...(activeExam.injectedFaults || []), newFault]
                        });
                    }}
                >
                    <Plus className="w-3.5 h-3.5" />
                    {isTr ? 'Arıza Ekle' : 'Add Fault'}
                </Button>
            </div>

            {(!activeExam.injectedFaults || activeExam.injectedFaults.length === 0) ? (
                <div className={cn(
                    "p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center",
                    isDark ? "border-warning-900/30 bg-warning-950/10" : "border-warning-200 bg-warning-50/30"
                )}>
                    <AlertCircle className="w-8 h-8 opacity-20 mb-2 text-warning-500" />
                    <p className="text-xs font-medium opacity-40">
                        {isTr ? 'Sisteme arıza enjekte edilmedi.' : 'No faults injected.'}
                    </p>
                    <p className="text-[10px] opacity-30 mt-1">
                        {isTr ? 'Öğrenciler için sorun giderme senaryoları oluşturun.' : 'Create troubleshooting scenarios for students.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {activeExam.injectedFaults.map((fault, index) => (
                        <Card
                            key={fault.id}
                            className={cn(
                                "overflow-hidden transition-all duration-200",
                                isDark ? "bg-secondary-800/40 border-warning-900/50" : "bg-warning-50/50 border-warning-200"
                            )}
                        >
                            <div className="p-3">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-warning-500/20 flex items-center justify-center text-[10px] font-bold text-warning-600">
                                            F{index + 1}
                                        </div>
                                        <div className="font-bold text-xs">
                                            {isTr ? fault.description.tr : fault.description.en}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-error-500 hover:bg-error-500/10"
                                        aria-label={isTr ? 'Hatayı kaldır' : 'Remove fault'}
                                        title={isTr ? 'Hatayı kaldır' : 'Remove fault'}
                                        onClick={() => {
                                            updateExamMeta({
                                                injectedFaults: (activeExam.injectedFaults || []).filter(f => f.id !== fault.id)
                                            });
                                        }}
                                    >
                                        <Trash2 className="w-3.5 h-3.5 text-error-500" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold opacity-50 uppercase ml-1">
                                            {isTr ? 'Cihaz' : 'Device'}
                                        </label>
                                        <Select
                                            value={fault.deviceId}
                                            onValueChange={(val) => {
                                                const newFaults = [...(activeExam.injectedFaults || [])];
                                                newFaults[index].deviceId = val;
                                                updateExamMeta({ injectedFaults: newFaults });
                                            }}
                                        >
                                            <SelectTrigger className="h-7 text-[11px] border-warning-500/30">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {topologyDevices.map((d) => (
                                                    <SelectItem key={d.id} value={d.id}>{d.name} ({d.id})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold opacity-50 uppercase ml-1">
                                            {isTr ? 'Arıza Tipi' : 'Fault Type'}
                                        </label>
                                        <Select
                                            value={fault.faultType}
                                            onValueChange={(val) => {
                                                const newFaults = [...(activeExam.injectedFaults || [])];
                                                newFaults[index].faultType = val as FaultType;
                                                if (val === 'wrongSubnetMask') {
                                                    newFaults[index].configKey = 'vlan1.subnet';
                                                    newFaults[index].faultValue = '255.255.255.0';
                                                } else if (val === 'wrongVlan') {
                                                    newFaults[index].configKey = 'ports.fa0/1.vlan';
                                                } else if (val === 'shutdownInterface') {
                                                    newFaults[index].configKey = 'ports.fa0/1.shutdown';
                                                    newFaults[index].faultValue = true;
                                                    newFaults[index].correctValue = false;
                                                }
                                                updateExamMeta({ injectedFaults: newFaults });
                                            }}
                                        >
                                            <SelectTrigger className="h-7 text-[11px] border-warning-500/30">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="wrongSubnetMask">{isTr ? 'Yanlış Subnet Maskesi' : 'Wrong Subnet Mask'}</SelectItem>
                                                <SelectItem value="wrongVlan">{isTr ? 'Yanlış VLAN Ataması' : 'Wrong VLAN Assignment'}</SelectItem>
                                                <SelectItem value="shutdownInterface">{isTr ? 'Kapalı Arayüz' : 'Shutdown Interface'}</SelectItem>
                                                <SelectItem value="stpLoop">{isTr ? 'STP Döngüsü / Loop' : 'STP Loop'}</SelectItem>
                                                <SelectItem value="wrongAcl">{isTr ? 'Yanlış ACL' : 'Wrong ACL'}</SelectItem>
                                                <SelectItem value="custom">{isTr ? 'Özel Konfigürasyon' : 'Custom Config'}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid gap-2 mt-2">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold opacity-50 uppercase ml-1">
                                            {isTr ? 'Açıklama' : 'Description'}
                                        </label>
                                        <Input
                                            value={isTr ? fault.description.tr : fault.description.en}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const newFaults = [...(activeExam.injectedFaults || [])];
                                                newFaults[index].description = isTr
                                                    ? { ...newFaults[index].description, tr: val }
                                                    : { ...newFaults[index].description, en: val };
                                                updateExamMeta({ injectedFaults: newFaults });
                                            }}
                                            className="h-7 text-[11px] border-warning-500/30"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold opacity-50 uppercase ml-1">
                                            {isTr ? 'Kontrol Anahtarı (Örn: ports.fa0/1.vlan)' : 'Check Key'}
                                        </label>
                                        <Input
                                            value={fault.configKey || ''}
                                            onChange={(e) => {
                                                const newFaults = [...(activeExam.injectedFaults || [])];
                                                newFaults[index].configKey = e.target.value;
                                                updateExamMeta({ injectedFaults: newFaults });
                                            }}
                                            className="h-7 text-[11px] border-warning-500/30 font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </section>
    );
}
