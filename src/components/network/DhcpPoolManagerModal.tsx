'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Database, Server, Users, CheckCircle2, Search } from 'lucide-react';
import type { SwitchState } from '@/lib/network/types';

interface DhcpPoolManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
  deviceName: string;
  state?: SwitchState;
  isDark?: boolean;
  language?: 'tr' | 'en';
}

interface MockLease {
  ip: string;
  mac: string;
  leaseExpires: string;
  type: 'Automatic' | 'Manual Reservation';
  hostname: string;
}

export function DhcpPoolManagerModal({
  open,
  onOpenChange,
  deviceName,
  state,
  isDark = true,
  language = 'tr',
}: DhcpPoolManagerModalProps) {
  const isTr = language === 'tr';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPoolName, setSelectedPoolName] = useState<string | null>(null);

  // Extract all DHCP pools from state
  const pools = useMemo(() => {
    if (!state) return [];
    const list: Array<{
      name: string;
      network: string;
      mask: string;
      gateway: string;
      dns: string;
      domain?: string;
      totalIps: number;
      usedIps: number;
      leases: MockLease[];
    }> = [];

    // CLI-defined DHCP Pools
    if (state.dhcpPools) {
      Object.entries(state.dhcpPools).forEach(([name, pool]) => {
        const net = pool.network || '192.168.1.0';
        const mask = pool.subnetMask || '255.255.255.0';
        const gw = pool.defaultRouter || '192.168.1.1';
        const dns = pool.dnsServer || '8.8.8.8';
        const total = 254;
        
        // Generate active leases dynamically based on network
        const netBase = net.substring(0, net.lastIndexOf('.'));
        const leases: MockLease[] = [
          {
            ip: `${netBase}.10`,
            mac: '0050.7966.6801',
            leaseExpires: '23h 45m',
            type: 'Automatic',
            hostname: 'PC-Engineering'
          },
          {
            ip: `${netBase}.11`,
            mac: '0050.7966.6802',
            leaseExpires: '21h 10m',
            type: 'Automatic',
            hostname: 'PC-Finance'
          },
          {
            ip: `${netBase}.50`,
            mac: '0060.2F88.A100',
            leaseExpires: 'Infinite',
            type: 'Manual Reservation',
            hostname: 'Printer-Color'
          }
        ];

        list.push({
          name,
          network: net,
          mask,
          gateway: gw,
          dns,
          domain: pool.domainName,
          totalIps: total,
          usedIps: leases.length,
          leases
        });
      });
    }

    // GUI services.dhcp pools
    if (state.services?.dhcp?.pools) {
      state.services.dhcp.pools.forEach((p) => {
        if (!list.some(existing => existing.name === p.poolName)) {
          const total = p.maxUsers || 50;
          const net = p.startIp ? `${p.startIp.substring(0, p.startIp.lastIndexOf('.'))}.0` : '192.168.1.0';
          const netBase = net.substring(0, net.lastIndexOf('.'));
          
          list.push({
            name: p.poolName,
            network: net,
            mask: p.subnetMask || '255.255.255.0',
            gateway: p.defaultGateway || '192.168.1.1',
            dns: p.dnsServer || '8.8.8.8',
            totalIps: total,
            usedIps: 2,
            leases: [
              {
                ip: `${netBase}.101`,
                mac: '0010.1122.3344',
                leaseExpires: '18h 30m',
                type: 'Automatic',
                hostname: 'Client-01'
              }
            ]
          });
        }
      });
    }

    return list;
  }, [state]);

  const activePool = pools.find(p => p.name === selectedPoolName) || pools[0] || null;

  const filteredLeases = useMemo(() => {
    if (!activePool) return [];
    if (!searchQuery.trim()) return activePool.leases;
    const q = searchQuery.toLowerCase();
    return activePool.leases.filter(l => 
      l.ip.toLowerCase().includes(q) || 
      l.mac.toLowerCase().includes(q) || 
      l.hostname.toLowerCase().includes(q)
    );
  }, [activePool, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-w-3xl max-h-[85vh] overflow-y-auto p-5 rounded-2xl shadow-2xl border ${
          isDark
            ? 'bg-secondary-950/95 border-secondary-800 text-secondary-100 backdrop-blur-xl'
            : 'bg-white/95 border-secondary-200 text-secondary-900 backdrop-blur-xl'
        }`}
      >
        <DialogHeader className="pb-3 border-b border-secondary-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                {isTr ? 'DHCP Sunucu & Havuz Yönetimi' : 'DHCP Server & IP Pool Manager'}
                <span className="text-xs px-2 py-0.5 rounded-md bg-secondary-800 text-secondary-300 font-mono">
                  {deviceName}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-secondary-400">
                {isTr
                  ? 'Tanımlı IP havuzlarını, doluluk oranlarını ve aktif kiralanmış (Leased) istemcileri görüntüleyin.'
                  : 'Monitor configured DHCP pools, capacity utilization, and active client leases.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {pools.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <Server className="w-10 h-10 text-secondary-600 mx-auto" />
            <p className="text-sm font-semibold text-secondary-400">
              {isTr ? 'Bu cihazda yapılandırılmış aktif bir DHCP havuzu bulunmuyor.' : 'No active DHCP pools configured on this device.'}
            </p>
            <p className="text-xs text-secondary-500">
              {isTr 
                ? 'CLI üzerinde "ip dhcp pool <isim>" ve "network <ip> <mask>" komutlarıyla yeni havuz tanımlayabilirsiniz.' 
                : 'Define a pool using "ip dhcp pool <name>" and "network <ip> <mask>" via CLI.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Pool Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {pools.map((p) => {
                const isSelected = activePool?.name === p.name;
                const percent = Math.round((p.usedIps / p.totalIps) * 100);
                return (
                  <button
                    key={p.name}
                    onClick={() => setSelectedPoolName(p.name)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                      isSelected
                        ? isDark
                          ? 'bg-teal-500/20 border-teal-500/50 text-teal-200 shadow-[0_0_12px_rgba(20,184,166,0.15)]'
                          : 'bg-teal-50 border-teal-300 text-teal-800'
                        : isDark
                          ? 'bg-secondary-900/60 border-secondary-800/80 text-secondary-400 hover:bg-secondary-800/50'
                          : 'bg-secondary-100/60 border-secondary-200 text-secondary-600 hover:bg-secondary-200/50'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-secondary-800 text-secondary-300">
                      %{percent}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Pool Overview Cards */}
            {activePool && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-secondary-900/40 border-secondary-800' : 'bg-secondary-50 border-secondary-200'}`}>
                  <span className="text-[10px] uppercase font-mono text-secondary-400 block">{isTr ? 'Ağ Bloğu' : 'Network'}</span>
                  <span className="text-xs font-bold font-mono">{activePool.network}</span>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-secondary-900/40 border-secondary-800' : 'bg-secondary-50 border-secondary-200'}`}>
                  <span className="text-[10px] uppercase font-mono text-secondary-400 block">{isTr ? 'Alt Ağ Maskesi' : 'Subnet Mask'}</span>
                  <span className="text-xs font-bold font-mono">{activePool.mask}</span>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-secondary-900/40 border-secondary-800' : 'bg-secondary-50 border-secondary-200'}`}>
                  <span className="text-[10px] uppercase font-mono text-secondary-400 block">{isTr ? 'Varsayılan Ağ Geçidi' : 'Default Gateway'}</span>
                  <span className="text-xs font-bold font-mono text-teal-400">{activePool.gateway}</span>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-secondary-900/40 border-secondary-800' : 'bg-secondary-50 border-secondary-200'}`}>
                  <span className="text-[10px] uppercase font-mono text-secondary-400 block">{isTr ? 'DNS Sunucusu' : 'DNS Server'}</span>
                  <span className="text-xs font-bold font-mono text-sky-400">{activePool.dns}</span>
                </div>
              </div>
            )}

            {/* Capacity Progress Bar */}
            {activePool && (
              <div className={`p-3 rounded-xl border space-y-2 ${isDark ? 'bg-secondary-900/40 border-secondary-800' : 'bg-secondary-50 border-secondary-200'}`}>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-secondary-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-teal-400" />
                    {isTr ? 'Havuz Doluluk Oranı' : 'Pool Capacity Utilization'}
                  </span>
                  <span className="font-mono text-secondary-400">
                    {activePool.usedIps} / {activePool.totalIps} IP (%{Math.round((activePool.usedIps / activePool.totalIps) * 100)})
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((activePool.usedIps / activePool.totalIps) * 100))}%` }}
                  />
                </div>
              </div>
            )}

            {/* Leases Table */}
            {activePool && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-secondary-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {isTr ? 'Aktif Kiralanan IP Bağlantıları (DHCP Bindings)' : 'Active DHCP IP Bindings'}
                  </span>
                  <div className="relative w-48">
                    <Search className="w-3 h-3 text-secondary-400 absolute left-2 top-2.5" />
                    <input
                      type="text"
                      placeholder={isTr ? 'Ara (IP, MAC, Host)...' : 'Search (IP, MAC, Host)...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full text-[11px] pl-7 pr-2 py-1 rounded-lg border focus:outline-none ${
                        isDark ? 'bg-secondary-900 border-secondary-800 text-white' : 'bg-white border-secondary-300'
                      }`}
                    />
                  </div>
                </div>

                <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-secondary-800 bg-secondary-900/30' : 'border-secondary-200 bg-white'}`}>
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b text-[10px] font-bold uppercase tracking-wider ${isDark ? 'border-secondary-800 bg-secondary-900/80 text-secondary-400' : 'border-secondary-200 bg-secondary-100 text-secondary-600'}`}>
                      <tr>
                        <th className="p-2.5">IP Adresi</th>
                        <th className="p-2.5">MAC Adresi</th>
                        <th className="p-2.5">Hostname</th>
                        <th className="p-2.5">Kira Bitişi</th>
                        <th className="p-2.5 text-right">Tür</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-800/40">
                      {filteredLeases.map((lease) => (
                        <tr key={lease.ip} className={isDark ? 'hover:bg-secondary-800/30' : 'hover:bg-secondary-50'}>
                          <td className="p-2.5 font-mono text-teal-300 font-semibold">{lease.ip}</td>
                          <td className="p-2.5 font-mono text-secondary-400">{lease.mac}</td>
                          <td className="p-2.5 font-semibold text-secondary-200">{lease.hostname}</td>
                          <td className="p-2.5 text-secondary-400">{lease.leaseExpires}</td>
                          <td className="p-2.5 text-right">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium">
                              {lease.type}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            {isTr ? 'Kapat' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
