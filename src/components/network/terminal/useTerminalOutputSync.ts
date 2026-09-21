'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TerminalOutput } from '../Terminal';

export interface TerminalLine {
  id: string;
  type: string;
  content: string;
  prompt?: string;
  realismLevel?: 'real' | 'stub' | 'sim-only';
  hint?: string | { tr: string; en: string };
}

interface UseTerminalOutputSyncOptions {
  output: TerminalOutput[];
  deviceId: string;
}

function splitOutputItem(outputItem: TerminalOutput): TerminalLine[] {
  if (outputItem.content && outputItem.content.includes('\n')) {
    const lines = outputItem.content.split('\n');
    return lines.map((line, index) => ({
      id: `${outputItem.id}-line-${index}`,
      type: outputItem.type,
      content: line,
      prompt: index === 0 ? outputItem.prompt : '',
      realismLevel: index === lines.length - 1 ? outputItem.realismLevel : undefined,
      hint: index === lines.length - 1 ? outputItem.hint : undefined
    }));
  }
  return [{
    id: outputItem.id,
    type: outputItem.type,
    content: outputItem.content,
    prompt: outputItem.prompt,
    realismLevel: outputItem.realismLevel,
    hint: outputItem.hint
  }];
}

export function useTerminalOutputSync({ output, deviceId }: UseTerminalOutputSyncOptions) {
  const [displayedLines, setDisplayedLines] = useState<TerminalLine[]>(() => {
    const initialLines: TerminalLine[] = [];
    if (output && output.length > 0) {
      output.forEach((outputItem) => {
        if (!outputItem || !outputItem.id) return;
        initialLines.push(...splitOutputItem(outputItem));
      });
    }
    return initialLines;
  });
  const processedOutputIdsRef = useRef<Set<string>>(new Set());
  const cancelOutputRef = useRef(false);

  useEffect(() => {
    if (output && output.length > 0) {
      const ids = new Set<string>();
      output.forEach((outputItem) => {
        if (outputItem && outputItem.id) {
          ids.add(outputItem.id);
        }
      });
      processedOutputIdsRef.current = ids;
    }
  }, []);

  const prevFirstOutputIdRef = useRef<string | null>(null);
  const prevOutputLengthRef = useRef(0);
  const isInitializedRef = useRef(false);
  const lastDeviceIdRef = useRef<string | null>(null);

  useEffect(() => {
    const deviceChanged = lastDeviceIdRef.current !== null && lastDeviceIdRef.current !== deviceId;
    lastDeviceIdRef.current = deviceId;

    if (!isInitializedRef.current || deviceChanged) {
      isInitializedRef.current = true;
      if (displayedLines.length === 0 && output.length > 0) {
        const newLines: TerminalLine[] = [];
        output.forEach((outputItem) => {
          if (!outputItem || !outputItem.id) return;
          processedOutputIdsRef.current.add(outputItem.id);
          newLines.push(...splitOutputItem(outputItem));
        });
        if (newLines.length > 0) {
          setDisplayedLines(newLines);
        }
      }
      return;
    }

    if (output.length === 0) {
      setDisplayedLines([]);
      processedOutputIdsRef.current.clear();
      prevFirstOutputIdRef.current = null;
      prevOutputLengthRef.current = 0;
      return;
    }

    const firstId = output[0]?.id ?? null;
    if (firstId !== prevFirstOutputIdRef.current) {
      prevFirstOutputIdRef.current = firstId;
      setDisplayedLines([]);
      processedOutputIdsRef.current.clear();
      cancelOutputRef.current = false;
    }

    const newLinesBatch: TerminalLine[] = [];

    for (const outputItem of output) {
      if (!outputItem || !outputItem.id) continue;
      if (processedOutputIdsRef.current.has(outputItem.id)) continue;
      processedOutputIdsRef.current.add(outputItem.id);
      newLinesBatch.push(...splitOutputItem(outputItem));
    }

    if (newLinesBatch.length > 0) {
      setDisplayedLines(prev => {
        const existingIds = new Set(prev.map(l => l.id));
        const toAdd = newLinesBatch.filter(l => !existingIds.has(l.id));
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
      });
    }

    prevOutputLengthRef.current = output.length;
  }, [output, deviceId]);

  useEffect(() => {
    if (displayedLines.length === 0 && output.length > 0) {
      processedOutputIdsRef.current.clear();
      prevFirstOutputIdRef.current = null;
    }
  }, [output.length, displayedLines.length]);

  const clearTerminalLines = useCallback(() => {
    cancelOutputRef.current = true;
    processedOutputIdsRef.current.clear();
    setDisplayedLines([
      {
        id: `cleared-${Date.now()}`,
        type: 'output',
        content: '[Terminal ekranı temizlendi. Komut listesi için \'?\' yazabilirsiniz.]',
        realismLevel: 'sim-only',
      },
    ]);
  }, []);

  return { displayedLines, clearTerminalLines };
}