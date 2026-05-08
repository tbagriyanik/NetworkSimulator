'use client';

import { useState, useCallback } from 'react';
import { FirewallRule, CanvasDevice } from './networkTopology.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { Translations } from '@/contexts/LanguageContext';

interface FirewallPanelProps {
  device: CanvasDevice;
  t: Translations;
  theme: string;
  onUpdateRules: (rules: FirewallRule[]) => void;
  isDevicePoweredOff?: boolean;
}

export function FirewallPanel({
  device,
  t,
  theme,
  onUpdateRules,
  isDevicePoweredOff = false
}: FirewallPanelProps) {
  const isDark = theme === 'dark';
  const rules = device.firewallRules || [];

  const [newRule, setNewRule] = useState<Omit<FirewallRule, 'id'>>({
    sourceIp: '*',
    targetIp: '*',
    port: '*',
    protocol: 'any',
    action: 'allow',
    enabled: true
  });

  const handleAddRule = useCallback(() => {
    const rule: FirewallRule = {
      ...newRule,
      id: Math.random().toString(36).substr(2, 9)
    };
    const updatedRules = [...rules, rule];
    onUpdateRules(updatedRules);
    toast({
      title: t.language === 'tr' ? 'Kural Eklendi' : 'Rule Added',
      description: t.language === 'tr' ? 'Firewall kuralı başarıyla eklendi.' : 'Firewall rule added successfully.',
    });
  }, [newRule, rules, onUpdateRules, t.language]);

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

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const itemBg = isDark ? 'bg-slate-900' : 'bg-slate-50';

  return (
    <Card className={`${cardBg} transition-all duration-300`}>
      <CardHeader className="py-3 px-5 border-b">
        <CardTitle className="text-red-500 text-base sm:text-lg flex items-center gap-2">
          <Shield className="w-5 h-5" />
          {t.language === 'tr' ? 'Firewall Yapılandırması' : 'Firewall Configuration'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
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
                onChange={e => setNewRule({...newRule, sourceIp: e.target.value})}
                placeholder="*"
                className="h-8 text-xs"
                disabled={isDevicePoweredOff}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">{t.language === 'tr' ? 'Hedef IP' : 'Target IP'}</label>
              <Input
                value={newRule.targetIp}
                onChange={e => setNewRule({...newRule, targetIp: e.target.value})}
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
                onChange={e => setNewRule({...newRule, port: e.target.value})}
                placeholder="*"
                className="h-8 text-xs"
                disabled={isDevicePoweredOff}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">{t.language === 'tr' ? 'Protokol' : 'Protocol'}</label>
              <Select
                value={newRule.protocol}
                onValueChange={(v: any) => setNewRule({...newRule, protocol: v})}
                disabled={isDevicePoweredOff}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
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
                onValueChange={(v: any) => setNewRule({...newRule, action: v})}
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
            onClick={handleAddRule}
            className="w-full h-8 bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
            disabled={isDevicePoweredOff}
          >
            <Plus className="w-4 h-4 mr-1" /> {t.language === 'tr' ? 'Kural Ekle' : 'Add Rule'}
          </Button>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {rules.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs italic">
              {t.language === 'tr' ? 'Henüz kural tanımlanmamış. Varsayılan: Her şeye izin ver.' : 'No rules defined. Default: Allow all.'}
            </div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${itemBg} ${!rule.enabled ? 'opacity-50' : ''}`}
              >
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={`p-1.5 rounded-md hover:bg-slate-700/50 transition-colors ${rule.enabled ? 'text-green-500' : 'text-slate-500'}`}
                    disabled={isDevicePoweredOff}
                  >
                    {rule.enabled ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-500 transition-colors"
                    disabled={isDevicePoweredOff}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
