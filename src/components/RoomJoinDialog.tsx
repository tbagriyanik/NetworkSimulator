'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRoom } from '@/contexts/RoomContext';
import { useLanguage } from '@/contexts/LanguageContext';

export function RoomJoinDialog() {
  const { showRoomJoinDialog, setShowRoomJoinDialog, joinRoom, studentRoomCode, leaveRoom } = useRoom();
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showRoomJoinDialog) return;
    const handleMobileBack = () => setShowRoomJoinDialog(false);
    window.addEventListener('mobile-back-pressed', handleMobileBack);
    return () => window.removeEventListener('mobile-back-pressed', handleMobileBack);
  }, [showRoomJoinDialog, setShowRoomJoinDialog]);

  const handleJoin = async () => {
    if (code.trim().length >= 4 && name.trim().length > 0) {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/room/${code.trim().toUpperCase()}`);
        const json = await res.json();
        if (json.success && json.data.exists) {
          joinRoom(code.trim(), name.trim());
        } else {
          setError(t.language === 'tr' ? 'Oda bulunamadı' : 'Room not found');
        }
      } catch {
        setError(t.language === 'tr' ? 'Bağlantı hatası' : 'Connection error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Dialog open={showRoomJoinDialog} onOpenChange={setShowRoomJoinDialog}>
      <DialogContent className="sm:max-w-sm" onEscapeKeyDown={() => {}}>
        <DialogHeader>
          <DialogTitle>{t.roomJoinTitle}</DialogTitle>
          <DialogDescription>
            {t.roomJoinDesc}
          </DialogDescription>
        </DialogHeader>

        {studentRoomCode ? (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{studentRoomCode}</span> {t.roomJoinedTo}{' '}
              <span className="font-semibold text-foreground">{name || 'anonim'}</span> {t.roomJoinedAs}
            </p>
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
            {error && <p className="text-[10px] font-bold text-red-500 px-1">{error}</p>}
            <Button
              className="w-full"
              onClick={handleJoin}
              disabled={code.trim().length < 4 || !name.trim() || isLoading}
            >
              {isLoading ? '...' : t.roomJoinBtn}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
