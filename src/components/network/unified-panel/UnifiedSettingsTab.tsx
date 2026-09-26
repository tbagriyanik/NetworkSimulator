
import { Network, Layers, ShieldCheck, Cpu, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DeviceType, CanvasDevice, CanvasConnection } from '../NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { Translations } from '@/contexts/LanguageContext';
import type { TaskDefinition, TaskContext } from '@/lib/network/taskDefinitions';
import dynamic from 'next/dynamic';

const PortPanel = dynamic(() => import('../PortPanel').then(m => m.PortPanel), { ssr: false });
const VlanPanel = dynamic(() => import('../VlanPanel').then(m => m.VlanPanel), { ssr: false });
const SecurityPanel = dynamic(() => import('../SecurityPanel').then(m => m.SecurityPanel), { ssr: false });
const MacTablePanel = dynamic(() => import('../MacTablePanel').then(m => m.MacTablePanel), { ssr: false });
const TaskCard = dynamic(() => import('../TaskCard').then(m => m.TaskCard), { ssr: false });
const WlcWirelessPanel = dynamic(() => import('../WlcWirelessPanel').then(m => m.WlcWirelessPanel), { ssr: false });

type NormalizedPortType = 'fastethernet' | 'gigabitethernet' | 'serial' | 'tengigabitethernet' | 'tunnel' | 'vlan';

const PORT_TYPE_NORMALIZED: Record<string, NormalizedPortType> = {
  tenGigabitEthernet: 'tengigabitethernet',
  serial: 'serial',
  fastEthernet: 'fastethernet',
};

interface UnifiedSettingsTabProps {
  deviceId: string;
  deviceType: DeviceType;
  deviceName: string;
  deviceModel: string;
  deviceStates: Map<string, SwitchState>;
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  state: SwitchState;
  isDark: boolean;
  isOffline: boolean;
  theme: string;
  language: string;
  t: Translations;
  handleCommand: (command: string) => Promise<unknown>;
  hasTaskSystem: boolean;
  activeDeviceTasks: TaskDefinition[];
  taskContext: TaskContext;
  isNarrow: boolean;
}

export function UnifiedSettingsTab({
  deviceId,
  deviceType,
  deviceName,
  deviceModel,
  deviceStates,
  topologyDevices,
  topologyConnections,
  state,
  isDark,
  isOffline,
  theme,
  language,
  t,
  handleCommand,
  hasTaskSystem,
  activeDeviceTasks,
  taskContext,
  isNarrow,
}: UnifiedSettingsTabProps) {
  return (
    <div className="p-4 sm:p-6">
      <div className={cn(
        "grid gap-6",
        isNarrow ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3"
      )}>
        <div className={cn(isNarrow ? "" : "lg:col-span-2", "space-y-6")}>
          {deviceType === 'wlc' && (
            <div className="space-y-4">
              <WlcWirelessPanel
                state={state}
                isDark={isDark}
                language={language}
                isDevicePoweredOff={isOffline}
                onExecuteCommand={handleCommand as (command: string) => Promise<void>}
                topologyDevices={topologyDevices}
                activeDeviceId={deviceId}
                deviceStates={deviceStates}
              />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Network className="w-4 h-4" />
                {t.portStatus}
              </div>
              <button
                type="button"
                onClick={() => {
                  handleCommand('show ip interface brief');
                  const currentDev = topologyDevices.find(d => d.id === deviceId);
                  if (currentDev && currentDev.ports) {
                    const devState = deviceStates.get(deviceId);
                    if (devState) {
                      currentDev.ports.forEach(p => {
                        if (!devState.ports[p.id]) {
                          devState.ports[p.id] = {
                            id: p.id,
                            name: p.id,
                            status: p.status === 'connected' ? 'connected' : 'disconnected',
                            vlan: 1,
                            mode: 'access',
                            speed: p.speed || '1000',
                            duplex: 'auto',
                            shutdown: !!p.shutdown,
                            type: (p.type ? PORT_TYPE_NORMALIZED[String(p.type)] : undefined) ?? 'gigabitethernet',
                          };
                        }
                      });
                    }
                  }
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors border",
                  isDark
                    ? "bg-secondary-800 border-secondary-700 hover:bg-secondary-700 text-secondary-200"
                    : "bg-white border-secondary-300 hover:bg-secondary-50 text-secondary-700"
                )}
                title={language === 'tr' ? 'Port bilgilerini yenile' : 'Refresh port status'}
              >
                <RefreshCw className="w-3 h-3" />
                <span>{language === 'tr' ? 'Port Bilgilerini Yenile' : 'Refresh Ports'}</span>
              </button>
            </div>
            <PortPanel
              ports={deviceStates.get(deviceId)?.ports || state?.ports || {}}
              t={t}
              theme={theme}
              deviceName={deviceName}
              deviceModel={deviceModel}
              activeDeviceId={deviceId}
              isDevicePoweredOff={isOffline}
              topologyDevices={topologyDevices}
              topologyConnections={topologyConnections}
            />
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Layers className="w-4 h-4" />
              {t.vlanManagement}
            </div>
            <VlanPanel
              vlans={deviceStates.get(deviceId)?.vlans || state?.vlans || []}
              ports={deviceStates.get(deviceId)?.ports || state?.ports || {}}
              deviceName={deviceName}
              deviceModel={deviceModel}
              deviceId={deviceId}
              onExecuteCommand={handleCommand as (command: string) => Promise<void>}
              t={t}
              theme={theme}
              activeDeviceType={deviceType}
              isDevicePoweredOff={isOffline}
            />
          </div>

          {hasTaskSystem && deviceType !== 'router' && (
            <div className="space-y-4 pt-2">
              <MacTablePanel
                macTable={state?.macAddressTable || []}
                isDark={isDark}
                language={language}
                deviceName={deviceName}
              />
            </div>
          )}

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <ShieldCheck className="w-4 h-4" />
              {t.securityAndAcl}
            </div>
            <SecurityPanel
              security={state?.security || {}}
              t={t}
              theme={theme}
              isDevicePoweredOff={isOffline}
            />
          </div>
        </div>

        {hasTaskSystem && (
          <div className="space-y-6">
            <div className="space-y-4 sticky top-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Cpu className="w-4 h-4" />
                {t.tasksAndScore}
              </div>
              <TaskCard
                tasks={activeDeviceTasks}
                state={state}
                context={taskContext}
                isDark={isDark}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
