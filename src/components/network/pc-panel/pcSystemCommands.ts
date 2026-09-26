import type { OutputLine } from './PCPanel.types';

export interface HandlePcSystemCommandsParams {
  deviceId: string;
  internalPcHostname: string;
  setPcHostname: (hostname: string) => void;
  getNtpNow?: () => Date | null;
  emit: (type: OutputLine['type'], content: string, prompt?: string) => void;
}

export function handlePcSystemCommand(
  cmd: string,
  args: string[],
  params: HandlePcSystemCommandsParams
): boolean {
  const { deviceId, internalPcHostname, setPcHostname, getNtpNow, emit } = params;

  if (cmd === 'hostname') {
    if (args[0]) {
      const newHostname = args[0].trim().slice(0, 20);
      setPcHostname(newHostname);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('update-topology-device-config', {
          detail: {
            deviceId,
            config: { name: newHostname }
          }
        }));
      }
      emit('success', `Hostname set to ${newHostname}`);
    } else {
      emit('output', internalPcHostname);
    }
    return true;
  }

  if (cmd === 'ver') {
    emit('output', `OS [Version 10.0.26200.8037]`);
    return true;
  }

  if (cmd === 'date') {
    const now = getNtpNow ? getNtpNow() : null;
    const effectiveNow = now && !Number.isNaN(now.getTime()) ? now : new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[effectiveNow.getDay()];
    const monthStr = String(effectiveNow.getMonth() + 1).padStart(2, '0');
    const dateStr = String(effectiveNow.getDate()).padStart(2, '0');
    const yearStr = effectiveNow.getFullYear();
    if (args.includes('-u') || args.includes('--utc')) {
      emit('output', effectiveNow.toUTCString());
    } else {
      emit('output', `The current date is: ${dayName} ${monthStr}/${dateStr}/${yearStr}`);
    }
    return true;
  }

  if (cmd === 'time') {
    const now = getNtpNow ? getNtpNow() : null;
    const effectiveNow = now && !Number.isNaN(now.getTime()) ? now : new Date();
    const hours = String(effectiveNow.getHours()).padStart(2, '0');
    const mins = String(effectiveNow.getMinutes()).padStart(2, '0');
    const secs = String(effectiveNow.getSeconds()).padStart(2, '0');
    const ms = String(effectiveNow.getMilliseconds()).slice(0, 2).padStart(2, '0');
    emit('output', `The current time is: ${hours}:${mins}:${secs}.${ms}`);
    return true;
  }

  if (cmd === 'uptime') {
    const now = getNtpNow ? getNtpNow() : null;
    const effectiveNow = now && !Number.isNaN(now.getTime()) ? now : new Date();
    const hours = String(effectiveNow.getHours()).padStart(2, '0');
    const mins = String(effectiveNow.getMinutes()).padStart(2, '0');
    const secs = String(effectiveNow.getSeconds()).padStart(2, '0');
    emit('output', ` ${hours}:${mins}:${secs} up 1 day, 4:20, 1 user, load average: 0.08, 0.03, 0.01`);
    return true;
  }

  return false;
}
