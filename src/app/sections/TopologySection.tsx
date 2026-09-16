import { NetworkErrorBoundary } from '@/components/network/NetworkErrorBoundary';
import dynamic from 'next/dynamic';
import { TopologyToolbar } from '@/components/network/TopologyToolbar';
import { PageDevicePopovers } from '../PageDevicePopovers';
import { cn } from '@/lib/utils';

const NetworkTopology = dynamic(
  () => import('@/components/network/NetworkTopology/NetworkTopology').then((m) => m.NetworkTopology),
  { ssr: false }
);

interface TopologySectionProps {
  preferences: any;
  activeTab: any;
  isTablet: boolean;
  showPCPanel: boolean;
  showUnifiedDeviceModal: boolean;
  showRouterPanel: boolean;
  isPingPanelOpen: boolean;
  t: any;
  isDark: boolean;
  language: any;
  topologyDevices: any;
  deviceStates: any;
  activeDeviceId: string;
  activeDeviceType: any;
  cableInfo: any;
  deviceSearchQuery: string;
  canUndo: boolean;
  canRedo: boolean;
  hasHydrated: boolean;
  isExamActive: boolean;
  setDeviceSearchQuery: any;
  setCableInfo: any;
  setZoom: any;
  setPan: any;
  handleDeviceSelectFromMenu: any;
  handleUndo: any;
  handleRedo: any;
  handleRefreshNetwork: any;
  setIsEnvironmentPanelOpen: any;
  onOpenStudentJoin?: any;
  onOpenTeacherPanel?: any;
  topologyContainerRef: any;
  topologyKey: any;
  selectedDevice: any;
  handleDeviceSelectFromCanvas: any;
  handleDeviceDoubleClick: any;
  handleDeviceDelete: any;
  handleDeviceRename: any;
  topologyConnections: any;
  topologyNotes: any;
  setDeviceStates: any;
  zoom: number;
  pan: any;
  focusDeviceId: string | null;
  isEditorOpen: boolean;
  setActiveDeviceId: any;
  setActiveDeviceType: any;
  setUnifiedDeviceActiveTab: any;
  setShowUnifiedDeviceModal: any;
  clearSelectionTrigger: number;
  setFocusedOverlay: any;
  focusedOverlay: any;
  commitAction: any;
  setSelectedDevice: any;
  setShowPCDeviceId: any;
  setPcPanelInitialTab: any;
  getOrCreatePCOutputs: any;
  setIsPingPanelOpen: any;
}

export function TopologySection({
  preferences,
  activeTab,
  isTablet,
  showPCPanel,
  showUnifiedDeviceModal,
  showRouterPanel,
  isPingPanelOpen,
  t,
  isDark,
  language,
  topologyDevices,
  deviceStates,
  activeDeviceId,
  activeDeviceType,
  cableInfo,
  deviceSearchQuery,
  canUndo,
  canRedo,
  hasHydrated,
  isExamActive,
  setDeviceSearchQuery,
  setCableInfo,
  setZoom,
  setPan,
  handleDeviceSelectFromMenu,
  handleUndo,
  handleRedo,
  handleRefreshNetwork,
  setIsEnvironmentPanelOpen,
  onOpenStudentJoin,
  onOpenTeacherPanel,
  topologyContainerRef,
  topologyKey,
  selectedDevice,
  handleDeviceSelectFromCanvas,
  handleDeviceDoubleClick,
  handleDeviceDelete,
  handleDeviceRename,
  topologyConnections,
  topologyNotes,
  setDeviceStates,
  zoom,
  pan,
  focusDeviceId,
  isEditorOpen,
  setActiveDeviceId,
  setActiveDeviceType,
  setUnifiedDeviceActiveTab,
  setShowUnifiedDeviceModal,
  clearSelectionTrigger,
  setFocusedOverlay,
  focusedOverlay,
  commitAction,
  setSelectedDevice,
  setShowPCDeviceId,
  setPcPanelInitialTab,
  getOrCreatePCOutputs,
  setIsPingPanelOpen,
}: TopologySectionProps) {
  return (
    <div className={cn(
      "w-full flex-1 flex flex-col min-h-0 overflow-hidden transition-all duration-500",
      isTablet && (showPCPanel || showUnifiedDeviceModal || showRouterPanel) && "w-full sm:w-1/2 flex-none border-r border-secondary-200/50 dark:border-secondary-800/50"
    )}>
      <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'topology' ? 'flex' : 'hidden'} print:flex`}>
        {activeTab === 'topology' && (
          <TopologyToolbar
            isPingPanelOpen={isPingPanelOpen}
            t={t}
            isDark={isDark}
            language={language}
            topologyDevices={topologyDevices}
            deviceStates={deviceStates}
            activeDeviceId={activeDeviceId}
            activeDeviceType={activeDeviceType}
            cableInfo={cableInfo}
            deviceSearchQuery={deviceSearchQuery}
            canUndo={canUndo}
            canRedo={canRedo}
            hasHydrated={hasHydrated}
            isExamActive={isExamActive}
            setDeviceSearchQuery={setDeviceSearchQuery}
            setCableInfo={setCableInfo}
            setZoom={setZoom}
            setPan={setPan}
            handleDeviceSelectFromMenu={handleDeviceSelectFromMenu}
            handleUndo={handleUndo}
            handleRedo={handleRedo}
            handleRefreshNetwork={handleRefreshNetwork}
            setIsEnvironmentPanelOpen={setIsEnvironmentPanelOpen}
            onOpenStudentJoin={onOpenStudentJoin}
            onOpenTeacherPanel={onOpenTeacherPanel}
          />
        )}

        <div ref={topologyContainerRef} className="flex-1 w-full h-full min-h-0 overflow-hidden relative">
          <NetworkErrorBoundary fallbackTitle="Topoloji Tuvali Yüklenirken Bir Hata Oluştu">
            <NetworkTopology
              onPingPanelOpenChange={setIsPingPanelOpen}
              key={topologyKey}
              cableInfo={cableInfo}
              onCableChange={setCableInfo}
              selectedDevice={selectedDevice}
              onDeviceSelect={handleDeviceSelectFromCanvas}
              onDeviceDoubleClick={handleDeviceDoubleClick}
              onDeviceDelete={handleDeviceDelete}
              onDeviceRename={handleDeviceRename}
              initialDevices={topologyDevices || undefined}
              initialConnections={topologyConnections || undefined}
              initialNotes={topologyNotes || undefined}
              isActive={activeTab === 'topology'}
              activeDeviceId={activeDeviceId}
              deviceStates={deviceStates}
              onDeviceStatesChange={setDeviceStates}
              zoom={zoom}
              onZoomChange={setZoom}
              pan={pan}
              onPanChange={setPan}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onRefreshNetwork={handleRefreshNetwork}
              focusDeviceId={focusDeviceId}
              isExamActive={isExamActive}
              isExamEditorOpen={isEditorOpen}
              onOpenTasks={(deviceId: string) => {
                setActiveDeviceId(deviceId);
                const device = topologyDevices?.find((d: any) => d.id === deviceId);
                if (!device || device.type === 'pc') return;
                setActiveDeviceType(device.type);
                setUnifiedDeviceActiveTab('settings');
                setShowUnifiedDeviceModal(true);
              }}
              clearSelectionTrigger={clearSelectionTrigger}
              onPacketPanelFocus={() => setFocusedOverlay('packet')}
              packetPanelZIndex={focusedOverlay === 'packet' ? 35 : 30}
              onAction={commitAction}
            />
          </NetworkErrorBoundary>

          <PageDevicePopovers
            showDevicePopovers={preferences.showDevicePopovers}
            activeDeviceId={activeDeviceId}
            topologyDevices={topologyDevices}
            deviceStates={deviceStates}
            topologyConnections={topologyConnections}
            t={t}
            language={language}
            isDark={isDark}
            focusedOverlay={focusedOverlay}
            setFocusedOverlay={setFocusedOverlay}
            setSelectedDevice={setSelectedDevice}
            setActiveDeviceId={setActiveDeviceId}
            setActiveDeviceType={setActiveDeviceType}
            setUnifiedDeviceActiveTab={setUnifiedDeviceActiveTab}
            setShowPCDeviceId={setShowPCDeviceId}
            setPcPanelInitialTab={setPcPanelInitialTab}
            getOrCreatePCOutputs={getOrCreatePCOutputs}
            handleDeviceDoubleClick={handleDeviceDoubleClick}
          />
        </div>
      </div>
    </div>
  );
}
