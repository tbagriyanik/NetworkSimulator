export interface TopologyDevice {
    id: string;
    name: string;
    type: string;
    ports: { id: string; label: string }[];
}

export function getDevicePortsFromTopology(devices: TopologyDevice[], deviceId: string) {
    const device = devices.find(d => d.id === deviceId);
    return device?.ports || [];
}
