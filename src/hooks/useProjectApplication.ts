'use client';

import { useCallback } from 'react';
import type { CanvasDevice, CanvasNote } from '@/components/network/networkTopology.types';
import type { ExamProject, ProjectData } from '@/lib/network/examMode';
import { generateExamFromProject } from '@/lib/network/examMode';
import type { GuidedProject } from '@/lib/network/guidedMode';
import type { ExampleProject } from '@/lib/network/exampleProjects';
import { createInitialState, createInitialRouterState, createInitialFirewallState, createInitialWLCState } from '@/lib/network/initialState';
import { addProjectRecord } from '@/utils/achievementRecords';

export function useProjectApplication({
  loadProjectData,
  setShowProjectPicker,
  setZoom,
  setPan,
  setProjectName,
  setLoadedExampleId,
  setRefreshNetworkReport,
  closeGuidedMode,
  closeExam,
  startExamProject,
  startGuidedProject,
  toggleEditor,
  setIsExamLoadedFromFile,
  resetWorkspaceUiState,
  groupedExampleProjects,
  exampleLevelOrder,
  projectName,
  language,
  toast,
}: {
  loadProjectData: (data: unknown) => void;
  setShowProjectPicker: (v: boolean) => void;
  setZoom: (v: number) => void;
  setPan: (v: { x: number; y: number }) => void;
  setProjectName: (v: string) => void;
  setLoadedExampleId: (v: string) => void;
  setRefreshNetworkReport: (v: null) => void;
  closeGuidedMode: () => void;
  closeExam: () => void;
  startExamProject: (project: ExamProject) => void;
  startGuidedProject: (project: GuidedProject) => void;
  toggleEditor: (v: boolean) => void;
  resetWorkspaceUiState: () => void;
  setIsExamLoadedFromFile: (v: boolean) => void;
  groupedExampleProjects: Record<string, ExampleProject[]>;
  exampleLevelOrder: string[];
  projectName: string;
  language: 'tr' | 'en';
  toast: (params: { title: string; description: string }) => void;
}) {
  const applyExampleProjectAsTemplate = useCallback((projectData: unknown, exampleId?: string) => {
    const data = (projectData && typeof projectData === 'object') ? projectData as Record<string, unknown> : {};
    const topology = (data.topology && typeof data.topology === 'object') ? data.topology as Record<string, unknown> : {};
    const safeTopologyDevices = Array.isArray(topology.devices) ? topology.devices as CanvasDevice[] : [];
    const safeTopologyConnections = Array.isArray(topology.connections) ? topology.connections : [];
    const safeTopologyNotes = Array.isArray(topology.notes) ? topology.notes as CanvasNote[] : [];

    const freshDeviceStates: { id: string; state: unknown }[] = [];
    safeTopologyDevices.forEach(device => {
      if (device.type === 'switchL2' || device.type === 'switchL3') {
        freshDeviceStates.push({
          id: device.id,
          state: createInitialState(device.macAddress, device.switchModel === 'WS-C3650-24PS' ? 'WS-C3650-24PS' : 'WS-C2960-24TT-L')
        });
      } else if (device.type === 'router') {
        freshDeviceStates.push({
          id: device.id,
          state: createInitialRouterState(device.macAddress)
        });
      } else if (device.type === 'firewall') {
        freshDeviceStates.push({
          id: device.id,
          state: createInitialFirewallState(device.macAddress)
        });
      } else if (device.type === 'wlc') {
        freshDeviceStates.push({
          id: device.id,
          state: createInitialWLCState(device.macAddress)
        });
      }
    });

    const templatePrefix = language === 'tr'
      ? '\u26A0\uFE0F \u015Eablon (Cihazlar yap\u0131land\u0131r\u0131lmam\u0131\u015ft\u0131r)\n\u25B8 A\u015Fa\u011F\u0131daki ad\u0131mlar\u0131 kendiniz uygulay\u0131n\n\n'
      : '\u26A0\uFE0F Template (Devices are not configured)\n\u25B8 Apply the steps below yourself\n\n';
    const templateNotes: CanvasNote[] = safeTopologyNotes.length > 0
      ? safeTopologyNotes.map((note: CanvasNote) => ({
        ...note,
        text: note.text.includes('\u26A0\uFE0F \u015Eablon') || note.text.includes('\u26A0\uFE0F Template')
          ? note.text
          : templatePrefix + note.text
      }))
      : [{
        id: 'template-note',
        text: templatePrefix + (language === 'tr'
          ? 'Cihazlar\u0131 yap\u0131land\u0131rmak i\u00E7in terminali kullan\u0131n.'
          : 'Use the terminal to configure devices.'),
        x: 100, y: 100, width: 350, height: 120,
        color: 'var(--color-warning-400)', font: 'monospace', fontSize: 16, opacity: 0.75
      } as unknown as CanvasNote];

    const templateData: Record<string, unknown> = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      devices: freshDeviceStates,
      deviceOutputs: [],
      pcOutputs: [],
      pcHistories: [],
      topology: {
        devices: safeTopologyDevices,
        connections: safeTopologyConnections,
        notes: templateNotes
      },
      cableInfo: (data.cableInfo && typeof data.cableInfo === 'object') ? data.cableInfo : {
        connected: true, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2'
      },
      activeDeviceId: freshDeviceStates[0]?.id || safeTopologyDevices[0]?.id || 'switch-1',
      activeDeviceType: safeTopologyDevices[0]?.type || 'switchL2',
      activeTab: 'topology',
      zoom: 1.0,
      pan: { x: 0, y: 0 }
    };

    loadProjectData(templateData);
    setRefreshNetworkReport(null);
    let loadedTitle = projectName;
    if (exampleId) {
      setLoadedExampleId(exampleId);
      let foundDesc = '';
      for (const level of exampleLevelOrder) {
        const projects = groupedExampleProjects[level];
        if (projects) {
          const found = projects.find(p => p.id === exampleId);
          if (found) {
            loadedTitle = language === 'tr' ? `${found.title} (\u015Eablon)` : `${found.title} (Template)`;
            setProjectName(loadedTitle);
            foundDesc = found.description;
            break;
          }
        }
      }
      if (foundDesc) {
        localStorage.setItem('lastProjectDescription', foundDesc);
      } else {
        localStorage.removeItem('lastProjectDescription');
      }
    } else {
      localStorage.removeItem('lastProjectDescription');
    }
    setShowProjectPicker(false);
    closeGuidedMode();
    closeExam();
    addProjectRecord(loadedTitle);
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [loadProjectData, setShowProjectPicker, setZoom, setPan, closeGuidedMode, closeExam, setProjectName, setLoadedExampleId, setRefreshNetworkReport, groupedExampleProjects, exampleLevelOrder, projectName, addProjectRecord, language]);

  const applyExampleProject = useCallback((projectData: unknown, exampleId?: string) => {
    loadProjectData(projectData);
    setRefreshNetworkReport(null);
    let loadedTitle = projectName;
    if (exampleId) {
      setLoadedExampleId(exampleId);
      let foundDesc = '';
      for (const level of exampleLevelOrder) {
        const projects = groupedExampleProjects[level];
        if (projects) {
          const found = projects.find(p => p.id === exampleId);
          if (found) {
            loadedTitle = found.title;
            setProjectName(found.title);
            foundDesc = found.description;
            break;
          }
        }
      }
      if (foundDesc) {
        localStorage.setItem('lastProjectDescription', foundDesc);
      } else {
        localStorage.removeItem('lastProjectDescription');
      }
    } else {
      localStorage.removeItem('lastProjectDescription');
    }
    setShowProjectPicker(false);
    closeGuidedMode();
    closeExam();

    addProjectRecord(loadedTitle);

    setZoom(1.0);
    setPan({ x: 0, y: 0 });

    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [loadProjectData, setShowProjectPicker, setZoom, setPan, closeGuidedMode, closeExam, setProjectName, setLoadedExampleId, setRefreshNetworkReport, groupedExampleProjects, exampleLevelOrder, projectName, addProjectRecord]);

  const startExamFromCatalog = useCallback((project: ExamProject) => {
    setIsExamLoadedFromFile(false);
    closeGuidedMode();
    startExamProject(project);
  }, [startExamProject, closeGuidedMode, setIsExamLoadedFromFile]);

  const handleConvertProjectToExam = useCallback((projectData: unknown) => {
    document.body.style.cursor = 'wait';
    closeExam();
    closeGuidedMode();
    resetWorkspaceUiState();
    startExamProject(generateExamFromProject(projectData as ProjectData, language));
    loadProjectData(projectData);
    toggleEditor(true);
    document.body.style.cursor = '';
    toast({
      title: language === 'tr' ? 'Proje D\u00F6n\u00FC\u015Ft\u00FCr\u00FCld\u00FC' : 'Project Converted',
      description: language === 'tr' ? 'G\u00F6revler otomatik olarak \u00E7\u0131kar\u0131ld\u0131 ve S\u0131nav D\u00FCzenleyici a\u00E7\u0131ld\u0131.' : 'Tasks were automatically extracted and the Exam Editor was opened.',
    });
  }, [closeExam, closeGuidedMode, language, startExamProject, loadProjectData, toggleEditor, toast, resetWorkspaceUiState]);

  const handleStartGuidedProject = useCallback((project: GuidedProject) => {
    closeExam();
    resetWorkspaceUiState();
    startGuidedProject(project);
  }, [startGuidedProject, closeExam, resetWorkspaceUiState]);

  return {
    applyExampleProjectAsTemplate,
    applyExampleProject,
    startExamFromCatalog,
    handleConvertProjectToExam,
    handleStartGuidedProject,
  };
}
