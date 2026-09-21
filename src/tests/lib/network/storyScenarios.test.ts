import { describe, it, expect } from 'vitest';
import { STORY_CAMPAIGNS } from '@/lib/network/storyScenarios';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

function createMockDevice(overrides: Partial<CanvasDevice> & { id: string; type: CanvasDevice['type']; name: string }): CanvasDevice {
  return {
    ip: '',
    status: 'online',
    ports: [],
    x: 0,
    y: 0,
    ...overrides,
  };
}

describe('Story Scenarios & Campaigns', () => {
  it('contains valid and complete story campaigns with categories', () => {
    expect(STORY_CAMPAIGNS.length).toBe(3);

    STORY_CAMPAIGNS.forEach((campaign) => {
      expect(campaign.id).toBeDefined();
      expect(campaign.title).toBeDefined();
      expect(campaign.titleEn).toBeDefined();
      expect(campaign.badge).toBeDefined();
      expect(['Basit', 'Orta', 'İleri']).toContain(campaign.category);
      expect(campaign.steps.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('validates step properties and bilingual text on all steps', () => {
    STORY_CAMPAIGNS.forEach((campaign) => {
      campaign.steps.forEach((step) => {
        expect(step.id).toBeDefined();
        expect(step.title).toBeDefined();
        expect(step.titleEn).toBeDefined();
        expect(step.narrative).toBeDefined();
        expect(step.narrativeEn).toBeDefined();
        expect(step.objective).toBeDefined();
        expect(step.objectiveEn).toBeDefined();
        expect(step.hint).toBeDefined();
        expect(step.points).toBeGreaterThan(0);
        expect(typeof step.check).toBe('function');
      });
    });
  });

  it('evaluates smart_office_iot backbone check step (so_1)', () => {
    const campaign = STORY_CAMPAIGNS.find((c) => c.id === 'smart_office_iot');
    const step1 = campaign?.steps.find((s) => s.id === 'so_1');
    expect(step1).toBeDefined();

    const emptyDevices: CanvasDevice[] = [];
    expect(step1!.check(emptyDevices, [])).toBe(false);

    const switchDevices: CanvasDevice[] = [
      createMockDevice({ id: 'sw-1', name: 'Switch 1', type: 'switchL2' }),
    ];
    expect(step1!.check(switchDevices, [])).toBe(true);
  });

  it('evaluates smart_office_iot PC and connection check step (so_2, so_3)', () => {
    const campaign = STORY_CAMPAIGNS.find((c) => c.id === 'smart_office_iot');
    const step2 = campaign?.steps.find((s) => s.id === 'so_2');
    const step3 = campaign?.steps.find((s) => s.id === 'so_3');

    const devices: CanvasDevice[] = [
      createMockDevice({ id: 'pc-1', name: 'PC1', type: 'pc' }),
    ];
    expect(step2!.check(devices, [])).toBe(true);
    expect(step3!.check(devices, [])).toBe(false);

    devices.push(createMockDevice({ id: 'sw-1', name: 'SW1', type: 'switchL2', x: 50, y: 50 }));
    const conns: CanvasConnection[] = [
      { id: 'c1', sourceDeviceId: 'pc-1', sourcePort: 'Eth0', targetDeviceId: 'sw-1', targetPort: 'Fa0/1', active: true, cableType: 'straight' },
    ];
    expect(step3!.check(devices, conns)).toBe(true);
  });

  it('evaluates smart_office_iot IoT sensor step (so_4)', () => {
    const campaign = STORY_CAMPAIGNS.find((c) => c.id === 'smart_office_iot');
    const iotStep = campaign?.steps.find((s) => s.id === 'so_4');
    expect(iotStep).toBeDefined();

    const withoutIot: CanvasDevice[] = [
      createMockDevice({ id: 'pc-1', name: 'PC1', type: 'pc' }),
    ];
    expect(iotStep!.check(withoutIot, [])).toBe(false);

    const withIot: CanvasDevice[] = [
      createMockDevice({ id: 'iot-1', name: 'Sensor 1', type: 'iot' }),
    ];
    expect(iotStep!.check(withIot, [])).toBe(true);
  });

  it('evaluates static PC network configuration checks (soc_3, dr_4)', () => {
    const socCampaign = STORY_CAMPAIGNS.find((c) => c.id === 'soc_incident_response');
    const soc3 = socCampaign?.steps.find((s) => s.id === 'soc_3');
    expect(soc3).toBeDefined();

    const unconfiguredPc: CanvasDevice[] = [
      createMockDevice({ id: 'pc-1', name: 'PC1', type: 'pc' }),
    ];
    expect(soc3!.check(unconfiguredPc, [])).toBe(false);

    const configuredPc: CanvasDevice[] = [
      createMockDevice({
        id: 'pc-1',
        name: 'PC1',
        type: 'pc',
        ip: '192.168.1.50',
        subnet: '255.255.255.0',
        ipConfigMode: 'static',
      }),
    ];
    expect(soc3!.check(configuredPc, [])).toBe(true);
  });

  it('evaluates router and routing checks with SwitchState deviceStates (soc_5, dr_1, dr_3)', () => {
    const drCampaign = STORY_CAMPAIGNS.find((c) => c.id === 'disaster_recovery_ha');
    expect(drCampaign).toBeDefined();

    const dr1 = drCampaign?.steps.find((s) => s.id === 'dr_1');
    expect(dr1).toBeDefined();

    const oneRouter: CanvasDevice[] = [
      createMockDevice({ id: 'r1', name: 'Router1', type: 'router' }),
    ];
    expect(dr1!.check(oneRouter, [])).toBe(false);

    const twoRouters: CanvasDevice[] = [
      createMockDevice({ id: 'r1', name: 'Router1', type: 'router' }),
      createMockDevice({ id: 'r2', name: 'Router2', type: 'router', x: 100, y: 100 }),
    ];
    expect(dr1!.check(twoRouters, [])).toBe(true);

    const dr3 = drCampaign?.steps.find((s) => s.id === 'dr_3');
    expect(dr3).toBeDefined();

    const stateMap = new Map<string, SwitchState>();
    stateMap.set('r1', {
      ports: {
        'gigabitethernet0/0': { ipAddress: '10.0.0.1', shutdown: false },
      },
    } as unknown as SwitchState);
    stateMap.set('r2', {
      ports: {
        'gigabitethernet0/0': { ipAddress: '10.0.0.2', shutdown: false },
      },
    } as unknown as SwitchState);

    expect(dr3!.check(twoRouters, [], stateMap)).toBe(true);
  });

  it('validates interactive choices and options scoring', () => {
    const campaignsWithChoices = STORY_CAMPAIGNS.filter((c) => c.steps.some((s) => s.choice !== undefined));
    expect(campaignsWithChoices.length).toBeGreaterThan(0);

    campaignsWithChoices.forEach((campaign) => {
      campaign.steps.filter((s) => s.choice).forEach((step) => {
        expect(step.choice?.question).toBeDefined();
        expect(step.choice?.options.length).toBeGreaterThanOrEqual(2);
        step.choice?.options.forEach((opt) => {
          expect(opt.label).toBeDefined();
          expect(typeof opt.bonusPoints).toBe('number');
          expect(opt.effectText).toBeDefined();
        });
      });
    });
  });

  it('validates incident events on emergency steps', () => {
    const campaignsWithIncidents = STORY_CAMPAIGNS.filter((c) => c.steps.some((s) => s.incidentEvent !== undefined));
    expect(campaignsWithIncidents.length).toBeGreaterThan(0);

    campaignsWithIncidents.forEach((campaign) => {
      campaign.steps.filter((s) => s.incidentEvent).forEach((step) => {
        expect(step.incidentEvent?.title).toBeDefined();
        expect(step.incidentEvent?.detail).toBeDefined();
        expect(['normal', 'critical', 'bonus']).toContain(step.incidentEvent?.urgency);
      });
    });
  });
});
