'use client';

import { useState, useCallback, useMemo } from 'react';
import { FirewallRule, CanvasDevice } from './networkTopology.types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, CheckCircle2, XCircle, GripVertical, Terminal as TerminalIcon, Filter, X, Zap } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { Translations } from '@/contexts/LanguageContext';
import { Terminal } from './Terminal';
import { SwitchState } from '@/lib/network/types';
import { getPrompt } from '@/lib/network/executor';

interface FirewallPanelProps {
  device: CanvasDevice;
  t: Translations;
  theme: string;
  onUpdateRules: (rules: FirewallRule[]) => void;
  isDevicePoweredOff?: boolean;
  deviceStates: Map<string, SwitchState>;
  deviceOutputs: Map<string, any[]>;
  onExecuteCommand: (command: string) => Promise<void>;
  onUpdateHistory: (deviceId: string, history: string[]) => void;
  setConfirmDialog: (dialog: any) => void;
  confirmDialog: any;
  onClose?: () => void;
  topologyDevices?: CanvasDevice[];
  activeTab?: 'console' | 'settings';
  onTabChange?: (tab: 'console' | 'settings') => void;
  onTogglePower?: (deviceId: string) => void;
}

export function FirewallPanel({
  device,
  t,
  theme,
  onUpdateRules,
  isDevicePoweredOff = false,
  deviceStates,
  deviceOutputs,
  onExecuteCommand,
  onUpdateHistory,
  setConfirmDialog,
  confirmDialog,
  onClose,
  topologyDevices = [],
  activeTab,
  onTabChange,
  onTogglePower
}: FirewallPanelProps) {
  const isDark = theme === 'dark';
  const rules = device.firewallRules || [];
  const language = t.language as 'tr' | 'en';

  const state = useMemo(() => {
    return deviceStates.get(device.id) || {
      hostname: 'asa',
      currentMode: 'user',
      ports: {},
      security: { consoleLine: {}, vtyLines: {} }
    } as any;
  }, [deviceStates, device.id]);

  const output = useMemo(() => {
    return deviceOutputs.get(device.id) || [];
  }, [deviceOutputs, device.id]);

  const [newRule, setNewRule] = useState<Omit<FirewallRule, 'id'>>({
    sourceIp: '*',
    targetIp: '*',
    port: '*',
    protocol: 'any',
    action: 'allow',
    enabled: true
  });

  const handleAddRule = useCallback((overrideRule?: Partial<FirewallRule>) => {
    const rule: FirewallRule = {
      ...newRule,
      ...overrideRule,
      id: Math.random().toString(36).substr(2, 9)
    };
    const updatedRules = [...rules, rule];
    onUpdateRules(updatedRules);
    toast({
      title: t.language === 'tr' ? 'Kural Eklendi' : 'Rule Added',
      description: t.language === 'tr' ? 'Firewall kuralı başarıyla eklendi.' : 'Firewall rule added successfully.',
    });
  }, [newRule, rules, onUpdateRules, t.language]);

  const addServiceRule = (service: string) => {
    let protocol: 'tcp' | 'udp' | 'icmp' | 'any' = 'tcp';
    let port = '*';
    let action: 'allow' | 'deny' = 'allow';

    switch (service) {
      case 'http': port = '80'; break;
      case 'https': port = '443'; break;
      case 'ftp': port = '21'; break;
      case 'ssh': port = '22'; break;
      case 'telnet': port = '23'; break;
      case 'smtp': port = '25'; break;
      case 'dns': protocol = 'udp'; port = '53'; break;
      case 'ntp': protocol = 'udp'; port = '123'; break;
      case 'icmp': protocol = 'icmp'; port = '*'; break;
      case 'deny-all': protocol = 'any'; port = '*'; action = 'deny'; break;
    }

    handleAddRule({ protocol, port, action, sourceIp: '*', targetIp: '*' });
  };

  const handleDeleteRule = useCallback((id: string) => {
    const updatedRules = rules.filter(r => r.id !== id);
    onUpdateRules(updatedRules);
  }, [rules, onUpdateRules]);

  const toggleRule = useCallback((id: string) => {
    const updatedRules = rules.map(r =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    onUpdateRules(updatedRules);
  }, [rules, onUpdateRules]);

  const moveRule = useCallback((oldIndex: number, newIndex: number) => {
    if (oldIndex === newIndex) return;
    const updatedRules = [...rules];
    const [movedRule] = updatedRules.splice(oldIndex, 1);
    updatedRules.splice(newIndex, 0, movedRule);
    onUpdateRules(updatedRules);
  }, [rules, onUpdateRules]);

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const itemBg = isDark ? 'bg-slate-900' : 'bg-slate-50';

  // Use controlled tabs if activeTab/onTabChange provided, otherwise uncontrolled
  const tabsValue = activeTab ?? 'console';
  const handleTabChange = (value: string) => {
    if (onTabChange && (value === 'console' || value === 'settings')) {
      onTabChange(value);
    }
  };

  return (
    <Card className={`${cardBg} transition-all duration-300 h-full flex flex-col py-0 gap-0`}>
      <CardContent className="p-0 flex-1 min-h-0">
        <Tabs value={tabsValue} onValueChange={handleTabChange} className="h-full flex flex-col">
          <div className="px-2 sm:px-4 pt-1 border-b bg-muted/30 flex-shrink-0">
            <TabsList className="bg-transparent gap-2 sm:gap-4 h-10 p-0 border-b-0 w-full flex min-w-0 overflow-visible justify-start">
              <TabsTrigger
                value="console"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-red-500 data-[state=active]:shadow-none rounded-none px-1 sm:px-2 h-10 gap-1 sm:gap-2 font-bold text-xs flex-1 sm:flex-none min-w-0 visible"
              >
                <TerminalIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{t.language === 'tr' ? 'Konsol' : 'Console'}</span>
                <span className="sm:hidden">{t.language === 'tr' ? 'CLI' : 'CLI'}</span>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-red-500 data-[state=active]:shadow-none rounded-none px-1 sm:px-2 h-10 gap-1 sm:gap-2 font-bold text-xs flex-1 sm:flex-none min-w-0 visible"
              >
                <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{t.language === 'tr' ? 'Hızlı Ayarlar' : 'Quick Settings'}</span>
                <span className="sm:hidden">{t.language === 'tr' ? 'Ayarlar' : 'Settings'}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="console" className="flex-1 min-h-0 m-0 p-0 overflow-hidden">
            <Terminal
              key="firewall-terminal"
              className="h-full"
              deviceId={device.id}
              deviceName={state.hostname}
              prompt={getPrompt(state)}
              state={state}
              onCommand={onExecuteCommand}
              onClear={() => { }}
              output={output}
              isLoading={false}
              isConnectionError={isDevicePoweredOff}
              connectionErrorMessage={t.connectionError}
              isPoweredOff={isDevicePoweredOff}
              onTogglePower={onTogglePower}
              onClose={onClose}
              onQuickSettings={() => onTabChange?.('settings')}
              t={t}
              theme={theme}
              language={language}
              onUpdateHistory={onUpdateHistory}
              confirmDialog={confirmDialog}
              setConfirmDialog={setConfirmDialog}
              device={device}
              devices={topologyDevices}
              deviceStates={deviceStates}
            />
          </TabsContent>

          <TabsContent value="settings" className="flex-1 min-h-0 m-0 p-4 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              {isDevicePoweredOff && (
                <div className="p-2 rounded bg-red-500/10 text-red-500 text-xs text-center border border-red-500/20">
                  {t.language === 'tr' ? 'Cihaz kapalı. Kural yönetimi devre dışı.' : 'Device is offline. Rule management disabled.'}
                </div>
              )}

              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-white border-slate-200'} space-y-3`}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{t.language === 'tr' ? 'Kaynak IP' : 'Source IP'}</label>
                    <Input
                      value={newRule.sourceIp}
                      onChange={e => setNewRule({ ...newRule, sourceIp: e.target.value })}
                      placeholder="*"
                      className="h-8 text-xs"
                      disabled={isDevicePoweredOff}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{t.language === 'tr' ? 'Hedef IP' : 'Target IP'}</label>
                    <Input
                      value={newRule.targetIp}
                      onChange={e => setNewRule({ ...newRule, targetIp: e.target.value })}
                      placeholder="*"
                      className="h-8 text-xs"
                      disabled={isDevicePoweredOff}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Port</label>
                    <Input
                      value={newRule.port}
                      onChange={e => setNewRule({ ...newRule, port: e.target.value })}
                      placeholder="*"
                      className="h-8 text-xs"
                      disabled={isDevicePoweredOff}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{t.language === 'tr' ? 'Protokol' : 'Protocol'}</label>
                    <Select
                      value={newRule.protocol}
                      onValueChange={(v: any) => setNewRule({ ...newRule, protocol: v })}
                      disabled={isDevicePoweredOff}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">{t.language === 'tr' ? 'Herhangi' : 'Any'}</SelectItem>
                        <SelectItem value="tcp">TCP</SelectItem>
                        <SelectItem value="udp">UDP</SelectItem>
                        <SelectItem value="icmp">ICMP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{t.language === 'tr' ? 'Eylem' : 'Action'}</label>
                    <Select
                      value={newRule.action}
                      onValueChange={(v: any) => setNewRule({ ...newRule, action: v })}
                      disabled={isDevicePoweredOff}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allow">ALLOW</SelectItem>
                        <SelectItem value="deny">DENY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={() => handleAddRule()}
                  className="w-full h-8 bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                  disabled={isDevicePoweredOff}
                >
                  <Plus className="w-4 h-4 mr-1" /> {t.language === 'tr' ? 'Kural Ekle' : 'Add Rule'}
                </Button>
              </div>

              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-white border-slate-200'} space-y-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{t.language === 'tr' ? 'Hızlı Servisler' : 'Quick Services'}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-[10px] px-1" onClick={() => addServiceRule('http')} disabled={isDevicePoweredOff}>HTTP</Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] px-1" onClick={() => addServiceRule('https')} disabled={isDevicePoweredOff}>HTTPS</Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] px-1" onClick={() => addServiceRule('ftp')} disabled={isDevicePoweredOff}>FTP</Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] px-1" onClick={() => addServiceRule('ssh')} disabled={isDevicePoweredOff}>SSH</Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] px-1" onClick={() => addServiceRule('telnet')} disabled={isDevicePoweredOff}>TELNET</Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] px-1" onClick={() => addServiceRule('smtp')} disabled={isDevicePoweredOff}>SMTP</Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] px-1" onClick={() => addServiceRule('dns')} disabled={isDevicePoweredOff}>DNS</Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] px-1" onClick={() => addServiceRule('ntp')} disabled={isDevicePoweredOff}>NTP</Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] px-1" onClick={() => addServiceRule('icmp')} disabled={isDevicePoweredOff}>ICMP</Button>
                  <Button variant="destructive" size="sm" className="h-7 text-[10px] px-1" onClick={() => addServiceRule('deny-all')} disabled={isDevicePoweredOff}>DENY ALL</Button>
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {rules.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs italic">
                    {t.language === 'tr' ? 'Henüz kural tanımlanmamış. Varsayılan: Her şeye izin ver.' : 'No rules defined. Default: Allow all.'}
                  </div>
                ) : (
                  rules.map((rule, index) => (
                    <DraggableRuleItem
                      key={rule.id}
                      rule={rule}
                      index={index}
                      totalRules={rules.length}
                      itemBg={itemBg}
                      isDevicePoweredOff={isDevicePoweredOff}
                      onToggle={() => toggleRule(rule.id)}
                      onDelete={() => handleDeleteRule(rule.id)}
                      onMove={moveRule}
                      t={t}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface DraggableRuleItemProps {
  rule: FirewallRule;
  index: number;
  totalRules: number;
  itemBg: string;
  isDevicePoweredOff: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onMove: (oldIndex: number, newIndex: number) => void;
  t: Translations;
}

function DraggableRuleItem({
  rule,
  index,
  totalRules,
  itemBg,
  isDevicePoweredOff,
  onToggle,
  onDelete,
  onMove,
  t
}: DraggableRuleItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverPosition, setDragOverPosition] = useState<'above' | 'below' | null>(null);

  const handleDragStart = (e: React.DragEvent) => {
    if (isDevicePoweredOff) {
      e.preventDefault();
      return;
    }
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOverPosition(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isDevicePoweredOff) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const newPosition = e.clientY < midY ? 'above' : 'below';
    setDragOverPosition(newPosition);
  };

  const handleDragLeave = () => {
    setDragOverPosition(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isDevicePoweredOff) return;
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (isNaN(fromIndex)) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const dropBelow = e.clientY >= midY;

    let toIndex = dropBelow ? index + 1 : index;
    if (fromIndex < toIndex) {
      toIndex--;
    }

    if (fromIndex !== toIndex && fromIndex >= 0 && toIndex >= 0 && toIndex < totalRules) {
      onMove(fromIndex, toIndex);
    }
    setDragOverPosition(null);
  };

  const getBorderStyle = () => {
    if (!dragOverPosition) return '';
    if (dragOverPosition === 'above') return 'border-t-2 border-t-cyan-500';
    return 'border-b-2 border-b-cyan-500';
  };

  return (
    <div
      draggable={!isDevicePoweredOff}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${itemBg} ${!rule.enabled ? 'opacity-50' : ''} ${isDragging ? 'opacity-30' : ''} ${getBorderStyle()} transition-all`}
      style={{ cursor: isDevicePoweredOff ? 'not-allowed' : 'grab' }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          className="p-1.5 rounded-md hover:bg-slate-700/50 text-slate-500 transition-colors"
          disabled={isDevicePoweredOff}
          title={t.language === 'tr' ? 'Sürüklemek için tutun' : 'Hold to drag'}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${rule.action === 'allow' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
              {rule.action.toUpperCase()}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">{rule.protocol}</span>
          </div>
          <div className="text-xs font-mono truncate">
            {rule.sourceIp} &rarr; {rule.targetIp}:{rule.port}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onToggle}
          className={`p-2 rounded-md hover:bg-slate-700/50 transition-colors ${rule.enabled ? 'text-green-500 hover:bg-green-500/20' : 'text-slate-500 hover:bg-slate-700/30'}`}
          disabled={isDevicePoweredOff}
        >
          {rule.enabled ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-500 transition-colors"
          disabled={isDevicePoweredOff}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
