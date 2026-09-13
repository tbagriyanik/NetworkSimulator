'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Save, Play, FileCode, File, FolderOpen, Minus, Plus, Scissors, Copy,
  ClipboardPaste, Trash2, ListChecks, Undo2, Redo2, WrapText,
  Bold, Italic, Underline, Code, Image, Link as LinkIcon, Heading1, Heading2, Heading3, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { PythonCodeEditor } from './PythonCodeEditor';
import { ResizablePortalWindow } from './ResizablePortalWindow';
import { decodeHTMLEntities } from '@/lib/security/sanitizer';
import { colors } from '@/lib/design-tokens/colors';

interface FileEditorModalProps {
  open: boolean;
  filePath: string;
  initialContent: string;
  language?: string;
  isDark?: boolean;
  onSave: (content: string) => void;
  onRunPython?: (content: string) => void;
  onClose: () => void;
}

export function FileEditorModal({
  open,
  filePath,
  initialContent,
  language = 'tr',
  isDark = true,
  onSave,
  onRunPython,
  onClose,
}: FileEditorModalProps) {
  const [content, setContent] = useState(initialContent);
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState(true);
  const [history, setHistory] = useState<string[]>([initialContent]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyReady = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = decodeHTMLEntities(initialContent);
    setContent(raw);
    setHistory([raw]);
    setHistoryIndex(0);
    historyReady.current = true;
  }, [initialContent, open]);

  const updateContent = (next: string) => {
    setContent(next);
    if (!historyReady.current) return;
    setHistory(previous => [...previous.slice(0, historyIndex + 1), next].slice(-100));
    setHistoryIndex(previous => Math.min(previous + 1, 99));
  };

  const undo = () => {
    if (historyIndex === 0) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    setContent(history[nextIndex]);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    setContent(history[nextIndex]);
  };

  // The editor is rendered in a portal above the PC panel. Consume Escape at
  // the window capture phase so the PC panel's global Escape navigation does
  // not close the panel after closing the editor.
  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    };

    window.addEventListener('keydown', handleEscape, true);
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        const textarea = document.querySelector<HTMLTextAreaElement>('div[data-code-editor="true"] textarea');
        textarea?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  const fileName = filePath.split(/[\\/]/).pop() || filePath;
  const isPythonFile = fileName.toLowerCase().endsWith('.py');
  const isHtmlFile = fileName.toLowerCase().endsWith('.html') || fileName.toLowerCase().endsWith('.htm');
  const isBatFile = fileName.toLowerCase().endsWith('.bat') || fileName.toLowerCase().endsWith('.cmd');

  const applyHtmlTag = (tag: string, selfClosing = false) => {
    const textarea = document.querySelector<HTMLTextAreaElement>('div[data-code-editor="true"] textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);

    let replacement = '';

    if (selfClosing) {
      if (tag === 'a') {
        replacement = `<a href="#">${selected || 'Link'}</a>`;
      } else if (tag === 'img') {
        replacement = `<img src="#" alt="${selected || 'image'}" />`;
      } else if (tag === 'br') {
        replacement = `<br />`;
      } else if (tag === 'hr') {
        replacement = `<hr />`;
      }
    } else {
      replacement = `<${tag}>${selected}</${tag}>`;
    }

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    updateContent(newContent);

    setTimeout(() => {
      textarea.focus();
      if (start === end && !selfClosing) {
        const insidePos = start + tag.length + 2;
        textarea.setSelectionRange(insidePos, insidePos);
      } else {
        const nextPos = start + replacement.length;
        textarea.setSelectionRange(nextPos, nextPos);
      }
    }, 50);
  };

  const handleSave = () => {
    onSave(content);
    onClose();
  };

  const handleRun = () => {
    onSave(content);
    if (onRunPython) {
      onRunPython(content);
    }
    onClose();
  };

  const handleNewFile = () => updateContent('');
  const handleOpenFile = () => fileInputRef.current?.click();

  const editSelected = async (action: 'cut' | 'copy' | 'paste' | 'delete' | 'selectAll') => {
    const textarea = document.querySelector<HTMLTextAreaElement>('div[data-code-editor="true"] textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (action === 'selectAll') textarea.select();
    if (action === 'delete') updateContent(content.slice(0, start) + content.slice(end));
    if (action === 'copy' || action === 'cut') {
      await navigator.clipboard?.writeText(content.slice(start, end));
      if (action === 'cut') updateContent(content.slice(0, start) + content.slice(end));
    }
    if (action === 'paste') {
      const text = await navigator.clipboard?.readText();
      if (text) updateContent(content.slice(0, start) + text + content.slice(end));
    }
    textarea.focus();
  };

  const lineCount = content.split('\n').length;
  const charCount = content.length;

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Do not let editor shortcuts trigger the main application's keyboard handlers.
    if (e.key === 'Tab' || ((e.ctrlKey || e.metaKey) && e.code === 'Space')) {
      e.stopPropagation();
    }

    if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
      e.preventDefault();
      return;
    }

    // Save & Run shortcut: F5 or Ctrl+Enter or Cmd+Enter
    if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
      e.preventDefault();
      handleRun();
      return;
    }

    // Save shortcut: Ctrl + S or Cmd + S
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSave();
      return;
    }

    // Handle Tab key inside editor
    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (e.shiftKey) {
        // Shift+Tab: Outdent
        const before = content.substring(0, start);
        const selected = content.substring(start, end);
        const after = content.substring(end);

        if (start === end) {
          const lineStart = before.lastIndexOf('\n') + 1;
          const linePrefix = content.substring(lineStart, start);
          const spacesToRemove = linePrefix.match(/ {1,4}$/)?.[0].length || 0;
          if (spacesToRemove > 0) {
            const newContent = content.substring(0, start - spacesToRemove) + content.substring(start);
            setContent(newContent);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = start - spacesToRemove;
            }, 0);
          }
        } else {
          const unindented = selected.replace(/^ {1,4}/gm, '');
          setContent(before + unindented + after);
          setTimeout(() => {
            textarea.selectionStart = start;
            textarea.selectionEnd = start + unindented.length;
          }, 0);
        }
      } else {
        // Tab: Indent with 4 spaces
        const tabSpaces = '    ';
        if (start === end) {
          const newContent = content.substring(0, start) + tabSpaces + content.substring(end);
          setContent(newContent);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + tabSpaces.length;
          }, 0);
        } else {
          const lines = content.substring(start, end).split('\n');
          const indented = lines.map(line => tabSpaces + line).join('\n');
          const newContent = content.substring(0, start) + indented + content.substring(end);
          setContent(newContent);
          setTimeout(() => {
            textarea.selectionStart = start;
            textarea.selectionEnd = start + indented.length;
          }, 0);
        }
      }
      return;
    }

    // Handle Enter key for newline & auto-indentation
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      e.stopPropagation();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const lineStart = content.lastIndexOf('\n', start - 1) + 1;
      const currentLine = content.substring(lineStart, start);
      const indentMatch = currentLine.match(/^[\t ]*/);
      let currentIndent = indentMatch ? indentMatch[0] : '';

      if (currentLine.trimEnd().endsWith(':')) {
        currentIndent += '    ';
      }

      e.preventDefault();
      const insertText = '\n' + currentIndent;
      const newContent = content.substring(0, start) + insertText + content.substring(end);
      setContent(newContent);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + insertText.length;
      }, 0);
    }
  };

  const headerTitle = (
    <div className="flex items-center gap-2 min-w-0 truncate font-mono text-sm font-semibold tracking-wide">
      <span className="truncate">{fileName}</span>
      {isPythonFile && (
        <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-sans shrink-0">
          Python Script
        </span>
      )}
      {isHtmlFile && (
        <span className="text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-sans shrink-0">
          HTML Page
        </span>
      )}
      {isBatFile && (
        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-sans shrink-0">
          {language === 'tr' ? 'Batch Yığın Dosyası' : 'Batch Script'}
        </span>
      )}
    </div>
  );

  const headerActions = (
    <div className="flex max-w-[min(70vw,680px)] flex-nowrap items-center justify-end gap-0.5 overflow-x-auto">
      <TooltipWrapper title="Yeni">
        <Button size="sm" variant="ghost" onClick={handleNewFile} className="h-8 w-8 p-0 shrink-0"><File className="h-3.5 w-3.5" /></Button>
      </TooltipWrapper>
      <TooltipWrapper title="Aç">
        <Button size="sm" variant="ghost" onClick={handleOpenFile} className="h-8 w-8 p-0 shrink-0"><FolderOpen className="h-3.5 w-3.5" /></Button>
      </TooltipWrapper>
      <TooltipWrapper title="Kaydet">
        <Button size="sm" variant="outline" onClick={handleSave} className="h-8 w-8 p-0 shrink-0"><Save className="h-3.5 w-3.5" /></Button>
      </TooltipWrapper>
      <span className="mx-1 h-6 w-px bg-secondary-600/40 shrink-0" aria-hidden="true" />
      <TooltipWrapper title="Geri al">
        <Button size="sm" variant="ghost" disabled={historyIndex === 0} onClick={undo} className="h-8 w-8 p-0 shrink-0"><Undo2 className="h-3.5 w-3.5" /></Button>
      </TooltipWrapper>
      <TooltipWrapper title="Yinele">
        <Button size="sm" variant="ghost" disabled={historyIndex >= history.length - 1} onClick={redo} className="h-8 w-8 p-0 shrink-0"><Redo2 className="h-3.5 w-3.5" /></Button>
      </TooltipWrapper>
      <span className="mx-1 h-6 w-px bg-secondary-600/40 shrink-0" aria-hidden="true" />
      <TooltipWrapper title="Kes">
        <Button size="sm" variant="ghost" onClick={() => void editSelected('cut')} className="h-8 w-8 p-0 shrink-0"><Scissors className="h-3.5 w-3.5" /></Button>
      </TooltipWrapper>
      <TooltipWrapper title="Kopyala">
        <Button size="sm" variant="ghost" onClick={() => void editSelected('copy')} className="h-8 w-8 p-0 shrink-0"><Copy className="h-3.5 w-3.5" /></Button>
      </TooltipWrapper>
      <TooltipWrapper title="Yapıştır">
        <Button size="sm" variant="ghost" onClick={() => void editSelected('paste')} className="h-8 w-8 p-0 shrink-0"><ClipboardPaste className="h-3.5 w-3.5" /></Button>
      </TooltipWrapper>
      <TooltipWrapper title="Sil">
        <Button size="sm" variant="ghost" onClick={() => void editSelected('delete')} className="h-8 w-8 p-0 shrink-0"><Trash2 className="h-3.5 w-3.5" /></Button>
      </TooltipWrapper>
      <TooltipWrapper title="Tümünü seç">
        <Button size="sm" variant="ghost" onClick={() => void editSelected('selectAll')} className="h-8 w-8 p-0 shrink-0"><ListChecks className="h-3.5 w-3.5" /></Button>
      </TooltipWrapper>
      <span className="mx-1 h-6 w-px bg-secondary-600/40 shrink-0" aria-hidden="true" />
      <TooltipWrapper title="Yazı küçült">
        <Button size="sm" variant="ghost" disabled={fontSize <= 12} onClick={() => setFontSize(size => Math.max(12, size - 1))} className="h-8 w-8 p-0 shrink-0"><Minus className="h-3.5 w-3.5" /></Button>
      </TooltipWrapper>
      <span className="min-w-8 text-center text-xs font-mono shrink-0">{fontSize}</span>
      <TooltipWrapper title="Yazı büyüt">
        <Button size="sm" variant="ghost" disabled={fontSize >= 20} onClick={() => setFontSize(size => Math.min(20, size + 1))} className="h-8 w-8 p-0 shrink-0"><Plus className="h-3.5 w-3.5" /></Button>
      </TooltipWrapper>
      <span className="mx-1 h-6 w-px bg-secondary-600/40 shrink-0" aria-hidden="true" />
      <TooltipWrapper title="Satır kaydırma">
        <Button size="sm" variant={wordWrap ? 'default' : 'ghost'} onClick={() => setWordWrap(value => !value)} className="h-8 w-8 p-0 shrink-0"><WrapText className="h-3.5 w-3.5" /></Button>
      </TooltipWrapper>
      {(isPythonFile || isBatFile) && (
        <TooltipWrapper title={language === 'tr' ? "Kaydet ve CMD'de Çalıştır (F5 / Ctrl+Enter)" : "Save & Run in CMD (F5 / Ctrl+Enter)"}>
          <Button
            size="sm"
            variant="default"
            onClick={handleRun}
            className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors shrink-0"
          >
            <Play className="w-3.5 h-3.5 text-emerald-300 fill-emerald-300 shrink-0" />
          </Button>
        </TooltipWrapper>
      )}
    </div>
  );

  const footerBar = (
    <div
      className={`px-4 py-1.5 flex justify-between items-center text-xs font-mono border-t ${isDark
          ? 'border-secondary-800 bg-secondary-900/40 text-secondary-400'
          : 'border-secondary-200 bg-secondary-100/60 text-secondary-600'
        }`}
    >
      <span className="truncate mr-2">Dosya: {filePath}</span>
      <div className="flex gap-4 shrink-0">
        <span>Satır: {lineCount}</span>
        <span>Karakter: {charCount}</span>
        <span>UTF-8</span>
      </div>
    </div>
  );

  return (
    <ResizablePortalWindow
      isOpen={open}
      onClose={onClose}
      title={headerTitle}
      icon={<FileCode className="w-5 h-5 text-primary-500 shrink-0" />}
      isDark={isDark}
      defaultWidth={900}
      defaultHeight={620}
      minWidth={320}
      minHeight={240}
      footerBar={footerBar}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".py,.txt,.json,.js,.ts,.tsx,.html,.css"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void file.text().then(text => {
            setContent(text);
            setHistory([text]);
            setHistoryIndex(0);
          });
          event.target.value = '';
        }}
      />
      <div className={isDark
        ? 'flex min-h-10 flex-wrap items-center gap-0.5 border-b border-secondary-800 bg-secondary-900/80 px-2 py-1'
        : 'flex min-h-10 flex-wrap items-center gap-0.5 border-b border-secondary-200 bg-secondary-100 px-2 py-1'}>
        {headerActions}
      </div>
      {isHtmlFile && (
        <div className={isDark
          ? 'flex min-h-9 flex-wrap items-center gap-1 border-b border-secondary-800 bg-secondary-950/90 px-3 py-1 text-xs select-none'
          : 'flex min-h-9 flex-wrap items-center gap-1 border-b border-secondary-200 bg-secondary-50 px-3 py-1 text-xs select-none'}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary-500 mr-1">
            HTML:
          </span>
          <TooltipWrapper title="Kalın <b>">
            <Button size="sm" variant="ghost" onClick={() => applyHtmlTag('b')} className="h-7 px-2 font-black text-xs shrink-0">
              <Bold className="w-3.5 h-3.5 mr-0.5" /> B
            </Button>
          </TooltipWrapper>
          <TooltipWrapper title="İtalik <i>">
            <Button size="sm" variant="ghost" onClick={() => applyHtmlTag('i')} className="h-7 px-2 italic text-xs shrink-0">
              <Italic className="w-3.5 h-3.5 mr-0.5" /> I
            </Button>
          </TooltipWrapper>
          <TooltipWrapper title="Altı Çizili <u>">
            <Button size="sm" variant="ghost" onClick={() => applyHtmlTag('u')} className="h-7 px-2 underline text-xs shrink-0">
              <Underline className="w-3.5 h-3.5 mr-0.5" /> U
            </Button>
          </TooltipWrapper>

          <span className="mx-1 h-4 w-px bg-secondary-600/40 shrink-0" aria-hidden="true" />

          <TooltipWrapper title="Başlık 1 <h1>">
            <Button size="sm" variant="ghost" onClick={() => applyHtmlTag('h1')} className="h-7 px-2 font-bold text-xs shrink-0">
              <Heading1 className="w-3.5 h-3.5 mr-0.5" /> H1
            </Button>
          </TooltipWrapper>
          <TooltipWrapper title="Başlık 2 <h2>">
            <Button size="sm" variant="ghost" onClick={() => applyHtmlTag('h2')} className="h-7 px-2 font-bold text-xs shrink-0">
              <Heading2 className="w-3.5 h-3.5 mr-0.5" /> H2
            </Button>
          </TooltipWrapper>
          <TooltipWrapper title="Başlık 3 <h3>">
            <Button size="sm" variant="ghost" onClick={() => applyHtmlTag('h3')} className="h-7 px-2 font-bold text-xs shrink-0">
              <Heading3 className="w-3.5 h-3.5 mr-0.5" /> H3
            </Button>
          </TooltipWrapper>
          <TooltipWrapper title="Paragraf <p>">
            <Button size="sm" variant="ghost" onClick={() => applyHtmlTag('p')} className="h-7 px-2 font-semibold text-xs shrink-0">
              P
            </Button>
          </TooltipWrapper>

          <span className="mx-1 h-4 w-px bg-secondary-600/40 shrink-0" aria-hidden="true" />

          <TooltipWrapper title="Bağlantı <a>">
            <Button size="sm" variant="ghost" onClick={() => applyHtmlTag('a', true)} className="h-7 px-2 text-xs shrink-0">
              <LinkIcon className="w-3.5 h-3.5 mr-0.5" /> a
            </Button>
          </TooltipWrapper>
          <TooltipWrapper title="Resim <img>">
            <Button size="sm" variant="ghost" onClick={() => applyHtmlTag('img', true)} className="h-7 px-2 text-xs shrink-0">
              <Image className="w-3.5 h-3.5 mr-0.5" /> img
            </Button>
          </TooltipWrapper>
          <TooltipWrapper title="Kod <code>">
            <Button size="sm" variant="ghost" onClick={() => applyHtmlTag('code')} className="h-7 px-2 text-xs shrink-0 font-mono">
              <Code className="w-3.5 h-3.5 mr-0.5" /> code
            </Button>
          </TooltipWrapper>
          <TooltipWrapper title="Bölüm <div>">
            <Button size="sm" variant="ghost" onClick={() => applyHtmlTag('div')} className="h-7 px-2 text-xs shrink-0 font-mono">
              div
            </Button>
          </TooltipWrapper>
          <TooltipWrapper title="Satır İçi <span>">
            <Button size="sm" variant="ghost" onClick={() => applyHtmlTag('span')} className="h-7 px-2 text-xs shrink-0 font-mono">
              span
            </Button>
          </TooltipWrapper>
          <TooltipWrapper title="Alt Satır <br>">
            <Button size="sm" variant="ghost" onClick={() => applyHtmlTag('br', true)} className="h-7 px-2 text-xs shrink-0 font-mono">
              br
            </Button>
          </TooltipWrapper>
        </div>
      )}
      {isPythonFile && (
        <div className={isDark
          ? 'flex min-h-9 flex-wrap items-center gap-1 border-b border-secondary-800 bg-secondary-950/90 px-3 py-1 text-xs select-none'
          : 'flex min-h-9 flex-wrap items-center gap-1 border-b border-secondary-200 bg-secondary-50 px-3 py-1 text-xs select-none'}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Şablonlar:
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => updateContent(`# Netmiko ile Cihaz SSH Baglantisi ve VLAN Olusturma\nfrom netmiko import ConnectHandler\n\ndevice = {\n    'device_type': 'netsim_nos',\n    'host': '192.168.1.1',\n    'username': 'admin',\n    'password': 'password123'\n}\n\nprint("Baglanti kuruluyor: " + device['host'])\nnet_connect = ConnectHandler(**device)\noutput = net_connect.send_command('show ip int brief')\nprint(output)\n\nconfig_commands = ['vlan 50', 'name IT_DEPT', 'exit']\ncfg_out = net_connect.send_config_set(config_commands)\nprint("VLAN Konfigurasoynu Basariyla Gonderildi!")\n`)}
            className="h-7 px-2 text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 font-mono"
          >
            Netmiko (SSH)
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => updateContent(`# RESTCONF ile Port Durumu ve IP Yapilandirmasi\nimport requests\nimport json\n\nurl = "https://router1/restconf/data/ietf-interfaces:interfaces/interface=GigabitEthernet0/0"\nheaders = {\n    "Accept": "application/yang-data+json",\n    "Content-Type": "application/yang-data+json"\n}\npayload = {\n    "ietf-interfaces:interface": {\n        "name": "GigabitEthernet0/0",\n        "enabled": True,\n        "ietf-ip:ipv4": {\n            "address": [{"ip": "10.50.0.1", "netmask": "255.255.255.0"}]\n        }\n    }\n}\n\nprint("RESTCONF PATCH istegi gonderiliyor...")\nresp = requests.patch(url, headers=headers, json=payload)\nprint("Durum Kodu:", resp.status_code)\n`)}
            className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 font-mono"
          >
            RESTCONF (YANG)
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => updateContent(`# Python GUI Form Uygulamasi (Tkinter / Form)\nimport tkinter as tk\nfrom tkinter import ttk\n\nroot = tk.Tk()\nroot.title("Ag Kontrol Paneli")\nroot.geometry("460x520")\n\n# Etiket (Label)\nlbl_title = ttk.Label(root, text="Ag Cihazi Kontrol ve Yapilandirma Formu")\nlbl_title.pack(pady=4)\n\n# Yatay Cizgi (Separator)\nsep1 = ttk.Separator(root, orient="horizontal")\nsep1.pack(fill="x", pady=4)\n\n# Metin Kutusu (Entry)\nent_ip = ttk.Entry(root, placeholder="Ornek IP: 192.168.1.1")\nent_ip.insert(0, "192.168.1.1")\nent_ip.pack(pady=4)\n\n# Acilir Kutu (Combobox)\ncmb_proto = ttk.Combobox(root, values=["SSH (Port 22)", "Telnet (Port 23)", "HTTP (Port 80)", "HTTPS (Port 443)"])\ncmb_proto.pack(pady=4)\n\n# Onay Kutusu (Checkbox)\nchk_secure = ttk.Checkbutton(root, text="Guvenli Baglanti (SSL/TLS)", checked=True)\nchk_secure.pack(pady=4)\n\n# Radyo Dugmesi Grubu (RadioGroup)\nrad_mode1 = ttk.Radiobutton(root, text="Normal Mod", value="normal", checked=True)\nrad_mode1.pack(pady=2)\nrad_mode2 = ttk.Radiobutton(root, text="Hata Ayiklama (Debug)", value="debug")\nrad_mode2.pack(pady=2)\n\n# Metin Alani (TextArea)\ntxt_log = tk.Text(root, height=4)\ntxt_log.insert("1.0", "Hazir. Cihaz bilgileri bekleniyor...")\ntxt_log.pack(fill="both", pady=4)\n\n# Liste (Listbox)\nlst_items = tk.Listbox(root)\nlst_items.insert(0, "GigabitEthernet0/0 - UP")\nlst_items.insert(1, "GigabitEthernet0/1 - DOWN")\nlst_items.insert(2, "Vlan 1 - UP")\nlst_items.pack(fill="both", pady=4)\n\n# Dugme (Button) ve Olay Fonksiyonu\ndef on_connect():\n    ip = ent_ip.get()\n    proto = cmb_proto.get()\n    txt_log.delete("1.0", "end")\n    txt_log.insert("1.0", f"Baglanti baslatildi -> {ip} ({proto})")\n\nbtn_action = ttk.Button(root, text="Baglantiyi Baslat", command=on_connect)\nbtn_action.pack(pady=6)\n\n# Pencere veya Web Tarayicisi icinde calistir\nroot.mainloop()\n`)}
            className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 font-mono"
          >
            GUI Form
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => updateContent(`# 3D Sahne Yapimi ve Goruntuleme (Scene3D)\nfrom scene3d import Scene, Plane, Cube, Sphere, Cylinder, Prism\n\n# 1. Sahne Olusturma\nscene = Scene(title="Etkilesimli 3D Sahne", sky="sunset", grid=True)\n\n# 2. Zemin Duzlemi\nfloor = Plane(width=16, height=16, color="${colors.slate[700]}")\nfloor.set_position(0, 0, 0)\n\n# 3. Temel Nesneler\ncube1 = Cube(size=2, color="${colors.theme.primary}")\ncube1.set_position(-3, 1, 0)\n\nsphere1 = Sphere(radius=1.2, color="${colors.status.offline}")\nsphere1.set_position(0, 1.2, 0)\n\ncylinder1 = Cylinder(radius=0.9, height=2.5, color="${colors.status.online}")\ncylinder1.set_position(3, 1.25, 0)\n\nprism1 = Prism(sides=3, radius=1.3, height=2.4, color="${colors.status.warning}")\nprism1.set_position(0, 1.2, 3)\n\n# 4. Oyulmus Nesne (CSG Subtract)\ncut_cylinder = Cylinder(radius=0.6, height=3, color="${colors.syntax.constant}")\ncarved_cube = Cube(size=2, color="${colors.indigo[500]}")\ncarved_cube.set_position(-2, 1, -3)\ncarved_cube.subtract(cut_cylinder)\n\n# 5. Sahneye Ekleme\nscene.add(floor, cube1, sphere1, cylinder1, prism1, carved_cube)\n\n# 6. Cevresel Isiklandirma\nscene.add_sun(position=[8, 12, 6], intensity=1.2)\nscene.add_lamp(position=[0, 4, 2], intensity=0.9)\n\n# 7. Goster\nscene.show()\n`)}
            className="h-7 px-2 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 font-mono"
          >
            3D Sahne
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => updateContent(`# Dinamik Muzik ve Ses Uretimi (Audio & Music Synth)\nimport music\n\nprint("Muzik ve ses sentezleyici baslatiliyor...")\n\n# 1. Ses Efektleri (SFX)\nmusic.play_sfx("coin")\n\n# 2. Akor Calma (C Major Chord)\nmusic.play_chord(["C4", "E4", "G4"], duration_ms=600, wave="triangle")\n\n# 3. Dinamik Melodi Calma\nmelodi = "C4:1 D4:1 E4:1 C4:1 E4:1 F4:1 G4:2"\nmusic.play_melody(melodi, bpm=130, wave="sawtooth")\n\n# 4. WAV Ses Dosyasi Olarak Kaydetme\nmusic.save_wav("melodi.wav", "C4:1 E4:1 G4:1 C5:2", bpm=120)\nprint("Ses dosyasi basariyla kaydedildi: C:\\\\melodi.wav")\n`)}
            className="h-7 px-2 text-xs text-pink-400 hover:text-pink-300 hover:bg-pink-500/10 font-mono"
          >
            Müzik / Ses
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => updateContent(`# Web Sunucusundan Sayfa Cekme (HTTP GET)\nimport requests\n\nurl = "http://192.168.1.100"\nprint("HTTP GET yapiliyor: " + url)\nresp = requests.get(url)\nprint("HTTP Durum:", resp.status_code)\nprint("Icerik Boyutu:", len(resp.text), "karakter")\nprint("Ilk 200 karakter:")\nprint(resp.text[:200])\n`)}
            className="h-7 px-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 font-mono"
          >
            HTTP GET
          </Button>
        </div>
      )}
      <div data-code-editor="true" className="flex-1 relative flex flex-col font-mono text-sm overflow-hidden">
        <PythonCodeEditor
          value={content}
          onChange={updateContent}
          onKeyDown={handleTextareaKeyDown}
          fontSize={fontSize}
          wordWrap={wordWrap}
          isDark={isDark}
          placeholder={
            isPythonFile
              ? '# Python kodunuzu buraya yazın...\nprint("Merhaba Dunya!")'
              : isBatFile
                ? '@echo off\necho Network Simulator Batch Script\nset TARGET=192.168.1.1\nping %TARGET%'
                : '# Metin veya kod yazın...'
          }
        />
      </div>
    </ResizablePortalWindow>
  );
}
