import React, { useState } from 'react';
import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import {
  evaluateNetworkAssertion,
  NetworkAssertionRule,
  AssertionResult,
  NetworkAssertionType
} from '@/lib/network/networkAssertionEngine';
import { CheckCircle2, XCircle, Play, Plus, Trash2, CheckSquare } from 'lucide-react';

interface AssertionPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  deviceStates?: Map<string, SwitchState>;
}

export const AssertionPanelModal: React.FC<AssertionPanelModalProps> = ({
  isOpen,
  onClose,
  devices,
  connections,
  deviceStates,
}) => {
  const [rules, setRules] = useState<NetworkAssertionRule[]>([
    {
      id: 'rule-1',
      type: 'PING_SUCCESS',
      sourceDeviceId: devices[0]?.id || '',
      targetDeviceId: devices[1]?.id || '',
      descriptionTr: 'Erişilebilirlik Doğrulaması',
      descriptionEn: 'Reachability Assertion',
    },
  ]);

  const [results, setResults] = useState<AssertionResult[]>([]);
  const [srcId, setSrcId] = useState<string>('');
  const [tgtId, setTgtId] = useState<string>('');
  const [ruleType, setRuleType] = useState<NetworkAssertionType>('PING_SUCCESS');

  if (!isOpen) return null;

  const handleRunAll = () => {
    const resList = rules.map(r => evaluateNetworkAssertion(r, devices, connections, deviceStates));
    setResults(resList);
  };

  const handleAddRule = () => {
    if (!srcId || !tgtId) return;
    const newRule: NetworkAssertionRule = {
      id: `rule-${Date.now()}`,
      type: ruleType,
      sourceDeviceId: srcId,
      targetDeviceId: tgtId,
      descriptionTr: `${ruleType}: ${srcId} -> ${tgtId}`,
      descriptionEn: `${ruleType}: ${srcId} -> ${tgtId}`,
    };
    setRules(prev => [...prev, newRule]);
  };

  const handleRemoveRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    setResults(prev => prev.filter(r => r.ruleId !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Ağ Doğrulama (Assertion Engine) Paneli
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-lg px-2"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Add Rule Form */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Yeni Doğrulama Kuralı Ekle
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={srcId}
                onChange={e => setSrcId(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="">Kaynak Cihaz Seç...</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name || d.id}
                  </option>
                ))}
              </select>

              <select
                value={tgtId}
                onChange={e => setTgtId(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="">Hedef Cihaz Seç...</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name || d.id}
                  </option>
                ))}
              </select>

              <select
                value={ruleType}
                onChange={e => setRuleType(e.target.value as NetworkAssertionType)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="PING_SUCCESS">Ping Başarılı Olmalı</option>
                <option value="PING_FAIL">Ping Başarısız Olmalı</option>
                <option value="PORT_REACHABLE">Port Erişilebilir</option>
                <option value="PORT_BLOCKED">Port Engelli (Firewall/ACL)</option>
              </select>
            </div>
            <button
              onClick={handleAddRule}
              disabled={!srcId || !tgtId}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" /> Kural Ekle
            </button>
          </div>

          {/* Rules List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Aktif Kriterler ({rules.length})
              </h3>
              <button
                onClick={handleRunAll}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Tümünü Çalıştır
              </button>
            </div>

            {rules.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Henüz tanımlı kural yok.</p>
            ) : (
              <div className="space-y-2">
                {rules.map(rule => {
                  const res = results.find(r => r.ruleId === rule.id);
                  return (
                    <div
                      key={rule.id}
                      className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {res ? (
                          res.passed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                          )
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            {rule.descriptionTr}
                          </p>
                          {res && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {res.messageTr}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveRule(rule.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
