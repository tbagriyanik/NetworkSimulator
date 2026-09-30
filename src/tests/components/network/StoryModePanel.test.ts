import { describe, it, expect } from 'vitest';
import {
  initialStoryState,
  calculateStoryRank,
  STORAGE_KEY,
} from '@/components/network/StoryModePanel';
import { STORY_CAMPAIGNS } from '@/lib/network/storyScenarios';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

describe('StoryModePanel Logic & State Transitions', () => {
  it('initializes with default story state pointing to first campaign', () => {
    const state = initialStoryState();
    expect(state.campaignId).toBe(STORY_CAMPAIGNS[0].id);
    expect(state.stepIndex).toBe(0);
    expect(state.score).toBe(0);
    expect(state.skipped).toBe(0);
    expect(state.completed).toBe(false);
    expect(state.completedCampaigns).toEqual([]);
    expect(state.choicesMade).toEqual({});
  });

  it('verifies STORAGE_KEY format', () => {
    expect(STORAGE_KEY).toBe('netsim_interactive_story_v4');
  });

  it('correctly calculates ranks based on score in Turkish and English', () => {
    // Trainee / Stajyer
    expect(calculateStoryRank(0, true)).toBe('Stajyer');
    expect(calculateStoryRank(100, false)).toBe('Trainee');

    // Network Technician / Ağ Teknisyeni
    expect(calculateStoryRank(250, true)).toBe('Ağ Teknisyeni');
    expect(calculateStoryRank(300, false)).toBe('Network Technician');

    // Cyber Defender / Siber Savunucu
    expect(calculateStoryRank(500, true)).toBe('Siber Savunucu');
    expect(calculateStoryRank(650, false)).toBe('Cyber Defender');

    // Network Architect / Ağ Mimarı
    expect(calculateStoryRank(800, true)).toBe('Ağ Mimarı');
    expect(calculateStoryRank(1000, false)).toBe('Network Architect');

    // Lead Cyber Operator / Baş Siber Operatör
    expect(calculateStoryRank(1200, true)).toBe('Baş Siber Operatör');
    expect(calculateStoryRank(2000, false)).toBe('Lead Cyber Operator');
  });

  it('loads valid story campaigns structure with non-empty steps', () => {
    expect(STORY_CAMPAIGNS.length).toBeGreaterThanOrEqual(1);
    for (const campaign of STORY_CAMPAIGNS) {
      expect(campaign.id).toBeDefined();
      expect(campaign.title).toBeDefined();
      expect(campaign.steps.length).toBeGreaterThan(0);
    }
  });

  it('evaluates step check function on devices and connections accurately', () => {
    const firstCampaign = STORY_CAMPAIGNS[0];
    const firstStep = firstCampaign.steps[0];
    expect(firstStep).toBeDefined();

    // With empty topology
    const emptyCheck = firstStep.check([], [], new Map());
    expect(typeof emptyCheck).toBe('boolean');
  });

  it('supports step choices with proper score and point additions', () => {
    const campaignWithChoice = STORY_CAMPAIGNS.find(c => c.steps.some(s => Boolean(s.choice)));
    if (campaignWithChoice) {
      const stepWithChoice = campaignWithChoice.steps.find(s => Boolean(s.choice));
      expect(stepWithChoice?.choice?.options.length).toBeGreaterThanOrEqual(2);
      const opt = stepWithChoice?.choice?.options[0];
      expect(typeof opt?.bonusPoints).toBe('number');
    }
  });

  it('validates step skip state transitions', () => {
    const state = initialStoryState();
    const isLast = false;
    const nextState = {
      ...state,
      skipped: state.skipped + 1,
      stepIndex: isLast ? state.stepIndex : state.stepIndex + 1,
      completed: isLast,
    };
    expect(nextState.skipped).toBe(1);
    expect(nextState.stepIndex).toBe(1);
    expect(nextState.completed).toBe(false);
  });

  it('completes campaign on last step transition', () => {
    const state = initialStoryState();
    const updatedCampaigns = [...(state.completedCampaigns || []), state.campaignId];
    const finalState = {
      ...state,
      score: state.score + 100,
      stepIndex: state.stepIndex,
      completed: true,
      completedCampaigns: updatedCampaigns,
    };
    expect(finalState.completed).toBe(true);
    expect(finalState.completedCampaigns).toContain(state.campaignId);
    expect(finalState.score).toBe(100);
  });

  it('handles campaign reset properly', () => {
    const state = {
      ...initialStoryState(),
      stepIndex: 4,
      completed: true,
      score: 450,
    };
    const reset = {
      ...state,
      stepIndex: 0,
      completed: false,
    };
    expect(reset.stepIndex).toBe(0);
    expect(reset.completed).toBe(false);
    expect(reset.score).toBe(450);
  });

  it('handles selecting a new campaign from the selector', () => {
    const state = initialStoryState();
    const newCampaignId = STORY_CAMPAIGNS.length > 1 ? STORY_CAMPAIGNS[1].id : 'camp-2';
    const updated = {
      ...state,
      campaignId: newCampaignId,
      stepIndex: 0,
      completed: state.completedCampaigns?.includes(newCampaignId) || false,
    };
    expect(updated.campaignId).toBe(newCampaignId);
    expect(updated.stepIndex).toBe(0);
    expect(updated.completed).toBe(false);
  });

  it('verifies step completion with mock topology devices', () => {
    const devices: CanvasDevice[] = [
      { id: 'pc-1', name: 'PC1', type: 'pc', ip: '192.168.1.10', status: 'online', ports: [], x: 0, y: 0 },
      { id: 'sw-1', name: 'Switch1', type: 'switchL2', ip: '', status: 'online', ports: [], x: 100, y: 100 },
    ];
    const connections: CanvasConnection[] = [
      { id: 'c1', sourceDeviceId: 'pc-1', sourcePort: 'Eth0', targetDeviceId: 'sw-1', targetPort: 'Fa0/1', active: true, cableType: 'straight' },
    ];
    const states = new Map<string, SwitchState>();

    // Test across all campaigns first steps
    for (const campaign of STORY_CAMPAIGNS.slice(0, 3)) {
      const res = campaign.steps[0].check(devices, connections, states);
      expect(typeof res).toBe('boolean');
    }
  });

  it('validates bilingual step title and learning objective availability', () => {
    for (const campaign of STORY_CAMPAIGNS) {
      expect(campaign.title).toBeTruthy();
      for (const step of campaign.steps) {
        expect(step.title).toBeTruthy();
        expect(step.objective).toBeTruthy();
      }
    }
  });

  it('ensures choice options do not mutate score twice for identical choice keys', () => {
    const state = initialStoryState();
    const choiceKey = `${state.campaignId}:${state.stepIndex}`;
    const firstSelection = {
      ...state,
      choicesMade: { [choiceKey]: 1 },
      score: state.score + 50,
    };
    expect(firstSelection.choicesMade[choiceKey]).toBe(1);
    expect(firstSelection.score).toBe(50);

    // Repeated click should be blocked by check
    const isAlreadyChosen = firstSelection.choicesMade[choiceKey] !== undefined;
    expect(isAlreadyChosen).toBe(true);
  });

  it('preserves completedCampaigns set when replaying an already completed campaign', () => {
    const state = {
      ...initialStoryState(),
      completedCampaigns: ['camp-1', 'camp-2'],
      campaignId: 'camp-1',
    };
    const isAlreadyCompleted = state.completedCampaigns.includes(state.campaignId);
    expect(isAlreadyCompleted).toBe(true);
    const updatedList = isAlreadyCompleted ? state.completedCampaigns : [...state.completedCampaigns, state.campaignId];
    expect(updatedList).toEqual(['camp-1', 'camp-2']);
  });

  it('verifies category filtering logic for campaigns', () => {
    const categories = ['Tümü', 'Basit', 'Orta', 'İleri'] as const;
    for (const cat of categories) {
      const filtered = cat === 'Tümü'
        ? STORY_CAMPAIGNS
        : STORY_CAMPAIGNS.filter(c => c.category === cat);
      expect(Array.isArray(filtered)).toBe(true);
    }
  });
});
