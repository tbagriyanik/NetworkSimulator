'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, X, LogOut, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRoomStudents } from '@/hooks/useRoomStudents';
import { Badge } from '@/components/ui/badge';
import { useRoom } from '@/contexts/RoomContext';
import { useLanguage } from '@/contexts/LanguageContext';

type SortField = 'name' | 'duration' | 'tasks' | 'score';
type SortDir = 'asc' | 'desc';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function RoomMonitor({ roomCode, onClose }: { roomCode: string; onClose: () => void }) {
  const { students, error } = useRoomStudents(roomCode);
  const { t } = useLanguage();
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(id);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const toAscii = (s: string) => s.replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/İ/g, 'I').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S').replace(/Ö/g, 'O').replace(/Ç/g, 'C');

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const margin = 10;
    const colW = [60, 30, 35, 50];
    const rows = [[t.roomSortName, t.roomDurationLabel, t.roomSortScore, t.roomTaskFile]];
    sortedStudents.forEach(s => {
      const pct = s.totalTasks > 0 ? Math.round((s.completedTasks / s.totalTasks) * 100) : 0;
      const dur = Math.floor((now - s.joinedAt) / 60000);
      const tasks = s.projectFile ? `${s.completedTasks}/${s.totalTasks} (${s.projectFile})` : `${s.completedTasks}/${s.totalTasks}`;
      rows.push([s.displayName, `${dur} dk`, `%${pct}`, tasks]);
    });
    let y = margin;
    const lineH = 7;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    let x = margin;
    rows[0].forEach((h, i) => {
      pdf.text(toAscii(h), x, y);
      x += colW[i];
    });
    y += lineH;
    pdf.setFont('helvetica', 'normal');
    for (let r = 1; r < rows.length; r++) {
      x = margin;
      for (let c = 0; c < rows[r].length; c++) {
        pdf.text(toAscii(rows[r][c]), x, y);
        x += colW[c];
      }
      y += lineH;
    }
    pdf.save(`oda-${roomCode}-ogrenciler.pdf`);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedStudents = [...students].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    let cmp = 0;
    if (sortField === 'name') cmp = a.displayName.localeCompare(b.displayName);
    else if (sortField === 'duration') cmp = a.joinedAt - b.joinedAt;
    else if (sortField === 'tasks') cmp = a.completedTasks - b.completedTasks || a.totalTasks - b.totalTasks;
    else if (sortField === 'score') {
      const aPct = a.totalTasks > 0 ? a.completedTasks / a.totalTasks : 0;
      const bPct = b.totalTasks > 0 ? b.completedTasks / b.totalTasks : 0;
      cmp = aPct - bPct;
    }
    return cmp * dir;
  });

  const totalStudents = students.length;

  const thClass = (field: SortField) =>
    `text-xs font-semibold px-2 py-1.5 text-left cursor-pointer select-none whitespace-nowrap hover:bg-muted/60 transition-colors ${
      sortField === field ? 'text-primary' : 'text-muted-foreground'
    }`;

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return <span className="ml-0.5">{sortDir === 'asc' ? '▲' : '▼'}</span>;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-2.5 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-lg font-mono font-bold tracking-wider leading-none">{roomCode}</span>
          <Badge variant="default" className="text-[10px] h-4 px-1.5">{totalStudents}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleExportPDF} title={t.roomExportPDF}>
            <FileDown className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}><LogOut className="w-3 h-3" /></Button>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{t.roomConnError}</p>}

      <div className="max-h-[calc(85vh-14rem)] overflow-y-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-background dark:bg-slate-950 z-10">
            <tr className="border-b border-border">
              <th className={thClass('name')} onClick={() => handleSort('name')}>{t.roomSortName}{sortIcon('name')}</th>
              <th className={thClass('duration')} onClick={() => handleSort('duration')}>{t.roomDurationLabel}{sortIcon('duration')}</th>
              <th className={`${thClass('score')} text-right`} onClick={() => handleSort('score')}>{t.roomSortScore}{sortIcon('score')}</th>
              <th className={thClass('tasks')} onClick={() => handleSort('tasks')}>{t.roomTaskFile}{sortIcon('tasks')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.map(s => {
              const progress = s.totalTasks > 0 ? (s.completedTasks / s.totalTasks) * 100 : 0;
              const duration = Math.floor((now - s.joinedAt) / 60000);
              return (
                <tr key={s.studentId} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-2 py-2">
                    <span className="font-medium truncate block max-w-[120px]" title={s.displayName}>
                      {s.displayName}
                    </span>
                  </td>
                  <td className="px-2 py-2 tabular-nums text-muted-foreground">
                    {duration} {t.roomDuration}
                    {s.durationMinutes && duration > s.durationMinutes && (
                      <span className="ml-1 text-[10px] text-destructive font-semibold">{t.roomTimeUp}</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="tabular-nums font-medium text-right">{Math.round(progress)}%</span>
                      <div className="h-2 w-12 overflow-hidden rounded-full bg-muted shrink-0">
                        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 tabular-nums text-muted-foreground">
                    <span title={s.projectFile || undefined}>{s.completedTasks}/{s.totalTasks}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {totalStudents === 0 && (
          <p className="py-4 text-center text-[11px] text-muted-foreground">{t.roomNoStudents}</p>
        )}
      </div>
    </div>
  );
}

export function TeacherRoomPanel() {
  const { showTeacherPanel, setShowTeacherPanel, studentRoomCode } = useRoom();
  const { t } = useLanguage();
  const [roomCodeInput, setRoomCodeInput] = useState(() => localStorage.getItem('teacher-room-code') || '');
  const [activeCode, setActiveCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState(() => localStorage.getItem('teacher-display-name') || '');
  const [teacherNameInput, setTeacherNameInput] = useState(() => localStorage.getItem('teacher-display-name') || '');

  useEffect(() => {
    if (activeCode) localStorage.setItem('teacher-room-code', activeCode);
  }, [activeCode]);

  const handleCreate = async () => {
    const code = generateRoomCode();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (json.success) {
        setRoomCodeInput(code);
        setActiveCode(code);
      } else {
        setError(json.error || 'Failed to create room');
      }
    } catch {
      setError(t.language === 'tr' ? 'Bağlantı hatası' : 'Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinMonitor = () => {
    if (roomCodeInput.trim().length >= 4) setActiveCode(roomCodeInput.trim().toUpperCase());
  };

  const handleSaveName = () => {
    const name = teacherNameInput.trim();
    if (name) {
      setTeacherName(name);
      localStorage.setItem('teacher-display-name', name);
    }
  };

  useEffect(() => {
    if (!showTeacherPanel) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowTeacherPanel(false);
    };
    const handleMobileBack = () => setShowTeacherPanel(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mobile-back-pressed', handleMobileBack);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mobile-back-pressed', handleMobileBack);
    };
  }, [showTeacherPanel, setShowTeacherPanel]);

  if (!showTeacherPanel || studentRoomCode) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-12" onClick={() => setShowTeacherPanel(false)}>
      <div
        className="flex flex-col rounded-xl shadow-2xl border overflow-hidden liquid-glass-light border-slate-200/50 dark:border-slate-700/50 w-full max-w-md mx-4 max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-muted/50 rounded-t-xl">
          <h2 className="text-base font-semibold">{t.roomTeacherPanel}</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-500 hover:text-white dark:hover:bg-red-600" onClick={() => setShowTeacherPanel(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {!activeCode ? (
            <>
              {!teacherName && (
                <div className="flex items-center gap-2">
                  <Input
                    value={teacherNameInput}
                    onChange={e => setTeacherNameInput(e.target.value)}
                    placeholder={t.roomTeacherNameLabel}
                    maxLength={50}
                    className="flex-1"
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); }}
                  />
                  <Button variant="outline" size="sm" onClick={handleSaveName} disabled={!teacherNameInput.trim()}>
                    {t.roomTeacherNameSave}
                  </Button>
                </div>
              )}

              {error && <p className="text-xs text-destructive text-center font-bold mb-2">{error}</p>}
              <Button onClick={handleCreate} className="w-full" disabled={isLoading}>
                {isLoading ? '...' : t.roomCreateBtn}
              </Button>

              <div className="flex items-center gap-2">
                <div className="flex-1 border-t" />
                <span className="text-xs text-muted-foreground">{t.roomOr}</span>
                <div className="flex-1 border-t" />
              </div>

              <div className="flex gap-2">
                <Input
                  value={roomCodeInput}
                  onChange={e => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder={t.roomExistingPlaceholder}
                  maxLength={10}
                  onKeyDown={e => { if (e.key === 'Enter') handleJoinMonitor(); }}
                />
                <Button onClick={handleJoinMonitor} variant="outline" disabled={roomCodeInput.trim().length < 4}>
                  {t.roomWatchBtn}
                </Button>
              </div>
            </>
          ) : (
            <RoomMonitor roomCode={activeCode} onClose={() => { setActiveCode(''); setRoomCodeInput(''); }} />
          )}
        </div>
      </div>
    </div>
  );
}