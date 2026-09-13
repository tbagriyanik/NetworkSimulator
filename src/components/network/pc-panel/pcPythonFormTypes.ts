// pcPythonFormTypes.ts
// Form element and state definitions for embedded Python GUI / Form engine

export type FormElementType =
  | 'button'
  | 'label'
  | 'entry'
  | 'textarea'
  | 'listbox'
  | 'combobox'
  | 'checkbox'
  | 'radiobutton'
  | 'separator_h'
  | 'separator_v';

export interface FormElementLayout {
  type: 'pack' | 'grid' | 'place';
  side?: 'top' | 'bottom' | 'left' | 'right';
  fill?: 'none' | 'x' | 'y' | 'both';
  padx?: number;
  pady?: number;
  row?: number;
  column?: number;
  rowspan?: number;
  columnspan?: number;
  sticky?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface FormElement {
  id: string;
  type: FormElementType;
  text?: string;
  value?: string | number | boolean;
  values?: string[]; // for combobox, listbox
  placeholder?: string;
  disabled?: boolean;
  width?: number;
  height?: number;
  group?: string; // for radiobutton group
  checked?: boolean; // for checkbox / radiobutton
  layout?: FormElementLayout;
  commandId?: string; // id of python callback function
}

export interface PythonFormState {
  id: string;
  deviceId: string;
  title: string;
  width: number;
  height: number;
  mode: 'window' | 'browser';
  elements: FormElement[];
  callbacks: Record<string, (args?: unknown[]) => void>;
  variables: Record<string, string | number | boolean>;
}

export type PythonFormEventPayload =
  | { type: 'click'; elementId: string }
  | { type: 'change'; elementId: string; value: string | number | boolean }
  | { type: 'select'; elementId: string; selectedIndex: number; value: string };
