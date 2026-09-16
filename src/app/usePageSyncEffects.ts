import { useEffect, useRef } from 'react';
import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { addSessionDuration, addGuidedLessonRecord, addExamRecord } from '@/utils/achievementRecords';
import { performanceMonitor } from '@/lib/performance/monitoring';

interface UsePageSyncEffectsOptions {
  sessionStart: number;
  activeGuidedProject: any;
  isAllCompleted: boolean;
  currentPoints: number;
  totalPoints: number;
  isExamFinished: boolean;
  activeExam: any;
  examScore: number;
  isExamActive: boolean;
  helpLevel: 'beginner' | 'intermediate' | 'exam';
  setHelpLevel: (level: 'beginner' | 'intermediate' | 'exam') => void;
  topologyDevices: CanvasDevice[];
  deviceStates: Map<string, SwitchState>;
  setTopologyDevices: (devices: CanvasDevice[]) => void;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  topologyConnections: CanvasConnection[];
  handleRefreshNetwork: () => void;
}

export function usePageSyncEffects({
  sessionStart,
  activeGuidedProject,
  isAllCompleted,
  currentPoints,
  totalPoints,
  isExamFinished,
  activeExam,
  examScore,
  isExamActive,
  helpLevel,
  setHelpLevel,
  topologyDevices,
  deviceStates,
  setTopologyDevices,
  setHasUnsavedChanges,
  topologyConnections,
  handleRefreshNetwork,
}: UsePageSyncEffectsOptions) {

  useEffect(() => {
    const handleBeforeUnload = () => {
      const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
      if (elapsed >= 10) {
        addSessionDuration(elapsed);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionStart]);

  const prevGuidedRef = useRef(activeGuidedProject);
  const prevAllDoneRef = useRef(false);
  useEffect(() => {
    if (activeGuidedProject && isAllCompleted && !prevAllDoneRef.current) {
      const lessonName = typeof activeGuidedProject.title === 'string'
        ? activeGuidedProject.title
        : (activeGuidedProject.title as { tr?: string; en?: string })?.tr || (activeGuidedProject.title as { tr?: string; en?: string })?.en || 'Guided Lesson';
      addGuidedLessonRecord(lessonName, currentPoints, totalPoints);
    }
    prevAllDoneRef.current = !!isAllCompleted;
  }, [isAllCompleted, activeGuidedProject, currentPoints, totalPoints]);

  useEffect(() => {
    const prev = prevGuidedRef.current;
    if (prev && !activeGuidedProject && prev.steps.every((s: any) => s.completed)) {
      const lessonName = typeof prev.title === 'string'
        ? prev.title
        : (prev.title as { tr?: string; en?: string })?.tr || (prev.title as { tr?: string; en?: string })?.en || 'Guided Lesson';
      const earned = prev.steps.filter((s: any) => s.completed).reduce((sum: number, s: any) => sum + (s.points || 0), 0);
      const total = prev.steps.reduce((sum: number, s: any) => sum + (s.points || 0), 0);
      addGuidedLessonRecord(lessonName, earned, total);
    }
    prevGuidedRef.current = activeGuidedProject;
  }, [activeGuidedProject]);

  useEffect(() => {
    if (isExamFinished && activeExam) {
      const maxScore = activeExam.tasks.reduce((sum: number, t: any) => sum + t.weight, 0);
      const examName = typeof activeExam.title === 'string'
        ? activeExam.title
        : (activeExam.title as { tr?: string; en?: string })?.tr || (activeExam.title as { tr?: string; en?: string })?.en || 'Exam';
      addExamRecord(examName, examScore, maxScore || 100);
    }
  }, [isExamFinished, activeExam, examScore]);

  const prevHelpLevelRef = useRef<'beginner' | 'intermediate' | 'exam' | null>(null);
  const prevIsExamActiveRef = useRef(false);
  useEffect(() => {
    if (isExamActive && !prevIsExamActiveRef.current) {
      prevHelpLevelRef.current = helpLevel;
      if (helpLevel !== 'exam') setHelpLevel('exam');
    } else if (!isExamActive && prevIsExamActiveRef.current) {
      if (prevHelpLevelRef.current && prevHelpLevelRef.current !== 'exam') {
        setHelpLevel(prevHelpLevelRef.current);
      }
      prevHelpLevelRef.current = null;
    }
    prevIsExamActiveRef.current = isExamActive;
  }, [isExamActive, helpLevel, setHelpLevel]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const intervalId = window.setInterval(() => {
      const metrics = performanceMonitor.getMetrics();
      const thresholdStatus = performanceMonitor.checkThresholds();
      (window as unknown as { __netsimPerformance?: unknown }).__netsimPerformance = {
        metrics,
        thresholdStatus,
        timestamp: Date.now(),
      };
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!topologyDevices) return;

    let topologyChanged = false;

    const updatedTopologyDevices = topologyDevices.map(device => {
      if (device.type === 'pc') return device;

      const deviceState = deviceStates.get(device.id);
      if (!deviceState) return device;

      if (deviceState.hostname !== device.name) {
        topologyChanged = true;
        return { ...device, name: deviceState.hostname };
      }
      return device;
    });

    if (topologyChanged) {
      setTopologyDevices(updatedTopologyDevices);
      setTimeout(() => setHasUnsavedChanges(true), 0);
    }
  }, [deviceStates, topologyDevices, setTopologyDevices, setHasUnsavedChanges]);

  useEffect(() => {
    if (!topologyDevices) return;

    let topologyChanged = false;

    const updatedTopologyDevices = topologyDevices.map(device => {
      const deviceState = deviceStates.get(device.id);
      if (!deviceState) return device;

      const currentServices = device.services || {};
      const stateServices = deviceState.services || {};

      const httpEnabledFromState = stateServices.http?.enabled;
      const httpEnabled = typeof httpEnabledFromState === 'boolean' ? httpEnabledFromState : currentServices.http?.enabled;
      const currentHttpEnabled = currentServices.http?.enabled || false;

      if (typeof httpEnabled === 'boolean' && httpEnabled !== currentHttpEnabled) {
        topologyChanged = true;
        return {
          ...device,
          services: {
            ...currentServices,
            http: {
              ...currentServices.http,
              enabled: httpEnabled,
              content: currentServices.http?.content || ''
            }
          }
        };
      }

      return device;
    });

    if (topologyChanged) {
      setTopologyDevices(updatedTopologyDevices);
      setTimeout(() => setHasUnsavedChanges(true), 0);
    }
  }, [deviceStates, topologyDevices, setTopologyDevices, setHasUnsavedChanges]);

  const dhcpRefreshAttemptRef = useRef<string | null>(null);
  useEffect(() => {
    const dhcpClients = topologyDevices.filter(d => (d.type === 'pc' || d.type === 'iot') && d.ipConfigMode === 'dhcp');
    if (dhcpClients.length === 0) return;

    const needsDhcp = dhcpClients.some(pc => {
      const hasValidIp = (ip: string | undefined) => !!ip && ip !== '0.0.0.0' && !ip.startsWith('169.254.');
      if (hasValidIp(pc.ip)) return false;

      if (pc.wifi?.enabled && pc.wifi?.ssid && pc.wifi?.bssid) return true;

      const isConnectedViaCable = topologyConnections.some(c =>
        c.active !== false && (c.sourceDeviceId === pc.id || c.targetDeviceId === pc.id)
      );
      return isConnectedViaCable;
    });

    if (needsDhcp) {
      const refreshSignature = [
        ...dhcpClients.map(d => `${d.id}:${d.ip || ''}:${d.wifi?.ssid || ''}`),
        ...topologyConnections
          .filter(c => c.active !== false)
          .map(c => `${c.id}:${c.sourceDeviceId}:${c.targetDeviceId}`)
      ].sort().join('|');
      if (dhcpRefreshAttemptRef.current === refreshSignature) return;
      dhcpRefreshAttemptRef.current = refreshSignature;

      const timer = setTimeout(() => {
        handleRefreshNetwork();
      }, 2000);
      return () => clearTimeout(timer);
    }
    return;
  }, [topologyDevices, topologyConnections, handleRefreshNetwork]);
}


