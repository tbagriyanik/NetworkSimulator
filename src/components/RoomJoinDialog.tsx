'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRoom } from '@/contexts/RoomContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { secureStorage } from '@/lib/storage/secureStorage';
import { isDesktopApp } from '@/lib/utils/desktopDetection';

export function RoomJoinDialog() {
  const { showRoomJoinDialog, setShowRoomJoinDialog, joinRoom, studentRoomCode, studentDisplayName, leaveRoom } = useRoom();
  const { t } = useLanguage();
  const [code, setCode] = useState(() => secureStorage.getItem('room-join-code') || '');
  const [name, setName] = useState(() => secureStorage.getItem('room-student-name') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);

  useEffect(() => {
    if (studentRoomCode && studentDisplayName) {
      setCode(studentRoomCode);
      setName(studentDisplayName);
    }
  }, [studentRoomCode, studentDisplayName]);

  // Periodic room presence check to notify if room closed/ended
  useEffect(() => {
    if (!studentRoomCode) return;
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`/api/room/${studentRoomCode}`);
        const json = await res.json();
        if (!cancelled && (!json.success || !json.data.exists)) {
          leaveRoom();
          setRoomError(t.language === 'tr' ? 'Oda sonlandırıldı.' : 'Room was closed by teacher.');
        }
      } catch {
        // Network error ignored during period check
      }
    };
    const id = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [studentRoomCode, t]);

  useEffect(() => {
    if (!showRoomJoinDialog) return;
    const handleMobileBack = () => setShowRoomJoinDialog(false);
    window.addEventListener('mobile-back-pressed', handleMobileBack);
    return () => window.removeEventListener('mobile-back-pressed', handleMobileBack);
  }, [showRoomJoinDialog, setShowRoomJoinDialog]);

  useEffect(() => { secureStorage.setItem('room-join-code', code); }, [code]);
  useEffect(() => { secureStorage.setItem('room-student-name', name); }, [name]);

  const handleJoin = async () => {
    if (code.trim().length >= 4 && name.trim().length > 0) {
      if (isDesktopApp()) {
        setError(
          t.language === 'tr'
            ? 'Masaüstü sürümünde canlı sınıf/oda özellikleri için internet ve web sürümü gereklidir.'
            : 'Live classroom rooms require the web version and internet access.'
        );
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/room/${code.trim().toUpperCase()}`);
        if (res.status === 404) {
          setError(t.language === 'tr' ? 'Oda bulunamadı...' : 'Room not found...');
          return;
        }
        const json = await res.json();
        if (json.success && json.data.exists) {
          joinRoom(code.trim(), name.trim());
        } else {
          setError(t.language === 'tr' ? 'Oda bulunamadı...' : 'Room not found...');
        }
      } catch {
        setError(t.language === 'tr' ? 'Bağlantı hatası...' : 'Connection error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Dialog open={showRoomJoinDialog} onOpenChange={setShowRoomJoinDialog}>
      <DialogContent className="sm:max-w-sm" onEscapeKeyDown={studentRoomCode ? (e => e.preventDefault()) : undefined} onPointerDownOutside={studentRoomCode ? (e => e.preventDefault()) : undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="w-4 h-4 text-primary-500" />{studentRoomCode ? `${t.roomJoinTitle} — ${studentRoomCode}` : t.roomJoinTitle}</DialogTitle>
          <DialogDescription>
            {studentRoomCode ? `${studentDisplayName || name} — ${studentRoomCode}` : t.roomJoinDesc}
          </DialogDescription>
        </DialogHeader>

        {studentRoomCode ? (
          <div className="space-y-3">
            {roomError && <p className="text-[10px] font-bold text-destructive text-center px-1">{roomError}</p>}
            <Button variant="outline" className="w-full" onClick={leaveRoom}>
              {t.roomLeave}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <Input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().slice(0, 10))}
              placeholder={t.roomCodePlaceholder}
              onKeyDown={e => { if (e.key === 'Enter') document.getElementById('room-name-input')?.focus(); }}
            />
            <Input
              id="room-name-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t.roomNamePlaceholder}
              maxLength={50}
              onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }}
            />
            {error && <p className="text-[10px] font-bold text-error-500 px-1">{error}</p>}
            <Button
              className="w-full"
              onClick={handleJoin}
              disabled={code.trim().length < 4 || !name.trim() || isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.roomJoinBtn}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
