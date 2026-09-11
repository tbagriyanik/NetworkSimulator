import { render, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createRef } from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMultiWindowStore } from '@/hooks/useMultiWindowStore';
import { createInitialState } from '@/lib/network/initialState';

afterEach(cleanup);
beforeEach(() => {
  useMultiWindowStore.setState({ openWindows: [], isSwitcherOpen: false, switcherSelectedIndex: 0 });
});

const baseProps = {
  showMobileMenu: false,
  confirmDialog: null as null | { show: boolean; onConfirm: () => void },
  saveDialog: null as null | { show: boolean; onConfirm: (save: boolean) => void },
  showPCPanel: false,
  showRouterPanel: false,
  showFirewallPanel: false,
  showUnifiedDeviceModal: false,
  showAboutModal: false,
  showProjectPicker: false,
  showOnboarding: false,
  isTimelineMinimized: false,
  selectedDevice: null,
  activeDeviceId: '',
  activeTab: 'topology',
  topologyDevices: [],
  activeTabRef: { current: 'topology' } as React.RefObject<string | null>,
  fileInputRef: { current: null } as React.RefObject<HTMLInputElement | null>,
  handleSaveProject: () => { },
  handleNewProject: () => { },
  handleUndo: () => { },
  handleRedo: () => { },
  handleDeviceDoubleClick: () => { },
  handleRefreshNetwork: () => { },
  closeEscLikeWindows: () => { },
  getOrCreateDeviceState: () => createInitialState(),
  getOrCreateDeviceOutputs: () => [],
  setShowAboutModal: () => { },
  setTopologyKey: () => { },
  setIsTimelineMinimized: () => { },
  setClearSelectionTrigger: () => { },
  setSelectedDevice: () => { },
  setActiveDeviceId: () => { },
  setActiveDeviceType: () => { },
  setActiveTab: () => { },
  setUnifiedDeviceActiveTab: () => { },
  setShowUnifiedDeviceModal: () => { },
};

function TerminalHarness({ showPCPanel }: { showPCPanel: boolean }) {
  const ref = createRef<HTMLInputElement>();
  useKeyboardShortcuts({ ...baseProps, showPCPanel });
  return (
    <input
      ref={ref}
      data-terminal-input
      onKeyDown={(e) => {
        if (e.key === 'Tab') (e.currentTarget as HTMLInputElement & { _gotTab?: boolean })._gotTab = true;
      }}
    />
  );
}

function ModalHarness({ showAboutModal }: { showAboutModal: boolean }) {
  useKeyboardShortcuts({ ...baseProps, showAboutModal });
  return (
    <div role="dialog">
      <button type="button">first</button>
      <button type="button">second</button>
      <input aria-label="third" />
    </div>
  );
}

describe('global shortcut handler', () => {
  it('Tab reaches a focused terminal input when a panel/window is open', () => {
    const { container } = render(<TerminalHarness showPCPanel />);
    const input = container.querySelector('[data-terminal-input]') as HTMLInputElement;
    act(() => {
      input.focus();
      fireEvent.keyDown(input, { key: 'Tab' });
    });
    expect((input as HTMLInputElement & { _gotTab?: boolean })._gotTab).toBe(true);
  });

  it('Tab cycles focus within an open modal (first -> second)', () => {
    const { getByText } = render(<ModalHarness showAboutModal />);
    const first = getByText('first') as HTMLButtonElement;
    const second = getByText('second') as HTMLButtonElement;
    act(() => {
      first.focus();
      fireEvent.keyDown(first, { key: 'Tab' });
    });
    expect(document.activeElement).toBe(second);
  });

  it('Shift+Tab wraps focus within an open modal (first -> last)', () => {
    const { getByText, getByLabelText } = render(<ModalHarness showAboutModal />);
    const first = getByText('first') as HTMLButtonElement;
    const third = getByLabelText('third') as HTMLInputElement;
    act(() => {
      first.focus();
      fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    });
    expect(document.activeElement).toBe(third);
  });

  it('Shift+Tab in a focused CLI/CMD terminal input opens the window switcher', () => {
    useMultiWindowStore.setState({ openWindows: [{ id: 'w1', type: 'pc' }, { id: 'w2', type: 'pc' }], isSwitcherOpen: false });
    const { container } = render(<TerminalHarness showPCPanel />);
    const input = container.querySelector('[data-terminal-input]') as HTMLInputElement;
    act(() => {
      input.focus();
      fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });
    });
    expect(useMultiWindowStore.getState().isSwitcherOpen).toBe(true);
  });

  it('does not trigger Tab topology device navigation when focused inside note textarea', () => {
    const setActiveDeviceId = vi.fn();
    function NoteHarness() {
      useKeyboardShortcuts({
        ...baseProps,
        activeTab: 'topology',
        activeTabRef: { current: 'topology' },
        topologyDevices: [{ id: 'd1', type: 'pc' }, { id: 'd2', type: 'pc' }],
        setActiveDeviceId,
      });
      return (
        <div data-note-id="note-123">
          <textarea data-testid="note-input" />
        </div>
      );
    }

    const { getByTestId } = render(<NoteHarness />);
    const textarea = getByTestId('note-input') as HTMLTextAreaElement;
    act(() => {
      textarea.focus();
      fireEvent.keyDown(textarea, { key: 'Tab' });
    });

    expect(setActiveDeviceId).not.toHaveBeenCalled();
  });

  it('does not trigger Enter device activation when focused inside note textarea', () => {
    const handleDeviceDoubleClick = vi.fn();
    function NoteHarness() {
      useKeyboardShortcuts({
        ...baseProps,
        activeTab: 'topology',
        activeTabRef: { current: 'topology' },
        activeDeviceId: 'd1',
        topologyDevices: [{ id: 'd1', type: 'pc' }],
        handleDeviceDoubleClick,
      });
      return (
        <div data-note-id="note-123">
          <textarea data-testid="note-input" />
        </div>
      );
    }

    const { getByTestId } = render(<NoteHarness />);
    const textarea = getByTestId('note-input') as HTMLTextAreaElement;
    act(() => {
      textarea.focus();
      fireEvent.keyDown(textarea, { key: 'Enter' });
    });

    expect(handleDeviceDoubleClick).not.toHaveBeenCalled();
  });
});

