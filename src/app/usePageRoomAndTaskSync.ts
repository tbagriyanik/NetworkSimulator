import { useMemo } from 'react';
import {
  topologyTasks,
  portTasks,
  vlanTasks,
  securityTasks,
  wirelessTasks,
  routingTasks,
  dhcpTasks,
  calculateTaskScore,
  TaskContext,
  getTaskStatus,
} from '@/lib/network/taskDefinitions';
import { useTaskSync } from '@/hooks/useTaskSync';
import { useRoomSync } from '@/hooks/useRoomSync';
import type { SwitchState, CableInfo } from '@/lib/network/types';
import type { CanvasConnection, DeviceType } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { ExamProject } from '@/lib/network/examTypes';

interface UsePageRoomAndTaskSyncParams {
  activeDeviceType: string;
  cableInfo: CableInfo;
  showPCPanel: boolean;
  showRouterPanel: boolean;
  selectedDevice: DeviceType | null;
  language: 'tr' | 'en';
  deviceStates: Map<string, SwitchState>;
  topologyConnections: CanvasConnection[];
  state: SwitchState;
  setLastTaskEvent: React.Dispatch<React.SetStateAction<{ type: 'completed' | 'failed'; taskName: string; timestamp: number } | null>>;
  studentRoomCode: string | null;
  studentDisplayName: string;
  projectName: string;
  activeExam: ExamProject | null;
}

export function usePageRoomAndTaskSync({
  activeDeviceType,
  cableInfo,
  showPCPanel,
  showRouterPanel,
  selectedDevice,
  language,
  deviceStates,
  topologyConnections,
  state,
  setLastTaskEvent,
  studentRoomCode,
  studentDisplayName,
  projectName,
  activeExam,
}: UsePageRoomAndTaskSyncParams) {
  const isTaskSystemEnabled = activeDeviceType === 'switchL2' || activeDeviceType === 'switchL3' || activeDeviceType === 'router';
  
  const activeDeviceTasks = useMemo(
    () => isTaskSystemEnabled
      ? [
          ...topologyTasks,
          ...portTasks,
          ...vlanTasks,
          ...securityTasks,
          ...dhcpTasks,
          ...(activeDeviceType === 'router' || activeDeviceType === 'switchL3' ? routingTasks : []),
          ...(activeDeviceType !== 'switchL2' ? wirelessTasks : [])
        ]
      : [],
    [activeDeviceType, isTaskSystemEnabled]
  );

  const taskContext: TaskContext = useMemo(() => ({
    cableInfo,
    showPCPanel,
    showRouterPanel,
    selectedDevice,
    language,
    deviceStates,
    topologyConnections,
  }), [cableInfo, showPCPanel, showRouterPanel, selectedDevice, language, deviceStates, topologyConnections]);

  useTaskSync({
    isTaskSystemEnabled,
    activeDeviceTasks,
    state,
    taskContext,
    language,
    activeDeviceType,
    setLastTaskEvent,
  });

  const totalScore = isTaskSystemEnabled ? calculateTaskScore(activeDeviceTasks, state, taskContext) : 0;
  const maxScore = activeDeviceTasks.reduce((acc, task) => acc + task.weight, 0);

  const completedTaskCount = activeDeviceTasks.filter(t => getTaskStatus(t, state, taskContext)).length;
  const totalTaskCount = activeDeviceTasks.length;
  const currentTaskName = activeDeviceTasks.length > 0
    ? activeDeviceTasks.find(t => !getTaskStatus(t, state, taskContext))?.name[language] ?? activeDeviceTasks[activeDeviceTasks.length - 1].name[language]
    : '';

  useRoomSync({
    roomCode: studentRoomCode,
    displayName: studentDisplayName,
    currentTask: currentTaskName,
    completedTasks: completedTaskCount,
    totalTasks: totalTaskCount,
    projectFile: projectName !== 'Untitled' ? projectName : undefined,
    durationMinutes: activeExam?.durationMinutes,
  });

  return {
    isTaskSystemEnabled,
    activeDeviceTasks,
    taskContext,
    totalScore,
    maxScore,
    completedTaskCount,
    totalTaskCount,
    currentTaskName,
  };
}
