import { createPythonFormModule } from './pcPythonFormModule';
import { createPython3DModule } from './pcPython3DModule';
import { createPythonAudioModule } from './pcPythonAudioModule';

export function createPythonGraphicsApi(deviceId: string = 'default'): Record<string, Record<string, unknown>> {
  const formModule = createPythonFormModule(deviceId);
  const scene3DModule = createPython3DModule(deviceId);
  const audioModule = createPythonAudioModule(deviceId);

  return {
    tkinter: formModule,
    ttk: formModule.ttk as Record<string, unknown>,
    form: formModule,
    gui: formModule,
    scene3d: scene3DModule,
    vpython: scene3DModule,
    three3d: scene3DModule,
    mesh3d: scene3DModule,
    webgl3d: scene3DModule,
    audio: audioModule,
    music: audioModule,
    sound: audioModule,
    synth: audioModule,
    winsound: audioModule.winsound as Record<string, unknown>,
  };
}
