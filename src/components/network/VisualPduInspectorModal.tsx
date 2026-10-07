import { Layers, X } from 'lucide-react';
import type { PipelineResult } from '@/lib/network/forwarding/packetPipeline';
import { EmbeddedPduInspector } from './EmbeddedPduInspector';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { WINDOW_CLOSE_BUTTON_CLASS, WINDOW_TITLE_CLASS } from '@/components/ui/windowStandards';

interface VisualPduInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipelineResult: PipelineResult | null;
  isDark?: boolean;
  language?: 'tr' | 'en';
}

export const VisualPduInspectorModal: React.FC<VisualPduInspectorModalProps> = ({
  isOpen,
  onClose,
  pipelineResult,
  isDark = true,
  language = 'tr',
}) => {
  useModalDismiss({
    isOpen: Boolean(isOpen && pipelineResult),
    onClose,
  });

  // Render nothing when modal is closed or data missing
  if (!isOpen || !pipelineResult) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-5xl h-[85vh] rounded-xl flex flex-col shadow-2xl border overflow-hidden transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-cyan-950/20' : 'bg-white border-slate-200 text-slate-800 shadow-xl'}`}
      >
        {/* Header */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className={WINDOW_TITLE_CLASS(isDark)}>
              {language === 'en' ? 'PDU Flow & Packet Inspector' : 'PDU Akış & Paket İnceleyicisi'}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label={language === 'en' ? 'Close' : 'Kapat'}
            title={language === 'en' ? 'Close' : 'Kapat'}
            className={WINDOW_CLOSE_BUTTON_CLASS}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Embedded inspector */}
        <EmbeddedPduInspector pipelineResult={pipelineResult} isDark={isDark} language={language} />
      </div>
    </div>
  );
};
