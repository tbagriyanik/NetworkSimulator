import { describe, it, expect } from 'vitest';
import {
  addDeviceGuidedSteps,
  pcCmdGuidedSteps,
  cliBasicsGuidedSteps,
  basicSwitchGuidedSteps,
  basicLanGuidedSteps,
  vlanGuidedSteps,
  routerDhcpGuidedSteps,
  staticRoutingGuidedSteps,
  portSecurityGuidedSteps,
  ripRoutingGuidedSteps,
  servicesGuidedSteps,
  sohoGuidedSteps,
  campusGuidedSteps,
  hospitalGuidedSteps,
  ecommerceGuidedSteps,
  teachMeBeginnerSteps,
  teachMeIntermediateSteps,
  teachMeAdvancedSteps,
  cliGuidedLessons
} from '../../../lib/network/lessonSteps';
import type { GuidedStep } from '../../../lib/network/guidedMode.types';
import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';

// Extraction helper simulating the exact handleShowMe logic from usePageGlobalEvents.ts
function extractShowMeCommand(step: GuidedStep, topologyDevices: CanvasDevice[] = []): { cleanCommand: string; deviceId?: string; targetDeviceType?: string } {
  const checkType = step.checkType;
  const toIp = step.checkParams?.toIp;
  const hintCommand = step.hint?.en || step.hint?.tr;
  const commandPattern = step.checkParams?.commandPattern;
  const targetDeviceId = step.checkParams?.targetDeviceId || step.checkParams?.fromDevice;
  const deviceType = step.checkParams?.deviceType;
  const stepId = step.id;

  let deviceId = targetDeviceId;

  let rawStr = '';
  if (checkType === 'ping' && toIp) {
    rawStr = `ping ${toIp}`;
  } else if (hintCommand) {
    rawStr = String(hintCommand);
  } else if (commandPattern) {
    rawStr = String(commandPattern).split('|')[0];
  }

  if (!deviceId && rawStr) {
    const colonMatch = rawStr.match(/^([^:]{1,40}):\s*/);
    if (colonMatch) {
      const targetName = colonMatch[1].trim().toLowerCase();
      const found = topologyDevices.find(
        d => d.name.toLowerCase() === targetName || d.id.toLowerCase() === targetName
      );
      if (found) {
        deviceId = found.id;
      }
    }
  }

  let cleanCommand = '';

  const rawLines = rawStr.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const isPromptOrModeLine = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/^([a-zA-Z0-9_.-]+(\([^)]+\))?|[A-Z]:\\[^>]*)[>#]\s*$/i.test(trimmed)) return true;
    if (/^\(?(örnek|ornek|example|mod|mode|prompt)\s*:\s*[a-zA-Z0-9_.-]+(\([^)]+\))?[>#]\)?\s*$/i.test(trimmed)) return true;
    return false;
  };
  const contentLines = rawLines.filter(l => !isPromptOrModeLine(l));
  const targetLine = contentLines.length > 0 ? contentLines[0] : (rawLines[0] || '');

  const quoteMatch = targetLine.match(/["'“”`]([^"'“”`]+)["'“”`]/);
  if (quoteMatch && quoteMatch[1].trim()) {
    cleanCommand = quoteMatch[1].trim();
  } else {
    cleanCommand = targetLine;
  }

  cleanCommand = cleanCommand
    .replace(/^[^:]{1,40}:\s*/i, '')
    .replace(/^PC\d*\s+CMD\s*>\s*/i, '')
    .replace(/^[a-zA-Z0-9_.-]+(\([^)]+\))?[>#]\s*/, '')
    .replace(/^(type|yazın|yazin|run|enter)\s+/i, '')
    .replace(/\s+(yazın|yazin|yazınız|yaziniz)\.?$/i, '')
    .replace(/\s+(and press enter|press enter|yazıp enter'a basın|yazip enter'a basin|yazıp enter tuşuna basın)\.?$/i, '')
    .replace(/^["'“”`]+|["'“”`.,!?]+$/g, '')
    .trim();

  if (!cleanCommand && commandPattern) {
    cleanCommand = String(commandPattern).split('|')[0].replace(/[\^$()]/g, '').trim();
  }

  let resolvedTargetType = 'switch/router';
  if (!deviceId) {
    if (deviceType === 'switch') {
      resolvedTargetType = 'switch';
    } else if (deviceType === 'router') {
      resolvedTargetType = 'router';
    } else if (deviceType === 'pc') {
      resolvedTargetType = 'pc';
    } else if (
      (stepId && (String(stepId).includes('pc') || String(stepId).startsWith('run-') || String(stepId).startsWith('pc-'))) ||
      cleanCommand.startsWith('ipconfig') ||
      cleanCommand.startsWith('tracert') ||
      cleanCommand.startsWith('cls') ||
      cleanCommand.startsWith('nslookup')
    ) {
      resolvedTargetType = 'pc';
    } else if (
      stepId && (String(stepId).includes('router') || String(stepId).startsWith('r-') || String(stepId).includes('route'))
    ) {
      resolvedTargetType = 'router';
    } else if (
      stepId && (String(stepId).includes('switch') || String(stepId).startsWith('sw-') || String(stepId).includes('vlan') || String(stepId).includes('stp'))
    ) {
      resolvedTargetType = 'switch';
    } else {
      const hintStr = rawStr.toLowerCase();
      if (hintStr.includes('s-lab') || hintStr.includes('sw-') || hintStr.includes('switch')) {
        resolvedTargetType = 'switch';
      } else if (hintStr.includes('r-lab') || hintStr.includes('router')) {
        resolvedTargetType = 'router';
      } else if (hintStr.includes('pc-') || hintStr.includes('pc')) {
        resolvedTargetType = 'pc';
      }
    }
  }

  return { cleanCommand, deviceId, targetDeviceType: resolvedTargetType };
}

describe('All Guided Lessons "Bana Göster" Audit', () => {
  const allLessonCollections: { name: string; steps: GuidedStep[] }[] = [
    { name: 'addDevice', steps: addDeviceGuidedSteps },
    { name: 'pcCmd', steps: pcCmdGuidedSteps },
    { name: 'cliBasics', steps: cliBasicsGuidedSteps },
    { name: 'basicSwitch', steps: basicSwitchGuidedSteps },
    { name: 'basicLan', steps: basicLanGuidedSteps },
    { name: 'vlan', steps: vlanGuidedSteps },
    { name: 'routerDhcp', steps: routerDhcpGuidedSteps },
    { name: 'staticRouting', steps: staticRoutingGuidedSteps },
    { name: 'portSecurity', steps: portSecurityGuidedSteps },
    { name: 'ripRouting', steps: ripRoutingGuidedSteps },
    { name: 'services', steps: servicesGuidedSteps },
    { name: 'soho', steps: sohoGuidedSteps },
    { name: 'campus', steps: campusGuidedSteps },
    { name: 'hospital', steps: hospitalGuidedSteps },
    { name: 'ecommerce', steps: ecommerceGuidedSteps },
    { name: 'teachMeBeginner', steps: teachMeBeginnerSteps },
    { name: 'teachMeIntermediate', steps: teachMeIntermediateSteps },
    { name: 'teachMeAdvanced', steps: teachMeAdvancedSteps },
    { name: 'cliGuidedLessons', steps: cliGuidedLessons }
  ];

  it('should process every command/ping step in all guided lessons without errors', () => {
    let totalCommandSteps = 0;

    for (const collection of allLessonCollections) {
      for (const step of collection.steps) {
        if (step.checkType === 'command' || step.checkType === 'ping') {
          totalCommandSteps++;
          const result = extractShowMeCommand(step);

          // 1. Clean command must not be empty
          expect(result.cleanCommand, `Step ${step.id} in ${collection.name} produced empty command`).not.toBe('');

          // 2. Clean command must not contain raw prompt symbols like '#' or '>' at start or end
          expect(result.cleanCommand).not.toMatch(/^[a-zA-Z0-9_-]+[>#]/);

          // 3. Clean command must not end with prose punctuation or quotes
          expect(result.cleanCommand).not.toMatch(/["'“”]$/);
        }
      }
    }

    expect(totalCommandSteps).toBeGreaterThan(50);
  });
});


