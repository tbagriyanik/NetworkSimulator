import { CanvasDevice } from '../networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { PortTooltip } from './PortTooltip';
import { ConnectionTooltip } from './ConnectionTooltip';
import { DeviceTooltip, Translations } from './DeviceTooltip';


interface TopologyTooltipsProps {
  portTooltip: { deviceId: string; portId: string; x: number; y: number; visible: boolean } | null;
  deviceMap: Map<string, CanvasDevice>;
  deviceStates?: Map<string, SwitchState>;
  isDark: boolean;
  language: 'tr' | 'en';
  getIotDeviceStatus: (device: CanvasDevice) => string;
  getIotPowerStatus: (device: CanvasDevice) => string;
  getIotOpenCloseStatus: (device: CanvasDevice) => string;
  getLivePortVlanText: (deviceId: string, portId: string) => string;
  connectionTooltip: { x: number; y: number; sourceDeviceName: string; sourcePort: string; targetDeviceName: string; targetPort: string; cableType: string; statusMessage: string; visible: boolean } | null;
  CABLE_COLORS: Record<string, { primary: string; bg: string; text: string; border: string }>;
  deviceTooltip: { deviceId: string; x: number; y: number; visible: boolean } | null;
  isTR: boolean;
  isDraggingInteractionDisabled: boolean;
  t: Translations;
}

export function TopologyTooltips({
  portTooltip,
  deviceMap,
  deviceStates,
  isDark,
  language,
  getIotDeviceStatus,
  getIotPowerStatus,
  getIotOpenCloseStatus,
  getLivePortVlanText,
  connectionTooltip,
  CABLE_COLORS,
  deviceTooltip,
  isTR,
  isDraggingInteractionDisabled,
  t
}: TopologyTooltipsProps) {
  return (
    <>
      <PortTooltip 
        portTooltip={portTooltip} 
        deviceMap={deviceMap} 
        deviceStates={deviceStates} 
        isDark={isDark} 
        language={language} 
        getIotDeviceStatus={getIotDeviceStatus} 
        getIotPowerStatus={getIotPowerStatus} 
        getIotOpenCloseStatus={getIotOpenCloseStatus} 
        getLivePortVlanText={getLivePortVlanText} 
      />
      <ConnectionTooltip 
        connectionTooltip={connectionTooltip} 
        isDark={isDark} 
        language={language} 
        CABLE_COLORS={CABLE_COLORS} 
      />
      {deviceTooltip && (
        <DeviceTooltip
          tooltip={deviceTooltip}
          deviceMap={deviceMap}
          isDark={isDark}
          isTR={isTR}
          isDraggingInteractionDisabled={isDraggingInteractionDisabled}
          t={t}
        />
      )}
    </>
  );
}
