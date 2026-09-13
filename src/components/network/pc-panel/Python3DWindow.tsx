'use client';

import React, { useMemo } from 'react';
import { Box, Globe, RotateCw, Layers } from 'lucide-react';
import { ResizablePortalWindow } from './ResizablePortalWindow';
import { Button } from '@/components/ui/button';
import type { Python3DSceneState } from './pcPython3DTypes';
import { generate3DSceneHtml } from './pcPython3DRenderer';

interface Python3DWindowProps {
  scene: Python3DSceneState | null;
  isDark?: boolean;
  isMobile?: boolean;
  onClose: () => void;
  onOpenInBrowser?: (htmlContent: string, title?: string) => void;
}

export const Python3DWindow: React.FC<Python3DWindowProps> = ({
  scene,
  isDark = true,
  isMobile = false,
  onClose,
  onOpenInBrowser,
}) => {
  const htmlContent = useMemo(() => {
    if (!scene) return '';
    return generate3DSceneHtml(scene);
  }, [scene]);

  if (!scene) return null;

  const headerActions = (
    <div className="flex items-center gap-1.5 shrink-0">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          if (onOpenInBrowser) {
            onOpenInBrowser(htmlContent, scene.title || '3D Sahne');
          }
        }}
        className="h-7 px-2 text-xs font-semibold text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 border border-sky-500/20"
        title="Sahneyi PC Web Tarayıcısında Aç"
      >
        <Globe className="w-3.5 h-3.5 mr-1 text-sky-400" />
        Tarayıcıda Aç
      </Button>
    </div>
  );

  return (
    <ResizablePortalWindow
      isOpen={!!scene}
      onClose={onClose}
      title={`Python 3D - ${scene.title || 'Sahne'}`}
      icon={<Box className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />}
      isDark={isDark}
      isMobile={isMobile}
      defaultWidth={scene.width || 820}
      defaultHeight={scene.height || 580}
      minWidth={320}
      minHeight={260}
      headerContent={headerActions}
      borderColorClass={isDark ? 'border-cyan-500/40 bg-slate-950' : 'border-cyan-600 bg-white'}
      headerBgClass={
        isDark
          ? 'border-cyan-500/30 bg-slate-900/90 text-cyan-100'
          : 'border-cyan-500/40 bg-slate-100 text-slate-900'
      }
    >
      <div className="flex-1 w-full h-full relative overflow-hidden bg-slate-950 flex flex-col">
        {/* Info Sub-bar */}
        <div className="flex items-center justify-between px-3 py-1 bg-slate-900/80 border-b border-white/10 text-[11px] text-slate-400 select-none shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-cyan-300 font-mono font-medium">
              <Layers className="w-3 h-3 text-cyan-400" />
              {scene.objects.length} Nesne
            </span>
            <span>•</span>
            <span className="text-slate-400">
              Gökyüzü: <strong className="text-slate-200 capitalize">{scene.environment.sky.type}</strong>
            </span>
            <span>•</span>
            <span className="text-slate-400">
              Işıklar: <strong className="text-slate-200">{scene.environment.lights.length}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
            <span className="hidden sm:inline">Orbit 3D WebGL</span>
            <RotateCw className="w-2.5 h-2.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
        </div>

        {/* 3D WebGL Interactive Canvas in Sandbox IFrame */}
        <div className="flex-1 w-full h-full relative overflow-hidden">
          <iframe
            title={scene.title || '3D Sahne'}
            srcDoc={htmlContent}
            sandbox="allow-scripts allow-forms allow-modals"
            className="w-full h-full border-0 block bg-slate-950"
            style={{ touchAction: 'none' }}
          />
        </div>
      </div>
    </ResizablePortalWindow>
  );
};
