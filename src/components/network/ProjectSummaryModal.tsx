import { useEffect, useState } from 'react';
import { X, Code, Shield, Zap, BookOpen, Star, Copy, Check } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ProjectSummary } from '../../utils/generateSummary';

interface ProjectSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: ProjectSummary | null;
}

export function ProjectSummaryModal({ isOpen, onClose, summary }: ProjectSummaryModalProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'scores' | 'config'>('scores');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Reset tab when reopened
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isOpen) setActiveTab('scores');
  }, [isOpen]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen || !summary) return null;

  const scoreItems = [
    { label: 'Code & Config', value: summary.scores.code, icon: Code, color: 'text-blue-400', bg: 'bg-blue-500' },
    { label: 'CCNA Compliance', value: summary.scores.ccna, icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-500' },
    { label: 'Security', value: summary.scores.security, icon: Shield, color: 'text-red-400', bg: 'bg-red-500' },
    { label: 'UX / Topology', value: summary.scores.ux, icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500' },
    { label: 'UI Aesthetics', value: summary.scores.ui, icon: Star, color: 'text-pink-400', bg: 'bg-pink-500' },
    { label: 'Performance', value: summary.scores.performance, icon: Zap, color: 'text-green-400', bg: 'bg-green-500' },
  ];

  return (
    isOpen ? (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md transition-opacity duration-300"
      >
        <div
          className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl transition-transform duration-300 scale-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-800/40">
            <h2 className="text-xl font-bold text-slate-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
              {t.projectSummaryTitle || 'Project Summary & Evaluation'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex px-6 pt-4 space-x-4 bg-slate-900/50 border-b border-slate-800/50">
            <button
              onClick={() => setActiveTab('scores')}
              className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === 'scores'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.summaryScores || 'Project Scores'}
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === 'config'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.summaryConfig || 'Device Configurations'}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
            {activeTab === 'scores' ? (
              <div className="space-y-8">
                {/* Stats row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-cyan-400">{summary.totalDevices}</span>
                    <span className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Devices</span>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-purple-400">{summary.totalConnections}</span>
                    <span className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Connections</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {scoreItems.map((item) => (
                    <div 
                      key={item.label} 
                      className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/30 transition-all duration-300 hover:scale-[1.02]"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <item.icon size={18} className={item.color} />
                          <span className="font-semibold text-slate-200">{item.label}</span>
                        </div>
                        <span className={`text-lg font-bold ${item.color}`}>{item.value}/100</span>
                      </div>
                      <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.bg} transition-all duration-1000 ease-out`}
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {summary.configs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    No configurable devices found in the network.
                  </div>
                ) : (
                  summary.configs.map(config => (
                    <div key={config.id} className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700/50 shadow-lg">
                      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${config.type === 'switch' || config.type === 'switchL3' ? 'bg-cyan-500' : config.type === 'router' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                          <span className="font-semibold text-slate-200">{config.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 uppercase tracking-wide">
                            {config.type}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopy(config.id, config.commands)}
                          className="flex items-center space-x-1 px-2 py-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded transition-colors text-xs"
                        >
                          {copiedId === config.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                          <span>{copiedId === config.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="p-4 bg-slate-950/80 overflow-x-auto text-sm font-mono text-slate-300 leading-relaxed">
                        <pre className="whitespace-pre-wrap">{config.commands}</pre>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    ) : null
  );
}
