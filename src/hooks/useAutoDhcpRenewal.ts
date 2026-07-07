import { useEffect, useRef } from 'react';
import { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { PCOutputLine } from '@/types/pageTypes';

interface UseAutoDhcpRenewalProps {
  topologyDevices: CanvasDevice[];
  deviceStates: Map<string, SwitchState>;
  assignDhcpLeaseForPc: (pcDevice: CanvasDevice, currentDevices: CanvasDevice[], currentStates?: Map<string, SwitchState>, currentConnections?: CanvasConnection[]) => { ip: string; subnet: string; gateway: string; dns: string } | null;
  buildLinkLocalLease: (pcDevice: CanvasDevice, devices: CanvasDevice[]) => { ip: string; subnet: string; gateway: string; dns: string };
  setTopologyDevices: React.Dispatch<React.SetStateAction<CanvasDevice[]>>;
  pcOutputs: Map<string, PCOutputLine[]>;
  setPcOutputs: React.Dispatch<React.SetStateAction<Map<string, PCOutputLine[]>>>;
  loadedExampleId: string | null;
  toast: (props: { title: string; description: React.ReactNode; duration?: number }) => void;
  language: string;
  t: Record<string, string>;
  handleRefreshNetwork: () => void;
  setLoadedExampleId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useAutoDhcpRenewal({
  topologyDevices,
  deviceStates,
  assignDhcpLeaseForPc,
  buildLinkLocalLease,
  setTopologyDevices,
  pcOutputs,
  setPcOutputs,
  loadedExampleId,
  toast,
  language,
  t,
  handleRefreshNetwork,
  setLoadedExampleId
}: UseAutoDhcpRenewalProps) {
  // Auto-renew DHCP for devices with link-local IPs (169.254.x.x) or 0.0.0.0 on page load
  const dhcpRenewalDoneRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (dhcpRenewalDoneRef.current) return;
    if (!topologyDevices || topologyDevices.length === 0 || !deviceStates) return;
    if (!isInitialLoadRef.current) return; // Only run on initial load

    // Find all PC devices with DHCP mode and no valid IP (0.0.0.0 or 169.254.x.x)
    const devicesNeedingDhcpRenewal = topologyDevices.filter(
      (device) =>
        device.type === 'pc' &&
        device.ipConfigMode === 'dhcp' &&
        (!device.ip || device.ip === '0.0.0.0' || device.ip.startsWith('169.254.'))
    );

    if (devicesNeedingDhcpRenewal.length === 0) {
      dhcpRenewalDoneRef.current = true;
      isInitialLoadRef.current = false;
      return;
    }

    // Update devices with DHCP IPs - process sequentially to avoid duplicate IPs
    const updatedDevices = [...topologyDevices];
    let hasChanges = false;

    devicesNeedingDhcpRenewal.forEach(deviceToRenew => {
      const lease = assignDhcpLeaseForPc(deviceToRenew, updatedDevices) || buildLinkLocalLease(deviceToRenew, updatedDevices);
      if (lease) {
        const idx = updatedDevices.findIndex(d => d.id === deviceToRenew.id);
        if (idx !== -1) {
          updatedDevices[idx] = {
            ...updatedDevices[idx],
            ip: lease.ip,
            subnet: lease.subnet,
            gateway: lease.gateway,
            dns: lease.dns
          };
          hasChanges = true;

          // Also update PC terminal output if it exists
          const pcOut = pcOutputs.get(deviceToRenew.id);
          if (pcOut) {
            const updatedOut = pcOut.map(line => {
              if (line.id === '1' || line.content?.includes('IPv4 Address')) {
                return {
                  ...line,
                  content: `\nEthernet adapter Ethernet connection:\n   IPv4 Address. . . . . . . . . . . : ${lease.ip}\n   Subnet Mask . . . . . . . . . . : ${lease.subnet}\n   Default Gateway . . . . . . . . . : ${lease.gateway}\n`
                };
              }
              return line;
            });
            setPcOutputs(prev => new Map(prev).set(deviceToRenew.id, updatedOut as unknown as PCOutputLine[]));
          }
        }
      }
    });

    if (hasChanges) {
      setTopologyDevices(updatedDevices);
    }

    dhcpRenewalDoneRef.current = true;
    isInitialLoadRef.current = false;
  }, [assignDhcpLeaseForPc, buildLinkLocalLease, topologyDevices, deviceStates, setTopologyDevices]);

  // Sequential DHCP toasts for "Router DHCP" example
  useEffect(() => {
    if (loadedExampleId === 'router-dhcp-2pc' && topologyDevices.length > 0 && deviceStates.size > 0) {
      const pcDevices = topologyDevices.filter(d => d.type === 'pc' && d.ipConfigMode === 'dhcp');

      if (pcDevices.length > 0) {
        (async () => {
          // Process all PCs and show a single combined toast
          const currentTopology = [...topologyDevices];
          let hasOverallChanges = false;
          const assignments: Array<{ name: string, ip: string }> = [];

          for (let i = 0; i < pcDevices.length; i++) {
            const pc = pcDevices[i];
            const lease = assignDhcpLeaseForPc(pc, currentTopology) || buildLinkLocalLease(pc, currentTopology);

            if (lease) {
              const { ip: newIp, subnet, gateway, dns } = lease as { ip: string; subnet: string; gateway: string; dns: string };
              if (!newIp.startsWith('169.254.')) {
                assignments.push({ name: pc.name || pc.id, ip: newIp });
              }

              // Update device in the working list
              const idx = currentTopology.findIndex(d => d.id === pc.id);
              if (idx !== -1) {
                currentTopology[idx] = {
                  ...currentTopology[idx],
                  ip: newIp,
                  subnet,
                  gateway,
                  dns
                };
                hasOverallChanges = true;

                // Also update PC terminal output if it exists
                const pcOut = pcOutputs.get(pc.id);
                if (pcOut) {
                  const updatedOut = pcOut.map(line => {
                    if (line.id === '1' || line.content?.includes('IPv4 Address')) {
                      return {
                        ...line,
                        content: `\nEthernet adapter Ethernet connection:\n   IPv4 Address. . . . . . . . . . . : ${newIp}\n   Subnet Mask . . . . . . . . . . : ${subnet}\n   Default Gateway . . . . . . . . . : ${gateway}\n`
                      };
                    }
                    return line;
                  });
                  setPcOutputs(prev => new Map(prev).set(pc.id, updatedOut as unknown as PCOutputLine[]));
                }
              }
            }
          }

          if (assignments.length > 0) {
            toast({
              title: `📝 ${t.dhcpAssignments}`,
              description: assignments.map(a => `${a.name}: ${a.ip}`).join('\n'), // Simplified for non-tsx file without react component injection to keep it clean, wait, I can use React nodes if I import React. But keeping string is safer.
              duration: 5000,
            });

            // Show refresh panel after a delay
            setTimeout(() => {
              handleRefreshNetwork();
            }, 1000);
          }

          if (hasOverallChanges) {
            setTopologyDevices(currentTopology);
          }
          setLoadedExampleId(null); // Reset after processing
        })();
      } else {
        setTimeout(() => setLoadedExampleId(null), 0);
      }
    }
  }, [assignDhcpLeaseForPc, buildLinkLocalLease, loadedExampleId, topologyDevices, deviceStates, toast, language, setTopologyDevices]);
}
