'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { LayoutGrid, Layers, Sparkles, CircleDot, Grid, RotateCcw } from 'lucide-react';
import type { Translations } from '@/contexts/LanguageContext';
import type { LayoutAlgorithm } from '@/lib/network/autoLayoutEngine';

interface TopologyAutoLayoutMenuProps {
  t: Translations;
  isDark: boolean;
  toolbarGlowClass: string;
  onApplyLayout: (algorithm: LayoutAlgorithm) => void;
  onRestoreOriginalLayout: () => void;
}

export function TopologyAutoLayoutMenu({
  t,
  isDark,
  toolbarGlowClass,
  onApplyLayout,
  onRestoreOriginalLayout,
}: TopologyAutoLayoutMenuProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={t.autoLayout || 'Otomatik Hizala'}
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 text-indigo-400 hover:bg-indigo-500/10"
            >
              <LayoutGrid className={`w-4 h-4 ${toolbarGlowClass}`} />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent className="z-50">{t.autoLayout || 'Otomatik Hizala'}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className={`${isDark ? 'bg-secondary-900 !border-secondary-800' : 'bg-white !border-secondary-200'} w-52`}>
        <DropdownMenuLabel className="text-[11px] font-bold tracking-widest text-secondary-500 py-1.5 px-2">
          {t.autoLayoutHeader || 'Otomatik Hizalama Düzeni'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 py-2 px-2.5 cursor-pointer text-xs font-semibold"
          onSelect={() => onApplyLayout('hierarchical')}
        >
          <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="flex flex-col">
            <span>{t.layoutHierarchical || 'Hiyerarşik (Katmanlı)'}</span>
            <span className="text-[10px] text-secondary-500 font-normal">{t.layoutHierarchicalDesc || 'Core, Switch ve PC katmanları'}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex items-center gap-2 py-2 px-2.5 cursor-pointer text-xs font-semibold"
          onSelect={() => onApplyLayout('star')}
        >
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex flex-col">
            <span>{t.layoutStar || 'Yıldız (Star)'}</span>
            <span className="text-[10px] text-secondary-500 font-normal">{t.layoutStarDesc || 'Merkezi bir cihaz etrafında'}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex items-center gap-2 py-2 px-2.5 cursor-pointer text-xs font-semibold"
          onSelect={() => onApplyLayout('ring')}
        >
          <CircleDot className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="flex flex-col">
            <span>{t.layoutRing || 'Halka (Ring)'}</span>
            <span className="text-[10px] text-secondary-500 font-normal">{t.layoutRingDesc || 'Dairesel dikey halka dizilimi'}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex items-center gap-2 py-2 px-2.5 cursor-pointer text-xs font-semibold"
          onSelect={() => onApplyLayout('grid')}
        >
          <Grid className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex flex-col">
            <span>{t.layoutGrid || 'Izgara (Grid)'}</span>
            <span className="text-[10px] text-secondary-500 font-normal">{t.layoutGridDesc || 'Düzenli matris düzeni'}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 py-2 px-2.5 cursor-pointer text-xs font-semibold text-rose-400 hover:text-rose-300"
          onSelect={() => onRestoreOriginalLayout()}
        >
          <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
          <div className="flex flex-col">
            <span>{t.restoreOriginalLayout || 'Eski Haline Geri Al'}</span>
            <span className="text-[10px] opacity-70 font-normal">{t.restoreOriginalLayoutDesc || 'İlk konumlara dön'}</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
