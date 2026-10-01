import React, { useState } from 'react';
import {
  BGP_BEST_PATH_STEPS,
  compareBgpRoutes
} from '@/lib/network/bgpBestPathExplainer';
import type { BgpRoute } from '@/lib/network/bgpEngine';
import { GitCommit, Trophy } from 'lucide-react';

interface BgpBestPathExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const sampleRouteA: BgpRoute = {
  prefix: '10.0.0.0/24',
  network: '10.0.0.0',
  netmask: '255.255.255.0',
  nextHop: '192.168.1.1',
  asPath: [65001, 65002],
  weight: 100,
  localPref: 100,
  origin: 'IGP',
  originAs: 65001,
  isIbgp: false,
  routerId: '1.1.1.1',
};

const sampleRouteB: BgpRoute = {
  prefix: '10.0.0.0/24',
  network: '10.0.0.0',
  netmask: '255.255.255.0',
  nextHop: '192.168.2.1',
  asPath: [65003],
  weight: 100,
  localPref: 100,
  origin: 'IGP',
  originAs: 65003,
  isIbgp: false,
  routerId: '2.2.2.2',
};

export const BgpBestPathExplainerModal: React.FC<BgpBestPathExplainerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [routeA] = useState<BgpRoute>(sampleRouteA);
  const [routeB] = useState<BgpRoute>(sampleRouteB);

  if (!isOpen) return null;

  const comparison = compareBgpRoutes(routeA, routeB);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              BGP Best Path Decision Explainer
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-lg px-2"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Route inputs comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Route A */}
            <div className={`p-4 rounded-xl border ${comparison.winner === -1 ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-200 dark:border-slate-800'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">Rota A</span>
                {comparison.winner === -1 && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                    <Trophy className="w-3.5 h-3.5" /> Kazanan
                  </span>
                )}
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Next-Hop:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{routeA.nextHop}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">AS Path:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">[{routeA.asPath.join(', ')}]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Weight:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{routeA.weight}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Local Pref:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{routeA.localPref}</span>
                </div>
              </div>
            </div>

            {/* Route B */}
            <div className={`p-4 rounded-xl border ${comparison.winner === 1 ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-200 dark:border-slate-800'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">Rota B</span>
                {comparison.winner === 1 && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                    <Trophy className="w-3.5 h-3.5" /> Kazanan
                  </span>
                )}
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Next-Hop:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{routeB.nextHop}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">AS Path:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">[{routeB.asPath.join(', ')}]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Weight:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{routeB.weight}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Local Pref:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{routeB.localPref}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Decision Steps Pipeline */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              12 Adımlı BGP Karar Sıralaması (IOS Standartı)
            </h3>
            <div className="space-y-1.5">
              {BGP_BEST_PATH_STEPS.map((step, idx) => {
                const isDecisionStep = comparison.stepIndex === idx + 1;
                const isPassedStep = comparison.stepIndex > idx + 1;
                return (
                  <div
                    key={step}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                      isDecisionStep
                        ? 'border-amber-500 bg-amber-500/10 font-semibold text-slate-900 dark:text-white'
                        : isPassedStep
                        ? 'border-slate-200 dark:border-slate-800 opacity-60 text-slate-500'
                        : 'border-slate-100 dark:border-slate-850 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>

                    {isDecisionStep && (
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-lg">
                        Karar Adımı!
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
