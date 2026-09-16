'use client';

import { NetworkTopologyProps } from './types/networkTopology.types';
import { TopologyCanvasArea } from '../topology/TopologyCanvasArea';
import { useNetworkTopologyController } from '@/hooks/networkTopology/useNetworkTopologyController';

export function NetworkTopology(props: NetworkTopologyProps) {
  const canvasAreaProps = useNetworkTopologyController(props);
  return <TopologyCanvasArea {...canvasAreaProps} />;
}
