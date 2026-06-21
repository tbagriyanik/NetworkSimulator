'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, X, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRoomStudents } from '@/hooks/useRoomStudents';
import { Badge } from '@/components/ui/badge';
import { useRoom } from '@/contexts/RoomContext';
import { useLanguage } from '@/contexts/LanguageContext';

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

  const totalStudents = students.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-2.5 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-lg font-mono font-bold tracking-wider leading-none">{roomCode}</span>
          <Badge variant="default" className="text-[10px] h-4 px-1.5">{totalStudents}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}><LogOut className="w-3 h-3" /></Button>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{t.roomConnError}</p>}

      <div className="space-y-1 max-h-[calc(85vh-10rem)] overflow-y-auto">
        {students.map(s => {
          const progress = s.totalTasks > 0 ? (s.completedTasks / s.totalTasks) * 100 : 0;
          return (
            <div key={s.studentId} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-2.5 py-1.5">
              <span className="text-xs font-medium truncate min-w-0 flex-1">
                {s.displayName}
                {s.projectFile && <span className="ml-1 text-[10px] text-muted-foreground">({s.projectFile})</span>}
                <span className="ml-1 text-[10px] text-muted-foreground/60 tabular-nums">
                  {Math.floor((now - s.joinedAt) / 60000)}{t.roomDuration}
                </span>
                {s.durationMinutes && now - s.joinedAt > s.durationMinutes * 60000 && (
                  <Badge variant="destructive" className="ml-1 text-[9px] h-3.5 px-1">{t.roomTimeUp}</Badge>
                )}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{s.completedTasks}/{s.totalTasks}</span>
              <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums w-8 text-right">{Math.round(progress)}%</span>
              <div className="h-1 w-12 overflow-hidden rounded-full bg-muted shrink-0">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          );
        })}
        {totalStudents === 0 && (
          <p className="py-4 text-center text-[11px] text-muted-foreground">{t.roomNoStudents}</p>
        )}
      </div>
    </div>
  );
}

export function TeacherRoomPanel() {
  const { showTeacherPanel, setShowTeacherPanel } = useRoom();
  const { t } = useLanguage();
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [activeCode, setActiveCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!showTeacherPanel) return null;

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
