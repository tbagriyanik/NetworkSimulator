'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DhcpPoolConfig } from './PCPanel.types';

interface DhcpServiceConfigProps {
  isDark: boolean;
  language: string;
  t: Record<string, string>;
  serviceDhcpEnabled: boolean;
  setServiceDhcpEnabled: (val: boolean) => void;
  serviceDhcpPools: DhcpPoolConfig[];
  setServiceDhcpPools: (pools: DhcpPoolConfig[]) => void;
  dhcpForm: DhcpPoolConfig;
  setDhcpForm: React.Dispatch<React.SetStateAction<DhcpPoolConfig>>;
  editingDhcpIndex: number | null;
  setEditingDhcpIndex: (val: number | null) => void;
  dispatchDeviceConfig: (config: Record<string, unknown>) => void;
  serviceDnsEnabled: boolean;
  serviceDnsRecords: Array<{ domain: string; address: string }>;
  serviceHttpEnabled: boolean;
  serviceHttpContent: string;
  isDhcpEditingRef: React.RefObject<boolean>;
}

export function DhcpServiceConfig({
  isDark,
  language,
  t,
  serviceDhcpEnabled,
  setServiceDhcpEnabled,
  serviceDhcpPools,
  setServiceDhcpPools,
  dhcpForm,
  setDhcpForm,
  editingDhcpIndex,
  setEditingDhcpIndex,
  dispatchDeviceConfig,
  serviceDnsEnabled,
  serviceDnsRecords,
  serviceHttpEnabled,
  serviceHttpContent,
  isDhcpEditingRef,
}: DhcpServiceConfigProps) {

  const resetDhcpForm = () => {
    setDhcpForm({
      poolName: '',
      defaultGateway: '',
      dnsServer: '',
      startIp: '',
      subnetMask: '255.255.255.0',
      maxUsers: 50,
    });
    setEditingDhcpIndex(null);
    if (isDhcpEditingRef.current !== null) {
      // @ts-ignore
      isDhcpEditingRef.current = false;
    }
  };

  const saveDhcpPool = () => {
    if (isDhcpEditingRef.current !== null) {
      // @ts-ignore
      isDhcpEditingRef.current = true;
    }
    const name = dhcpForm.poolName.trim();
    if (!name) return;

    let nextPools = [...serviceDhcpPools];
    if (editingDhcpIndex === null) {
      nextPools = nextPools.filter((p) => p.poolName.toLowerCase() !== name.toLowerCase());
      nextPools.push({ ...dhcpForm, poolName: name });
    } else {
      nextPools[editingDhcpIndex] = { ...dhcpForm, poolName: name };
    }

    setServiceDhcpPools(nextPools);
    dispatchDeviceConfig({
      services: {
        dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
        http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
        dhcp: { enabled: serviceDhcpEnabled, pools: nextPools }
      }
    });

    resetDhcpForm();
  };

  return (
    <div className="p-3 animate-in fade-in duration-200">
      <div className={`rounded-xl border p-4 space-y-4 ${isDark ? 'border-secondary-800 bg-secondary-900/40' : 'border-secondary-200 bg-white'}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold">
              {language === 'tr'
                ? 'DHCP (Dynamic Host Configuration Protocol - otomatik IP)'
                : 'DHCP (Dynamic Host Configuration Protocol - auto IP)'}
            </h3>
            <p className={`text-xs ${isDark ? 'text-secondary-200' : 'text-secondary-500'}`}>
              {t.dhcpPoolsDescription}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${serviceDhcpEnabled ? 'bg-accent-500/15 text-accent-600 border border-accent-500/30' : 'bg-secondary-200 text-secondary-500 border border-secondary-300'}`}>
              {serviceDhcpEnabled ? 'ON' : 'OFF'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={serviceDhcpEnabled}
              onClick={() => {
                const enabled = !serviceDhcpEnabled;
                setServiceDhcpEnabled(enabled);
                dispatchDeviceConfig({
                  services: {
                    dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
                    http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
                    dhcp: { enabled, pools: serviceDhcpPools }
                  }
                });
              }}
              className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/60 ${serviceDhcpEnabled
                ? 'bg-accent-500/90 border-accent-400'
                : (isDark ? 'bg-secondary-800 border-secondary-700' : 'bg-secondary-200 border-secondary-300')
                }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${serviceDhcpEnabled ? 'translate-x-8' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            value={dhcpForm.poolName}
            onChange={(e) => setDhcpForm((prev) => ({ ...prev, poolName: e.target.value }))}
            placeholder={t.dhcpPoolNamePlaceholder}
            onKeyDown={(e) => e.key === 'Enter' && saveDhcpPool()}
          />
          <Input
            value={dhcpForm.defaultGateway}
            onChange={(e) => setDhcpForm((prev) => ({ ...prev, defaultGateway: e.target.value }))}
            placeholder={t.dhcpPoolGatewayPlaceholder}
            onKeyDown={(e) => e.key === 'Enter' && saveDhcpPool()}
          />
          <Input
            value={dhcpForm.dnsServer}
            onChange={(e) => setDhcpForm((prev) => ({ ...prev, dnsServer: e.target.value }))}
            placeholder={t.dhcpPoolDnsPlaceholder}
            onKeyDown={(e) => e.key === 'Enter' && saveDhcpPool()}
          />
          <Input
            value={dhcpForm.startIp}
            onChange={(e) => setDhcpForm((prev) => ({ ...prev, startIp: e.target.value }))}
            placeholder={t.dhcpPoolStartIpPlaceholder}
            onKeyDown={(e) => e.key === 'Enter' && saveDhcpPool()}
          />
          <Input
            value={dhcpForm.subnetMask}
            onChange={(e) => setDhcpForm((prev) => ({ ...prev, subnetMask: e.target.value }))}
            placeholder={t.dhcpPoolSubnetPlaceholder}
            onKeyDown={(e) => e.key === 'Enter' && saveDhcpPool()}
          />
          <Input
            type="number"
            min={1}
            value={dhcpForm.maxUsers}
            onChange={(e) => setDhcpForm((prev) => ({ ...prev, maxUsers: Number(e.target.value || 1) }))}
            placeholder={t.dhcpPoolMaxUsersPlaceholder}
            onKeyDown={(e) => e.key === 'Enter' && saveDhcpPool()}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={saveDhcpPool}>
            {editingDhcpIndex === null ? t.addPool : t.updatePool}
          </Button>
          {editingDhcpIndex !== null && (
            <Button variant="outline" onClick={resetDhcpForm}>
              {t.cancel}
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {serviceDhcpPools.length === 0 && (
            <div className={`text-xs ${isDark ? 'text-secondary-500' : 'text-secondary-500'}`}>
              {t.noDhcpPools}
            </div>
          )}
          {serviceDhcpPools.map((pool, index) => (
            <div key={`${pool.poolName}-${index}`} className={`rounded-lg px-3 py-2 space-y-2 ${isDark ? 'bg-secondary-950 border border-secondary-800' : 'bg-secondary-50 border border-secondary-200'}`}>
              <div className="text-xs font-mono">
                <div>{pool.poolName}</div>
                <div>GW: {pool.defaultGateway} | DNS: {pool.dnsServer}</div>
                <div>Start: {pool.startIp} | Mask: {pool.subnetMask} | Max: {pool.maxUsers}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (isDhcpEditingRef.current !== null) {
                      // @ts-ignore
                      isDhcpEditingRef.current = true;
                    }
                    setDhcpForm(pool);
                    setEditingDhcpIndex(index);
                  }}
                >
                  {t.edit}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (isDhcpEditingRef.current !== null) {
                      // @ts-ignore
                      isDhcpEditingRef.current = true;
                    }
                    const newPools = serviceDhcpPools.filter((_, i) => i !== index);
                    setServiceDhcpPools(newPools);
                    dispatchDeviceConfig({
                      services: {
                        dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
                        http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
                        dhcp: { enabled: serviceDhcpEnabled, pools: newPools }
                      }
                    });
                    if (editingDhcpIndex === index) {
                      resetDhcpForm();
                    }
                  }}
                >
                  {t.delete}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
