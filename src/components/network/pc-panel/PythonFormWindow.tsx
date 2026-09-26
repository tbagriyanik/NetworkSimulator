'use client';

import React, { useState } from 'react';
import { Monitor, Globe, Play, CheckCircle2 } from 'lucide-react';
import { ResizablePortalWindow } from './ResizablePortalWindow';
import { Button } from '@/components/ui/button';
import type { PythonFormState, FormElement } from './pcPythonFormTypes';
import { generateFormHtml } from './pcPythonFormModule';

interface PythonFormWindowProps {
  form: PythonFormState | null;
  isDark?: boolean;
  isMobile?: boolean;
  onClose: () => void;
  onOpenInBrowser?: (htmlContent: string, title?: string) => void;
}

export const PythonFormWindow: React.FC<PythonFormWindowProps> = ({
  form,
  isDark = true,
  isMobile = false,
  onClose,
  onOpenInBrowser,
}) => {
  if (!form) return null;

  // Local state copy for interactive editing of elements inside the window
  const [, setRerender] = useState(0);
  const triggerUpdate = () => setRerender(n => n + 1);

  const handleElementClick = (elem: FormElement) => {
    try {
      if (elem.commandId && form.callbacks[elem.commandId]) {
        form.callbacks[elem.commandId]();
        triggerUpdate();
      } else if (form.callbacks[elem.id]) {
        form.callbacks[elem.id]();
        triggerUpdate();
      }
    } catch (err) {
      console.warn('Python Form Callback Error:', err);
    }
  };

  const handleTextChange = (elem: FormElement, value: string) => {
    elem.value = value;
    triggerUpdate();
  };

  const handleCheckboxChange = (elem: FormElement, checked: boolean) => {
    elem.checked = checked;
    triggerUpdate();
  };

  const handleRadioChange = (elem: FormElement) => {
    // Uncheck other elements in same group
    form.elements.forEach(el => {
      if (el.type === 'radiobutton' && el.group === elem.group) {
        el.checked = false;
      }
    });
    elem.checked = true;
    triggerUpdate();
  };

  const handleSelectChange = (elem: FormElement, value: string) => {
    elem.value = value;
    triggerUpdate();
  };

  const handleOpenBrowser = () => {
    if (onOpenInBrowser) {
      const html = generateFormHtml(form);
      onOpenInBrowser(html, form.title);
    }
  };

  const headerTitle = (
    <div className="flex items-center gap-2">
      <Monitor className="w-4 h-4 text-sky-400" />
      <span className="font-semibold text-xs sm:text-sm truncate">{form.title || 'Python Form'}</span>
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">
        GUI
      </span>
    </div>
  );

  const headerActions = (
    <div className="flex items-center gap-1.5 mr-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={handleOpenBrowser}
        className="h-7 px-2 text-xs flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
        title="Web Tarayıcısında Aç (Browser Mode)"
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="hidden sm:inline text-xs">Web Tarayıcısında Aç</span>
      </Button>
    </div>
  );

  return (
    <ResizablePortalWindow
      isOpen={!!form}
      onClose={onClose}
      title={headerTitle}
      headerActions={headerActions}
      isDark={isDark}
      isMobile={isMobile}
      defaultWidth={form.width ? Math.max(340, form.width) : 480}
      defaultHeight={form.height ? Math.max(280, form.height) : 420}
      minWidth={300}
      minHeight={220}
    >
      <div
        className={`w-full h-full p-4 overflow-y-auto flex flex-col gap-3.5 ${
          isDark ? 'bg-slate-950/90 text-slate-100' : 'bg-white text-slate-900'
        }`}
      >
        {form.elements.map((elem) => {
          switch (elem.type) {
            case 'button':
              return (
                <div key={elem.id} className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => handleElementClick(elem)}
                    disabled={elem.disabled}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-all duration-150 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{elem.text || 'Düğme'}</span>
                  </button>
                </div>
              );

            case 'label':
              return (
                <div key={elem.id} className="py-0.5">
                  <p className="text-xs sm:text-sm font-medium tracking-wide text-slate-300">
                    {elem.text}
                  </p>
                </div>
              );

            case 'entry':
              return (
                <div key={elem.id} className="flex flex-col gap-1 w-full">
                  {elem.text && (
                    <label className="text-xs font-semibold text-slate-400">{elem.text}</label>
                  )}
                  <input
                    type="text"
                    value={String(elem.value || '')}
                    placeholder={elem.placeholder || ''}
                    disabled={elem.disabled}
                    onChange={(e) => handleTextChange(elem, e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs sm:text-sm rounded-md border outline-none transition-colors ${
                      isDark
                        ? 'bg-slate-900/80 border-slate-800 text-slate-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500'
                    }`}
                  />
                </div>
              );

            case 'textarea':
              return (
                <div key={elem.id} className="flex flex-col gap-1 w-full">
                  {elem.text && (
                    <label className="text-xs font-semibold text-slate-400">{elem.text}</label>
                  )}
                  <textarea
                    rows={elem.height ? Math.max(2, Math.floor(elem.height / 20)) : 3}
                    value={String(elem.value || '')}
                    placeholder={elem.placeholder || ''}
                    disabled={elem.disabled}
                    onChange={(e) => handleTextChange(elem, e.target.value)}
                    className={`w-full px-3 py-2 text-xs sm:text-sm font-mono rounded-md border outline-none resize-y transition-colors ${
                      isDark
                        ? 'bg-slate-900/80 border-slate-800 text-slate-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500'
                    }`}
                  />
                </div>
              );

            case 'combobox':
              return (
                <div key={elem.id} className="flex flex-col gap-1 w-full">
                  {elem.text && (
                    <label className="text-xs font-semibold text-slate-400">{elem.text}</label>
                  )}
                  <select
                    value={String(elem.value || '')}
                    disabled={elem.disabled}
                    onChange={(e) => handleSelectChange(elem, e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs sm:text-sm rounded-md border outline-none transition-colors ${
                      isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-100 focus:border-sky-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500'
                    }`}
                  >
                    {(elem.values || []).map((val, idx) => (
                      <option key={`opt-${elem.id}-${idx}-${val}`} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                </div>
              );

            case 'listbox':
              return (
                <div key={elem.id} className="flex flex-col gap-1 w-full">
                  {elem.text && (
                    <label className="text-xs font-semibold text-slate-400">{elem.text}</label>
                  )}
                  <div
                    className={`w-full rounded-md border max-h-36 overflow-y-auto divide-y ${
                      isDark
                        ? 'bg-slate-900/60 border-slate-800 divide-slate-800/60'
                        : 'bg-slate-50 border-slate-300 divide-slate-200'
                    }`}
                  >
                    {(elem.values || []).map((item, idx) => {
                      const isSelected = String(elem.value) === item;
                      return (
                        <div
                          key={`list-${elem.id}-${idx}-${item}`}
                          onClick={() => {
                            elem.value = item;
                            triggerUpdate();
                          }}
                          className={`px-3 py-1.5 text-xs sm:text-sm cursor-pointer transition-colors flex items-center justify-between ${
                            isSelected
                              ? 'bg-sky-500/20 text-sky-400 font-medium'
                              : isDark
                              ? 'hover:bg-slate-800/50 text-slate-300'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span>{item}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );

            case 'checkbox':
              return (
                <div key={elem.id} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id={elem.id}
                    checked={Boolean(elem.checked)}
                    disabled={elem.disabled}
                    onChange={(e) => handleCheckboxChange(elem, e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-sky-600 focus:ring-sky-500 focus:ring-offset-0"
                  />
                  <label htmlFor={elem.id} className="text-xs sm:text-sm font-medium cursor-pointer select-none">
                    {elem.text || 'Onay Kutusu'}
                  </label>
                </div>
              );

            case 'radiobutton':
              return (
                <div key={elem.id} className="flex items-center gap-2 py-1">
                  <input
                    type="radio"
                    id={elem.id}
                    name={elem.group || 'default_radio_group'}
                    checked={Boolean(elem.checked)}
                    disabled={elem.disabled}
                    onChange={() => handleRadioChange(elem)}
                    className="w-4 h-4 border-slate-700 text-sky-600 focus:ring-sky-500 focus:ring-offset-0"
                  />
                  <label htmlFor={elem.id} className="text-xs sm:text-sm font-medium cursor-pointer select-none">
                    {elem.text || 'Seçenek'}
                  </label>
                </div>
              );

            case 'separator_h':
              return (
                <div key={elem.id} className="w-full my-1 border-t border-slate-800" />
              );

            case 'separator_v':
              return (
                <div key={elem.id} className="inline-block h-6 w-px mx-2 bg-slate-800 self-center" />
              );

            default:
              return null;
          }
        })}
      </div>
    </ResizablePortalWindow>
  );
};
