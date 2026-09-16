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

  const quoteMatch = rawStr.match(/["'â€œâ€]([^"'â€œâ€]+)["'â€œâ€]/);
  if (quoteMatch && quoteMatch[1].trim()) {
    cleanCommand = quoteMatch[1].trim();
  } else {
    cleanCommand = rawStr;
  }

  cleanCommand = cleanCommand
    .replace(/[\^$()]/g, '')
    .replace(/^[^:]{1,40}:\s*/i, '')
    .replace(/^[a-zA-Z0-9_-]+(\([^)]+\))?[>#]\s*/, '')
    .replace(/^(type|yazÄ±n|yazin)\s+/i, '')
    .replace(/\s+(yazÄ±n|yazin)\.?$/i, '')
    .replace(/\s+(and press enter|press enter)\.?$/i, '')
    .replace(/^["'â€œâ€]+|["'â€œâ€.,!?]+$/g, '')
    .trim();

  if (!cleanCommand && commandPattern) {
    cleanCommand = String(commandPattern).split('|')[0].replace(/[\^$()]/g, '').trim();
  }

  let resolvedTargetType = 'switch/router';
  if (!deviceId) {
    if (
      deviceType === 'pc' ||
      (stepId && (String(stepId).includes('pc') || String(stepId).startsWith('run-'))) ||
      cleanCommand === 'help' ||
      cleanCommand.includes('ipconfig') ||
      cleanCommand.includes('ping') ||
      cleanCommand.includes('ftp') ||
      cleanCommand.includes('tracert') ||
      cleanCommand.includes('cls') ||
      cleanCommand.includes('dir') ||
      cleanCommand.includes('nslookup')
    ) {
      resolvedTargetType = 'pc';
    } else if (deviceType === 'switch') {
      resolvedTargetType = 'switch';
    } else if (deviceType === 'router') {
      resolvedTargetType = 'router';
    }
  }

  return { cleanCommand, deviceId, targetDeviceType: resolvedTargetType };
}

describe('All Guided Lessons "Bana GÃ¶ster" Audit', () => {
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
          expect(result.cleanCommand).not.toMatch(/["'â€œâ€]$/);
        }
      }
    }

    expect(totalCommandSteps).toBeGreaterThan(50);
  });
});


