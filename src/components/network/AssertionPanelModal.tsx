import React, { useState } from 'react';
import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import {
  evaluateNetworkAssertion,
  NetworkAssertionRule,
  AssertionResult,
  NetworkAssertionType
} from '@/lib/network/networkAssertionEngine';
import { CheckCircle2, XCircle, Play, Plus, Trash2, CheckSquare, X } from 'lucide-react';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { WINDOW_CLOSE_BUTTON_CLASS, WINDOW_CANCEL_BUTTON_CLASS, WINDOW_TITLE_CLASS } from '@/components/ui/windowStandards';

interface AssertionPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  deviceStates?: Map<string, SwitchState>;
  language?: 'tr' | 'en';
}

const tr = {
  title: 'Ağ Doğrulama (Assertion Engine) Paneli',
  addNewRule: 'Yeni Doğrulama Kuralı Ekle',
  selectSource: 'Kaynak Cihaz Seç...',
  selectTarget: 'Hedef Cihaz Seç...',
  ruleTypes: {
    PING_SUCCESS: 'Ping Başarılı Olmalı',
    PING_FAIL: 'Ping Başarısız Olmalı',
    PORT_REACHABLE: 'Port Erişilebilir',
    PORT_BLOCKED: 'Port Engelli (Firewall/ACL)',
  },
  addRule: 'Kural Ekle',
  activeCriteria: (count: number) => `Aktif Kriterler (${count})`,
  runAll: 'Tümünü Çalıştır',
  noRules: 'Henüz tanımlı kural yok.',
};

const en = {
  title: 'Network Assertion Engine Panel',
  addNewRule: 'Add New Assertion Rule',
  selectSource: 'Select Source Device...',
  selectTarget: 'Select Target Device...',
  ruleTypes: {
    PING_SUCCESS: 'Ping Must Succeed',
    PING_FAIL: 'Ping Must Fail',
    PORT_REACHABLE: 'Port Reachable',
    PORT_BLOCKED: 'Port Blocked (Firewall/ACL)',
  },
  addRule: 'Add Rule',
  activeCriteria: (count: number) => `Active Criteria (${count})`,
  runAll: 'Run All',
  noRules: 'No rules defined yet.',
};

export const AssertionPanelModal: React.FC<AssertionPanelModalProps> = ({
  isOpen,
  onClose,
  devices,
  connections,
  deviceStates,
  language: propLanguage,
}) => {
  const { language: contextLanguage } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const effectiveLanguage = propLanguage || contextLanguage || 'tr';
  const t = effectiveLanguage === 'en' ? en : tr;

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

  useModalDismiss({
    isOpen,
    onClose,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
      <div className={`w-full max-w-2xl border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] ${isDark ? 'bg-secondary-950 border-secondary-800 text-secondary-100' : 'bg-white border-secondary-200 text-secondary-900'}`}>
        {/* Header */}
        <div className={`px-4 sm:px-6 py-3.5 sm:py-4 border-b flex items-center justify-between ${isDark ? 'bg-secondary-900/60 border-secondary-800' : 'bg-secondary-50 border-secondary-200'}`}>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-500" />
            <h2 className={WINDOW_TITLE_CLASS(isDark)}>
              {t.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={effectiveLanguage === 'tr' ? 'Kapat' : 'Close'}
            title={effectiveLanguage === 'tr' ? 'Kapat' : 'Close'}
            className={WINDOW_CLOSE_BUTTON_CLASS}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1 custom-scrollbar">
          {/* Add Rule Form */}
          <div className={`p-3.5 sm:p-4 rounded-xl border space-y-3 ${isDark ? 'bg-secondary-900/40 border-secondary-800' : 'bg-secondary-50 border-secondary-200'}`}>
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
              {t.addNewRule}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <select
                value={srcId}
                onChange={e => setSrcId(e.target.value)}
                className={`px-3 py-2 text-xs rounded-lg border ${isDark ? 'bg-secondary-900 border-secondary-700 text-secondary-100' : 'bg-white border-secondary-300 text-secondary-900'}`}
              >
                <option value="">{t.selectSource}</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name || d.id}
                  </option>
                ))}
              </select>

              <select
                value={tgtId}
                onChange={e => setTgtId(e.target.value)}
                className={`px-3 py-2 text-xs rounded-lg border ${isDark ? 'bg-secondary-900 border-secondary-700 text-secondary-100' : 'bg-white border-secondary-300 text-secondary-900'}`}
              >
                <option value="">{t.selectTarget}</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name || d.id}
                  </option>
                ))}
              </select>

              <select
                value={ruleType}
                onChange={e => setRuleType(e.target.value as NetworkAssertionType)}
                className={`px-3 py-2 text-xs rounded-lg border ${isDark ? 'bg-secondary-900 border-secondary-700 text-secondary-100' : 'bg-white border-secondary-300 text-secondary-900'}`}
              >
                <option value="PING_SUCCESS">{t.ruleTypes.PING_SUCCESS}</option>
                <option value="PING_FAIL">{t.ruleTypes.PING_FAIL}</option>
                <option value="PORT_REACHABLE">{t.ruleTypes.PORT_REACHABLE}</option>
                <option value="PORT_BLOCKED">{t.ruleTypes.PORT_BLOCKED}</option>
              </select>
            </div>
            <button
              onClick={handleAddRule}
              disabled={!srcId || !tgtId}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" /> {t.addRule}
            </button>
          </div>

          {/* Rules List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                {t.activeCriteria(rules.length)}
              </h3>
              <button
                onClick={handleRunAll}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> {t.runAll}
              </button>
            </div>

            {rules.length === 0 ? (
              <p className={`text-xs italic ${isDark ? 'text-secondary-500' : 'text-secondary-400'}`}>{t.noRules}</p>
            ) : (
              <div className="space-y-2">
                {rules.map(rule => {
                  const res = results.find(r => r.ruleId === rule.id);
                  const description = effectiveLanguage === 'en' ? (rule.descriptionEn || rule.descriptionTr) : (rule.descriptionTr || rule.descriptionEn);
                  const resultMsg = res ? (effectiveLanguage === 'en' ? (res.messageEn || res.messageTr) : (res.messageTr || res.messageEn)) : null;
                  return (
                    <div
                      key={rule.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 shadow-sm ${isDark ? 'bg-secondary-900/60 border-secondary-800 text-secondary-100' : 'bg-white border-secondary-200 text-secondary-900'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {res ? (
                          res.passed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                          )
                        ) : (
                          <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${isDark ? 'border-secondary-600' : 'border-secondary-300'}`} />
                        )}
                        <div className="min-w-0">
                          <p className={`text-xs font-medium truncate ${isDark ? 'text-secondary-200' : 'text-secondary-800'}`}>
                            {description}
                          </p>
                          {resultMsg && (
                            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                              {resultMsg}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveRule(rule.id)}
                        className={`p-1.5 rounded-lg transition ${isDark ? 'text-secondary-400 hover:text-rose-400 hover:bg-secondary-800' : 'text-secondary-400 hover:text-rose-600 hover:bg-secondary-100'}`}
                        aria-label={effectiveLanguage === 'tr' ? 'Kuralı sil' : 'Delete rule'}
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

        {/* Footer */}
        <div className={`px-4 sm:px-6 py-3 border-t flex items-center justify-end ${isDark ? 'border-secondary-800 bg-secondary-900/50' : 'border-secondary-200 bg-secondary-50'}`}>
          <button
            onClick={onClose}
            className={WINDOW_CANCEL_BUTTON_CLASS(isDark)}
          >
            {effectiveLanguage === 'tr' ? 'Vazgeç' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};

