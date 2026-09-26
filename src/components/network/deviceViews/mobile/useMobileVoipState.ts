import { useState, useRef, useEffect } from 'react';
import type { CanvasDevice, CanvasConnection } from '../../NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { checkConnectivity } from '@/lib/network/connectivity/pathResolution';
import { dispatchCapturedPackets } from '@/utils/packetCapture';
import { useAppStore } from '@/lib/store/appStore';

interface UseMobileVoipStateProps {
  device: CanvasDevice;
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  deviceStates: Map<string, SwitchState>;
  isTr: boolean;
}

export function useMobileVoipState({
  device,
  topologyDevices,
  topologyConnections,
  deviceStates,
  isTr,
}: UseMobileVoipStateProps) {
  const setDevices = useAppStore(state => state.setDevices);

  const [dialNumber, setDialNumber] = useState('');
  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'failed'>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [callStatusMessage, setCallStatusMessage] = useState('');
  const [rtpMetrics, setRtpMetrics] = useState<{ rtt: number; jitter: number; loss: number }>({ rtt: 2, jitter: 0.5, loss: 0 });
  const activeCallTargetRef = useRef<CanvasDevice | null>(null);

  const callDurationRef = useRef(0);
  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  // Handle End VoIP Call
  const handleEndVoipCall = () => {
    const activeVoip = device.activeVoipCall;
    const targetDev = activeCallTargetRef.current;

    const remotePeerDev = targetDev || topologyDevices.find(d =>
      d.id !== device.id && (
        d.id === activeVoip?.callerId ||
        d.activeVoipCall?.callerId === device.id ||
        (d.activeVoipCall && activeVoip && d.activeVoipCall.callerId === activeVoip.callerId)
      )
    );

    const duration = callDurationRef.current;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setDevices(prev =>
      prev.map(d => {
        const isThisDev = d.id === device.id;
        const isRemoteDev = remotePeerDev && d.id === remotePeerDev.id;

        if (isThisDev) {
          const peerName = remotePeerDev ? remotePeerDev.name : (activeVoip?.callerName || dialNumber || 'VoIP Peer');
          const peerIp = remotePeerDev ? remotePeerDev.ip : activeVoip?.callerIp;
          const newHistoryItem = {
            id: `call-${Date.now()}-${Math.random()}`,
            peerName,
            peerIp,
            type: (targetDev ? 'outgoing' : 'incoming') as 'outgoing' | 'incoming',
            status: (activeVoip?.status === 'connected' || callState === 'connected' ? 'answered' : 'rejected') as 'answered' | 'rejected',
            durationSeconds: duration,
            timestamp: timeStr
          };
          return {
            ...d,
            activeVoipCall: undefined,
            voipHistory: [newHistoryItem, ...(d.voipHistory || [])]
          };
        }

        if (isRemoteDev) {
          const newHistoryItem = {
            id: `call-${Date.now()}-${Math.random()}`,
            peerName: device.name,
            peerIp: device.ip,
            type: (targetDev ? 'incoming' : 'outgoing') as 'outgoing' | 'incoming',
            status: (activeVoip?.status === 'connected' || callState === 'connected' ? 'answered' : 'rejected') as 'answered' | 'rejected',
            durationSeconds: duration,
            timestamp: timeStr
          };
          return {
            ...d,
            activeVoipCall: undefined,
            voipHistory: [newHistoryItem, ...(d.voipHistory || [])]
          };
        }

        return d;
      })
    );

    setCallState('idle');
    setCallStatusMessage('');
    activeCallTargetRef.current = null;
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (callState === 'connected' || callState === 'calling') {
      timer = setInterval(() => {
        if (callState === 'connected') {
          setCallDuration(prev => prev + 1);
          setRtpMetrics({
            rtt: Math.floor(Math.random() * 4) + 2,
            jitter: Number((Math.random() * 0.8 + 0.1).toFixed(1)),
            loss: 0
          });
        }

        const activeVoip = device.activeVoipCall;
        const targetDev = activeCallTargetRef.current || topologyDevices.find(d =>
          d.id !== device.id && (
            d.id === activeVoip?.callerId ||
            d.activeVoipCall?.callerId === device.id ||
            (d.activeVoipCall && activeVoip && d.activeVoipCall.callerId === activeVoip.callerId)
          )
        );

        if (targetDev) {
          const targetIp = targetDev.ip || activeVoip?.callerIp || dialNumber;
          if (targetIp) {
            const res = checkConnectivity(
              device.id,
              targetIp,
              topologyDevices,
              topologyConnections,
              deviceStates,
              isTr ? 'tr' : 'en',
              { protocol: 'udp', port: '5060' }
            );

            if (!res.success || targetDev.status === 'offline') {
              handleEndVoipCall();
              setCallState('failed');
              setCallStatusMessage(isTr ? 'Arama Sonlandırıldı: Bağlantı koptu!' : 'Call Ended: Connection lost!');
              setTimeout(() => {
                setCallState('idle');
                setCallStatusMessage('');
              }, 3000);
            }
          }
        }
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState, device, topologyDevices, topologyConnections, deviceStates, isTr, dialNumber]);

  useEffect(() => {
    if (!device.activeVoipCall) {
      if (callState !== 'idle' && callState !== 'failed') {
        setCallState('idle');
        setCallStatusMessage('');
        activeCallTargetRef.current = null;
      }
    } else if (device.activeVoipCall.status === 'connected' && callState !== 'connected') {
      setCallState('connected');
      const peerName = device.activeVoipCall.callerName;
      setCallStatusMessage(isTr ? `Bağlandı: ${peerName}` : `Connected to ${peerName}`);
    }
  }, [device.activeVoipCall, callState, isTr]);

  const handleInitiateVoipCall = (targetInput?: string) => {
    const rawTarget = (targetInput || dialNumber).trim();
    if (!rawTarget) return;

    setCallState('calling');
    setCallStatusMessage(isTr ? `Aranıyor: ${rawTarget}...` : `Calling ${rawTarget}...`);

    let targetDev = topologyDevices.find(d => d.ip === rawTarget || d.name?.toLowerCase() === rawTarget.toLowerCase() || d.id === rawTarget);

    if (!targetDev && /^\d+$/.test(rawTarget)) {
      targetDev = topologyDevices.find(d => d.ip?.endsWith(`.${rawTarget}`) || d.ip?.includes(rawTarget));
    }

    setTimeout(() => {
      const targetIpToTest = targetDev?.ip || rawTarget;
      const res = checkConnectivity(
        device.id,
        targetIpToTest,
        topologyDevices,
        topologyConnections,
        deviceStates,
        isTr ? 'tr' : 'en',
        { protocol: 'udp', port: '5060' }
      );

      if (res.capturedPackets && res.capturedPackets.length > 0) {
        dispatchCapturedPackets(res.capturedPackets);
      } else {
        dispatchCapturedPackets([{
          connectionId: topologyConnections[0]?.id || '',
          sourceIp: device.ip || '0.0.0.0',
          targetIp: targetIpToTest,
          protocol: 'SIP/UDP',
          length: 420,
          info: `SIP INVITE Call Request (Port 5060) -> ${targetIpToTest}`
        }]);
      }

      if (targetDev && targetDev.status === 'offline') {
        setCallState('failed');
        setCallStatusMessage(isTr ? `Arama Başarısız: "${targetDev.name}" kapalı (Power Off)!` : `Call Failed: "${targetDev.name}" is powered off!`);
        setTimeout(() => {
          setCallState('idle');
          setCallStatusMessage('');
        }, 3500);
        return;
      }

      if (res.success) {
        activeCallTargetRef.current = targetDev || null;
        setCallState('connected');
        const targetName = targetDev ? targetDev.name : targetIpToTest;
        setCallStatusMessage(isTr ? `Arama Yapılıyor (Çalıyor): ${targetName}` : `Ringing ${targetName}...`);

        setDevices(prev =>
          prev.map(d => {
            if (d.id === device.id) {
              return {
                ...d,
                activeVoipCall: {
                  callerId: device.id,
                  callerName: targetName,
                  callerIp: targetIpToTest,
                  status: 'ringing'
                }
              };
            }
            if (targetDev && d.id === targetDev.id) {
              return {
                ...d,
                activeVoipCall: {
                  callerId: device.id,
                  callerName: device.name,
                  callerIp: device.ip,
                  status: 'ringing'
                }
              };
            }
            return d;
          })
        );
      } else {
        setCallState('failed');
        setCallStatusMessage(res.error || (isTr ? 'Arama Başarısız: Hedef Ulaşılamıyor' : 'Call Failed: Target Unreachable'));
        setTimeout(() => {
          setCallState('idle');
          setCallStatusMessage('');
        }, 3000);
      }
    }, 1200);
  };

  const handleAnswerVoipCall = () => {
    if (!device.activeVoipCall) return;
    const callerId = device.activeVoipCall.callerId;
    setCallState('connected');

    setDevices(prev =>
      prev.map(d => {
        if (d.id === device.id || d.id === callerId) {
          return {
            ...d,
            activeVoipCall: {
              ...(d.activeVoipCall || { callerId, callerName: device.name, callerIp: device.ip }),
              status: 'connected'
            }
          };
        }
        return d;
      })
    );
  };

  const handleClearVoipHistory = () => {
    setDevices(prev =>
      prev.map(d => (d.id === device.id ? { ...d, voipHistory: [] } : d))
    );
  };

  const handleDialKeyPress = (key: string) => {
    if (callState !== 'idle') return;
    setDialNumber(prev => prev + key);
  };

  const handleDialDelete = () => {
    if (callState !== 'idle') return;
    setDialNumber(prev => prev.slice(0, -1));
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return {
    dialNumber,
    setDialNumber,
    callState,
    callDuration,
    callStatusMessage,
    rtpMetrics,
    activeCallTarget: activeCallTargetRef.current,
    handleInitiateVoipCall,
    handleAnswerVoipCall,
    handleEndVoipCall,
    handleClearVoipHistory,
    handleDialKeyPress,
    handleDialDelete,
    formatDuration,
  };
}
