'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  RotateCcw,
  Trash2,
  Plus,
  Download,
  Upload,
  Clock,
  HardDrive,
  Search,
  Check,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';
import type { CanvasDevice, CanvasConnection, CanvasNote } from './networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { useAppStore } from '@/lib/store/appStore';
import {
  TopologyCheckpoint,
  createCheckpoint,
  loadCheckpointsFromStorage,
  saveCheckpointsToStorage,
  deleteCheckpointFromList,
  validateTopologyCheckpoint,
} from '@/lib/network/snapshotManager';

interface SnapshotManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  notes?: CanvasNote[];
  deviceStates?: Record<string, SwitchState>;
  onRestoreCheckpoint?: (checkpoint: TopologyCheckpoint) => void;
  isDark?: boolean;
  language?: 'tr' | 'en';
  isExamActive?: boolean;
}

export const SnapshotManagerModal: React.FC<SnapshotManagerModalProps> = ({
  isOpen,
  onClose,
  devices,
  connections,
  notes = [],
  deviceStates = {},
  onRestoreCheckpoint,
  isDark = true,
  language = 'tr',
  isExamActive = false,
}) => {
  const isTr = language === 'tr';
  const [mounted, setMounted] = useState(false);
  const [checkpoints, setCheckpoints] = useState<TopologyCheckpoint[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [newSnapshotDesc, setNewSnapshotDesc] = useState('');
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<TopologyCheckpoint | null>(null);
  const [showConfirmRollback, setShowConfirmRollback] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && isExamActive) {
      onClose();
    }
  }, [isOpen, isExamActive, onClose]);

  useEffect(() => {
    if (isOpen && !isExamActive) {
      const stored = loadCheckpointsFromStorage();
      setCheckpoints(stored);
      setIsCreating(false);
      setSelectedCheckpoint(null);
      setShowConfirmRollback(false);
      setFeedbackMsg(null);
      setNewSnapshotName('');
      setNewSnapshotDesc('');
    }
  }, [isOpen, isExamActive]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || isExamActive) return;
      if (e.key === 'Escape') {
        if (showConfirmRollback) {
          setShowConfirmRollback(false);
        } else if (isCreating) {
          setIsCreating(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showConfirmRollback, isCreating, onClose, isExamActive]);

  if (!isOpen || !mounted || isExamActive) return null;

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleCreateSnapshot = () => {
    const defaultTitle = isTr ? `Kayıt #${checkpoints.length + 1}` : `Snapshot #${checkpoints.length + 1}`;
    const name = newSnapshotName.trim() || `${defaultTitle} (${new Date().toLocaleTimeString(isTr ? 'tr-TR' : 'en-US')})`;

    const curDevices = devices.length > 0 ? devices : (useAppStore.getState().topology.devices || []);
    const curConnections = connections.length > 0 ? connections : (useAppStore.getState().topology.connections || []);
    const curNotes = notes.length > 0 ? notes : (useAppStore.getState().topology.notes || []);

    const checkpoint = createCheckpoint(
      name,
      curDevices,
      curConnections,
      curNotes,
      deviceStates,
      newSnapshotDesc.trim() || undefined
    );

    const updated = [checkpoint, ...checkpoints];
    setCheckpoints(updated);
    saveCheckpointsToStorage(updated);
    setNewSnapshotName('');
    setNewSnapshotDesc('');
    setIsCreating(false);
    showNotification(isTr ? `"${checkpoint.name}" kaydı başarıyla oluşturuldu!` : `"${checkpoint.name}" snapshot successfully saved!`);
  };

  const handleDelete = (id: string, name: string) => {
    const updated = deleteCheckpointFromList(checkpoints, id);
    setCheckpoints(updated);
    if (selectedCheckpoint?.id === id) setSelectedCheckpoint(null);
    showNotification(isTr ? `"${name}" kaydı silindi.` : `"${name}" snapshot deleted.`);
  };

  const handleClearAll = () => {
    const msg = isTr ? 'Tüm topoloji kayıtlarını silmek istediğinize emin misiniz?' : 'Are you sure you want to clear all topology snapshots?';
    if (confirm(msg)) {
      setCheckpoints([]);
      saveCheckpointsToStorage([]);
      showNotification(isTr ? 'Tüm topoloji kayıtları temizlendi.' : 'All topology snapshot records cleared.');
    }
  };

  const handleRollback = (cp: TopologyCheckpoint) => {
    // 1. Restore devices in global Zustand store
    if (cp.devices && cp.devices.length > 0) {
      useAppStore.getState().setDevices(cp.devices);
    } else {
      useAppStore.getState().setDevices([]);
    }

    // 2. Restore connections in store
    if (cp.connections) {
      useAppStore.getState().setConnections(cp.connections);
    }

    // 3. Restore notes in store
    if (cp.notes) {
      useAppStore.getState().setNotes(cp.notes);
    }

    // 4. Trigger external restore callback if provided
    if (onRestoreCheckpoint) {
      onRestoreCheckpoint(cp);
    }

    setShowConfirmRollback(false);
    showNotification(isTr ? `Topoloji "${cp.name}" anına başarıyla geri yüklendi!` : `Topology successfully restored to "${cp.name}"!`);
    setTimeout(() => {
      onClose();
    }, 700);
  };

  const handleExportJson = (cp: TopologyCheckpoint) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cp, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${cp.name.replace(/\s+/g, '_')}_checkpoint.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          const validation = validateTopologyCheckpoint(parsed);
          if (validation.valid) {
            const imported: TopologyCheckpoint = {
              ...parsed,
              id: `checkpoint-imp-${Date.now()}`,
              name: `${parsed.name || (isTr ? 'İçe Aktarılan' : 'Imported')} (${isTr ? 'İçe Aktarıldı' : 'Imported'})`,
              createdAt: Date.now(),
              deviceCount: parsed.devices.length,
              connectionCount: Array.isArray(parsed.connections) ? parsed.connections.length : 0,
              devices: parsed.devices,
              connections: Array.isArray(parsed.connections) ? parsed.connections : [],
              notes: Array.isArray(parsed.notes) ? parsed.notes : [],
              deviceStates: parsed.deviceStates && typeof parsed.deviceStates === 'object' ? parsed.deviceStates : {},
            };
            const updated = [imported, ...checkpoints];
            setCheckpoints(updated);
            saveCheckpointsToStorage(updated);
            showNotification(isTr ? `"${imported.name}" başarıyla içe aktarıldı!` : `"${imported.name}" successfully imported!`);
          } else {
            const errMsg = validation.error
              ? (isTr ? `Uyumsuz JSON: ${validation.error}` : `Incompatible JSON: ${validation.error}`)
              : (isTr ? 'Geçersiz veya uyumsuz checkpoint JSON formatı.' : 'Invalid or incompatible checkpoint JSON format.');
            showNotification(errMsg, 'error');
          }
        } catch {
          showNotification(isTr ? 'JSON dosyası okunamadı veya ayrıştırılamadı.' : 'Failed to read or parse JSON file.', 'error');
        }
      };
    }
  };

  const filteredCheckpoints = checkpoints.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const modalContent = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className={`w-full max-w-4xl max-h-[90vh] h-[650px] rounded-2xl flex flex-col shadow-2xl border overflow-hidden ${isDark
            ? 'bg-slate-900 border-slate-700/80 text-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]'
            : 'bg-white border-slate-200 text-slate-800 shadow-2xl'
          }`}
      >
        {/* Modal Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">
                  {isTr ? 'Topoloji Anlık Görüntü & Geri Yükleme Yöneticisi' : 'Topology Snapshot & Restore Manager'}
                </h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {isTr ? 'Geri Yükleme Noktası' : 'Checkpoint'}
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isTr
                  ? 'Ağ topolojinizin anlık durumunu dondurun, kaydedin ve istediğiniz an tek tıkla geri yükleyin.'
                  : 'Freeze, save, and restore your network topology state instantly at any point in time.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="cursor-pointer px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5 transition active:scale-95 shadow-sm">
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isTr ? 'JSON İçe Aktar' : 'Import JSON'}</span>
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg border transition ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white' : 'border-slate-300 hover:bg-slate-100 text-slate-600'
                }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`px-6 py-2.5 text-xs font-medium flex items-center gap-2 border-b animate-in fade-in duration-150 ${feedbackMsg.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              }`}
          >
            {feedbackMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Action Toolbar */}
        <div
          className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100/60 border-slate-200'
            }`}
        >
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isTr ? 'Kayıt ara (isim veya açıklama)...' : 'Search snapshots (name or description)...'}
                className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none transition ${isDark
                    ? 'bg-slate-950/70 border-slate-700 text-slate-200 placeholder-slate-500 focus:border-indigo-500'
                    : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
                  }`}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {checkpoints.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 transition"
              >
                {isTr ? 'Tümünü Temizle' : 'Clear All'}
              </button>
            )}

            <button
              onClick={() => setIsCreating(!isCreating)}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-md active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isTr ? 'Yeni Kayıt Al' : 'Take New Snapshot'}</span>
            </button>
          </div>
        </div>

        {/* Create Snapshot Drawer / Form */}
        {isCreating && (
          <div
            className={`p-5 border-b space-y-3 shrink-0 animate-in slide-in-from-top-2 duration-150 ${isDark ? 'bg-indigo-950/30 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  {isTr ? 'Mevcut Topolojinin Anlık Durumunu Kaydet' : 'Capture Current Topology State'}
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {devices.length} {isTr ? 'Cihaz' : 'Devices'} • {connections.length} {isTr ? 'Bağlantı Donduruluyor' : 'Links Freezing'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={newSnapshotName}
                onChange={(e) => setNewSnapshotName(e.target.value)}
                placeholder={isTr ? 'Kayıt Adı (Örn: OSPF & BGP Konfigürasyonu Öncesi)' : 'Snapshot Name (e.g. Pre-OSPF Config)'}
                className={`px-3 py-2 text-xs rounded-lg border focus:outline-none ${isDark
                    ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500'
                    : 'bg-white border-slate-300 focus:border-indigo-500'
                  }`}
              />
              <input
                type="text"
                value={newSnapshotDesc}
                onChange={(e) => setNewSnapshotDesc(e.target.value)}
                placeholder={isTr ? 'Açıklama / Notlar (Opsiyonel)' : 'Description / Notes (Optional)'}
                className={`px-3 py-2 text-xs rounded-lg border focus:outline-none ${isDark
                    ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500'
                    : 'bg-white border-slate-300 focus:border-indigo-500'
                  }`}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setIsCreating(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-300 text-slate-600'
                  }`}
              >
                {isTr ? 'Vazgeç' : 'Cancel'}
              </button>
              <button
                onClick={handleCreateSnapshot}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow active:scale-95"
              >
                {isTr ? 'Kaydı Oluştur' : 'Create Snapshot'}
              </button>
            </div>
          </div>
        )}

        {/* Checkpoint List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-0">
          {filteredCheckpoints.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-300">
                  {isTr ? 'Kayıtlı Topoloji Bulunamadı' : 'No Saved Snapshots Found'}
                </div>
                <p className="max-w-md mx-auto mt-1 text-slate-400 leading-relaxed">
                  {isTr
                    ? 'Ağ üzerinde değişiklik yapmadan önce "Yeni Kayıt Al" diyerek topolojinin o anki halini dondurabilir ve bir sorun çıktığında tek tıkla o ana geri dönebilirsiniz.'
                    : 'Take a snapshot before making network changes to freeze topology state and instantly roll back if any issue occurs.'}
                </p>
              </div>
            </div>
          ) : (
            filteredCheckpoints.map((cp) => (
              <div
                key={cp.id}
                className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${isDark
                    ? 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-950/80'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-100">{cp.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-mono">
                      {cp.deviceCount} {isTr ? 'Cihaz' : 'Devices'} • {cp.connectionCount} {isTr ? 'Bağlantı' : 'Links'}
                    </span>
                  </div>
                  {cp.description && <p className="text-xs text-slate-400 truncate">{cp.description}</p>}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{new Date(cp.createdAt).toLocaleString(isTr ? 'tr-TR' : 'en-US')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleExportJson(cp)}
                    title={isTr ? 'JSON Olarak İndir' : 'Export as JSON'}
                    className={`p-2 rounded-lg border text-xs transition ${isDark
                        ? 'border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                        : 'border-slate-300 hover:bg-slate-100 text-slate-600'
                      }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cp.id, cp.name)}
                    title={isTr ? 'Kaydı Sil' : 'Delete Snapshot'}
                    className="p-2 rounded-lg border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCheckpoint(cp);
                      setShowConfirmRollback(true);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {isTr ? 'Geri Yükle' : 'Restore State'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Confirmation Modal on Rollback */}
        {showConfirmRollback && selectedCheckpoint && (
          <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div
              className={`max-w-md w-full p-5 rounded-2xl border shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 ${isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                }`}
            >
              <div className="flex items-center gap-3 text-amber-400">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">{isTr ? 'Geri Yüklemeyi Onayla' : 'Confirm Restoration'}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">{isTr ? 'Hedef: ' : 'Target: '}{selectedCheckpoint.name}</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {isTr
                  ? <>Mevcut topoloji ve tüm cihazların port/IP konfigürasyonları <strong>"{selectedCheckpoint.name}"</strong> anındaki durumuna geri yüklenecektir.</>
                  : <>Current topology and device configs will be restored to state <strong>"{selectedCheckpoint.name}"</strong>.</>}
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowConfirmRollback(false)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-300 text-slate-600'
                    }`}
                >
                  {isTr ? 'Vazgeç' : 'Cancel'}
                </button>
                <button
                  onClick={() => handleRollback(selectedCheckpoint)}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow active:scale-95 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {isTr ? 'Evet, Geri Yükle' : 'Yes, Restore'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
