export type TabType = 'topology' | 'cmd' | 'terminal' | 'tasks';

export interface PCOutputLine {
  id: string;
  type: 'command' | 'output' | 'error' | 'success';
  content: string;
}
