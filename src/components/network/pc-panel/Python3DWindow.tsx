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
  language?: string;
  onClose: () => void;
  onOpenInBrowser?: (htmlContent: string, title?: string) => void;
}

export const Python3DWindow: React.FC<Python3DWindowProps> = ({
  scene,
  isDark = true,
  isMobile = false,
  language = 'tr',
  onClose,
  onOpenInBrowser,
}) => {
  const isEn = language === 'en';

  const htmlContent = useMemo(() => {
    if (!scene) return '';
    return generate3DSceneHtml(scene, isDark, language);
  }, [scene, isDark, language]);

  if (!scene) return null;

  const defaultSceneTitle = isEn ? '3D Scene' : '3D Sahne';
  const defaultTitle = isEn ? 'Scene' : 'Sahne';

  const headerActions = (
    <div className="flex items-center gap-1.5 shrink-0">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          if (onOpenInBrowser) {
            onOpenInBrowser(htmlContent, scene.title || defaultSceneTitle);
          }
        }}
        className={`h-7 px-2 text-xs font-semibold border ${
          isDark
            ? 'text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 border-sky-500/20'
            : 'text-sky-700 hover:text-sky-900 hover:bg-sky-50 border-sky-300'
        }`}
        title={isEn ? 'Open Scene in PC Web Browser' : 'Sahneyi PC Web Tarayıcısında Aç'}
      >
        <Globe className={`w-3.5 h-3.5 mr-1 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
        {isEn ? 'Open in Browser' : 'Tarayıcıda Aç'}
      </Button>
    </div>
  );

  const objLabel = isEn ? (scene.objects.length === 1 ? 'Object' : 'Objects') : 'Nesne';

  return (
    <ResizablePortalWindow
      isOpen={!!scene}
      onClose={onClose}
      title={`Python 3D - ${scene.title || defaultTitle}`}
      icon={<Box className={`w-4 h-4 shrink-0 animate-pulse ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />}
      isDark={isDark}
      isMobile={isMobile}
      defaultWidth={scene.width || 820}
      defaultHeight={scene.height || 580}
      minWidth={320}
      minHeight={260}
      headerContent={headerActions}
      borderColorClass={isDark ? 'border-cyan-500/40 bg-slate-950' : 'border-cyan-400 bg-slate-50'}
      headerBgClass={
        isDark
          ? 'border-cyan-500/30 bg-slate-900/90 text-cyan-100'
          : 'border-cyan-300 bg-slate-100/90 text-slate-800'
      }
    >
      <div className={`flex-1 w-full h-full relative overflow-hidden flex flex-col ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
        {/* Info Sub-bar */}
        <div className={`flex items-center justify-between px-3 py-1 border-b text-[11px] select-none shrink-0 ${
          isDark
            ? 'bg-slate-900/90 border-white/10 text-slate-400'
            : 'bg-slate-200/90 border-slate-300 text-slate-700'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 font-mono font-medium ${isDark ? 'text-cyan-300' : 'text-cyan-800'}`}>
              <Layers className={`w-3 h-3 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
              {scene.objects.length} {objLabel}
            </span>
            <span>•</span>
            <span>
              {isEn ? 'Sky:' : 'Gökyüzü:'} <strong className={`capitalize ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{scene.environment.sky.type}</strong>
            </span>
            <span>•</span>
            <span>
              {isEn ? 'Lights:' : 'Işıklar:'} <strong className={isDark ? 'text-slate-200' : 'text-slate-900'}>{scene.environment.lights.length}</strong>
            </span>
          </div>
          <div className={`flex items-center gap-2 text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
            <span className="hidden sm:inline">WebGL</span>
            <RotateCw className={`w-2.5 h-2.5 animate-spin ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} style={{ animationDuration: '6s' }} />
          </div>
        </div>

        {/* 3D WebGL Interactive Canvas in Sandbox IFrame */}
        <div className="flex-1 w-full h-full relative overflow-hidden">
          <iframe
            title={scene.title || defaultSceneTitle}
            srcDoc={htmlContent}
            sandbox="allow-scripts allow-forms allow-modals"
            className={`w-full h-full border-0 block ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}
            style={{ touchAction: 'none' }}
          />
        </div>
      </div>
    </ResizablePortalWindow>
  );
};
