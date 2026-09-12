'use client';

import { useState, useMemo } from 'react';
import { Database, RefreshCw, Server, Users, CheckCircle2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SwitchState } from '@/lib/network/types';

interface MockLease {
  ip: string;
  mac: string;
  leaseExpires: string;
  type: 'Automatic' | 'Manual Reservation';
  hostname: string;
}

interface DhcpPoolItem {
  name: string;
  network: string;
  mask: string;
  gateway: string;
  dns: string;
  domain?: string;
  totalIps: number;
  usedIps: number;
  leases: MockLease[];
}

interface RouterDhcpSectionProps {
  state?: SwitchState;
  isDark?: boolean;
  language?: string;
  onRefresh?: () => void;
  className?: string;
}

export function RouterDhcpSection({
  state,
  isDark = true,
  language = 'tr',
  onRefresh,
  className,
}: RouterDhcpSectionProps) {
  const isTr = language === 'tr';
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPoolName, setSelectedPoolName] = useState<string | null>(null);

  // Extract all DHCP pools from state
  const pools = useMemo<DhcpPoolItem[]>(() => {
    if (!state) return [];
    const list: DhcpPoolItem[] = [];

    // CLI-defined DHCP Pools
    if (state.dhcpPools) {
      Object.entries(state.dhcpPools).forEach(([name, pool]) => {
        const net = pool.network || '192.168.1.0';
        const mask = pool.subnetMask || '255.255.255.0';
        const gw = pool.defaultRouter || '192.168.1.1';
        const dns = pool.dnsServer || '8.8.8.8';
        const total = 254;

        const lastDot = net.lastIndexOf('.');
        const netBase = lastDot !== -1 ? net.substring(0, lastDot) : '192.168.1';
        const leases: MockLease[] = [
          {
            ip: `${netBase}.10`,
            mac: '0050.7966.6801',
            leaseExpires: '23h 45m',
            type: 'Automatic',
            hostname: 'PC-Engineering',
          },
          {
            ip: `${netBase}.11`,
            mac: '0050.7966.6802',
            leaseExpires: '21h 10m',
            type: 'Automatic',
            hostname: 'PC-Finance',
          },
          {
            ip: `${netBase}.50`,
            mac: '0060.2F88.A100',
            leaseExpires: 'Infinite',
            type: 'Manual Reservation',
            hostname: 'Printer-Color',
          },
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
          leases,
        });
      });
    }

    // GUI services.dhcp pools
    if (state.services?.dhcp?.pools) {
      state.services.dhcp.pools.forEach((p) => {
        if (!list.some((existing) => existing.name === p.poolName)) {
          const total = p.maxUsers || 50;
          const startIp = p.startIp || '192.168.1.100';
          const lastDot = startIp.lastIndexOf('.');
          const netBase = lastDot !== -1 ? startIp.substring(0, lastDot) : '192.168.1';
          const net = `${netBase}.0`;

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
                ip: `${netBase}.100`,
                mac: '00E0.F411.D205',
                leaseExpires: '24h 00m',
                type: 'Automatic',
                hostname: 'Client-100',
              },
              {
                ip: `${netBase}.101`,
                mac: '00E0.F411.D206',
                leaseExpires: '23h 58m',
                type: 'Automatic',
                hostname: 'Client-101',
              },
            ],
          });
        }
      });
    }

    return list;
  }, [state]);

  const activePool = useMemo(() => {
    if (!selectedPoolName) return pools[0] || null;
    return pools.find((p) => p.name === selectedPoolName) || pools[0] || null;
  }, [pools, selectedPoolName]);

  const filteredLeases = useMemo(() => {
    if (!activePool) return [];
    if (!searchQuery.trim()) return activePool.leases;
    const q = searchQuery.toLowerCase();
    return activePool.leases.filter(
      (l) =>
        l.ip.toLowerCase().includes(q) ||
        l.mac.toLowerCase().includes(q) ||
        l.hostname.toLowerCase().includes(q) ||
        l.type.toLowerCase().includes(q)
    );
  }, [activePool, searchQuery]);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
            <Database className="w-4 h-4 text-primary" />
            <span>{isTr ? 'DHCP Bilgileri & Havuz Yönetimi' : 'DHCP Information & Pools'}</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isTr
              ? 'Aktif DHCP havuzları, ağ aralıkları ve istemci kiralama bilgileri.'
              : 'Active DHCP pools, IP scopes, and client leases for this router.'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefreshClick}
          className={cn(
            'px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all shrink-0',
            isDark
              ? 'bg-secondary-800 border-secondary-700 hover:bg-secondary-700 text-secondary-200'
              : 'bg-white border-secondary-300 hover:bg-secondary-50 text-secondary-700'
          )}
          title={isTr ? 'DHCP bilgilerini yenile' : 'Refresh DHCP info'}
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin text-primary')} />
          <span>{isTr ? 'DHCP Bilgilerini Yenile' : 'Refresh DHCP Info'}</span>
        </button>
      </div>

      {/* Main Container */}
      <div
        className={cn(
          'rounded-xl border overflow-hidden',
          isDark ? 'bg-secondary-900 border-secondary-800/80' : 'bg-white border-secondary-200'
        )}
      >
        {pools.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <Database className="w-10 h-10 mx-auto text-muted-foreground/60 animate-pulse" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">
                {isTr ? 'Aktif DHCP Havuzu Bulunmuyor' : 'No Active DHCP Pools Configured'}
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {isTr
                  ? 'Bu cihazda henüz yapılandırılmış DHCP havuzu bulunmamaktadır. CLI üzerinden `ip dhcp pool` komutu ile havuz ekleyebilirsiniz.'
                  : 'No DHCP pools configured on this device yet. Use `ip dhcp pool` via CLI to configure pools.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-5">
            {/* Pool Selector & Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                className={cn(
                  'p-3 rounded-lg border flex items-center gap-3',
                  isDark ? 'bg-secondary-950/60 border-secondary-800' : 'bg-secondary-50 border-secondary-200'
                )}
              >
                <div className="p-2 rounded-md bg-primary-500/10 text-primary-500">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    {isTr ? 'Toplam Havuz' : 'Total Pools'}
                  </div>
                  <div className="text-sm font-bold">{pools.length}</div>
                </div>
              </div>

              <div
                className={cn(
                  'p-3 rounded-lg border flex items-center gap-3',
                  isDark ? 'bg-secondary-950/60 border-secondary-800' : 'bg-secondary-50 border-secondary-200'
                )}
              >
                <div className="p-2 rounded-md bg-success-500/10 text-success-500">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    {isTr ? 'Aktif Kiralamalar' : 'Active Leases'}
                  </div>
                  <div className="text-sm font-bold">
                    {pools.reduce((sum, p) => sum + p.usedIps, 0)}
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  'p-3 rounded-lg border flex items-center gap-3',
                  isDark ? 'bg-secondary-950/60 border-secondary-800' : 'bg-secondary-50 border-secondary-200'
                )}
              >
                <div className="p-2 rounded-md bg-warning-500/10 text-warning-500">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    {isTr ? 'Seçili Havuz' : 'Active Scope'}
                  </div>
                  <div className="text-sm font-bold truncate max-w-[120px]">
                    {activePool?.name || '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Pools Table */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">
                {isTr ? 'DHCP Havuz Listesi' : 'DHCP Pool List'}
              </div>
              <div className="overflow-x-auto rounded-lg border border-secondary-200 dark:border-secondary-800">
                <table className="w-full text-xs text-left">
                  <thead
                    className={cn(
                      'border-b text-[10px] uppercase tracking-wider font-semibold',
                      isDark
                        ? 'bg-secondary-950 border-secondary-800 text-secondary-400'
                        : 'bg-secondary-100 border-secondary-200 text-secondary-600'
                    )}
                  >
                    <tr>
                      <th className="p-2.5">{isTr ? 'Havuz Adı' : 'Pool Name'}</th>
                      <th className="p-2.5">{isTr ? 'Ağ / Subnet' : 'Network / Subnet'}</th>
                      <th className="p-2.5">{isTr ? 'Varsayılan Gateway' : 'Default Gateway'}</th>
                      <th className="p-2.5">{isTr ? 'DNS Sunucu' : 'DNS Server'}</th>
                      <th className="p-2.5 text-right">{isTr ? 'Kullanılan IP' : 'Leased IPs'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pools.map((pool) => {
                      const isSelected = activePool?.name === pool.name;
                      return (
                        <tr
                          key={pool.name}
                          onClick={() => setSelectedPoolName(pool.name)}
                          className={cn(
                            'border-b last:border-0 cursor-pointer transition-colors',
                            isSelected
                              ? isDark
                                ? 'bg-primary-500/15 border-primary-500/30'
                                : 'bg-primary-50 border-primary-200'
                              : isDark
                                ? 'border-secondary-800 hover:bg-secondary-800/40'
                                : 'border-secondary-200 hover:bg-secondary-50'
                          )}
                        >
                          <td className="p-2.5 font-bold flex items-center gap-1.5">
                            <span
                              className={cn(
                                'w-2 h-2 rounded-full',
                                isSelected ? 'bg-primary-500' : 'bg-secondary-400'
                              )}
                            />
                            <span>{pool.name}</span>
                          </td>
                          <td className="p-2.5 font-mono text-[11px]">
                            {pool.network} / {pool.mask}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-muted-foreground">
                            {pool.gateway}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-muted-foreground">
                            {pool.dns}
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold">
                            <span className="text-primary-500">{pool.usedIps}</span> / {pool.totalIps}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Active Leases Table */}
            {activePool && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <span>
                      {isTr
                        ? `[${activePool.name}] İstemci Kiralamaları / Binding Tablosu`
                        : `[${activePool.name}] Client Leases & DHCP Bindings`}
                    </span>
                  </div>
                  <div className="relative w-44">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={isTr ? 'Filtrele...' : 'Filter...'}
                      className={cn(
                        'w-full pl-7 pr-2 py-1 rounded-md text-[10px] border outline-none',
                        isDark
                          ? 'bg-secondary-950 border-secondary-800 text-white focus:border-primary-500'
                          : 'bg-white border-secondary-300 text-secondary-900 focus:border-primary-600'
                      )}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-secondary-200 dark:border-secondary-800 max-h-48 custom-scrollbar">
                  <table className="w-full text-xs text-left">
                    <thead
                      className={cn(
                        'border-b text-[10px] uppercase tracking-wider font-semibold sticky top-0 z-10',
                        isDark
                          ? 'bg-secondary-950 border-secondary-800 text-secondary-400'
                          : 'bg-secondary-100 border-secondary-200 text-secondary-600'
                      )}
                    >
                      <tr>
                        <th className="p-2">{isTr ? 'İstemci IP' : 'Client IP'}</th>
                        <th className="p-2">{isTr ? 'MAC Adresi' : 'MAC Address'}</th>
                        <th className="p-2">{isTr ? 'Host Adı' : 'Hostname'}</th>
                        <th className="p-2">{isTr ? 'Tip' : 'Type'}</th>
                        <th className="p-2 text-right">{isTr ? 'Kiralama Süresi' : 'Lease Expiry'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeases.length > 0 ? (
                        filteredLeases.map((lease, idx) => (
                          <tr
                            key={idx}
                            className={cn(
                              'border-b last:border-0 transition-colors',
                              isDark
                                ? 'border-secondary-800/80 hover:bg-secondary-800/30'
                                : 'border-secondary-200 hover:bg-secondary-50/60'
                            )}
                          >
                            <td className="p-2 font-mono font-bold text-primary-400">{lease.ip}</td>
                            <td className="p-2 font-mono text-[11px] text-muted-foreground">{lease.mac}</td>
                            <td className="p-2 font-medium">{lease.hostname}</td>
                            <td className="p-2">
                              <span
                                className={cn(
                                  'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border',
                                  lease.type === 'Automatic'
                                    ? 'bg-success-500/10 text-success-500 border-success-500/20'
                                    : 'bg-warning-500/10 text-warning-500 border-warning-500/20'
                                )}
                              >
                                {lease.type}
                              </span>
                            </td>
                            <td className="p-2 text-right font-mono text-[11px] text-muted-foreground">
                              {lease.leaseExpires}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-muted-foreground italic text-xs">
                            {isTr ? 'Kayıtlı kiralama bulunamadı.' : 'No leases found.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
