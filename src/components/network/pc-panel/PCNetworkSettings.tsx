'use client';

import React from 'react';
import { IpSettingsTab } from './IpSettingsTab';
import { usePCPanel } from './PCPanelContext';

export type PCNetworkSettingsProps = object;

/** Context-connected wrapper: maps PCPanelContext to IpSettingsTab props. */
export const PCNetworkSettings: React.FC<PCNetworkSettingsProps> = () => {
  const ctx = usePCPanel();
  return (
    <IpSettingsTab
      isDark={ctx.isDark}
      fontSize={ctx.fontSize}
      mobileVerticalScrollStyle={ctx.mobileVerticalScrollStyle}
      pcIP={ctx.pcIP}
      setPcIP={ctx.setPcIP}
      pcMAC={ctx.pcMAC}
      setPcMAC={ctx.setPcMAC}
      ipConfigMode={ctx.ipConfigMode}
      setIpConfigMode={ctx.setIpConfigMode}
      pcSubnet={ctx.pcSubnet}
      setPcSubnet={ctx.setPcSubnet}
      pcGateway={ctx.pcGateway}
      setPcGateway={ctx.setPcGateway}
      pcDNS={ctx.pcDNS}
      setPcDNS={ctx.setPcDNS}
      pcIPv6={ctx.pcIPv6}
      setPcIPv6={ctx.setPcIPv6}
      pcIPv6Prefix={ctx.pcIPv6Prefix}
      setPcIPv6Prefix={ctx.setPcIPv6Prefix}
      internalPcHostname={ctx.internalPcHostname}
      setPcHostname={ctx.setPcHostname}
      serviceNtpServer={ctx.serviceNtpServer}
      setServiceNtpServer={ctx.setServiceNtpServer}
      serviceNtpServerError={ctx.serviceNtpServerError}
      setServiceNtpServerError={ctx.setServiceNtpServerError}
      setServiceNtpServerPreset={ctx.setServiceNtpServerPreset}
      serviceNtpEnabled={ctx.serviceNtpEnabled}
      serviceNtpDate={ctx.serviceNtpDate}
      serviceNtpTime={ctx.serviceNtpTime}
      errors={ctx.errors}
      setErrors={ctx.setErrors}
      t={ctx.t}
      language={ctx.language}
      dispatchDeviceConfig={ctx.dispatchDeviceConfig}
      validateIpField={ctx.validateIpField}
      validateSubnetField={ctx.validateSubnetField}
      validateMacField={ctx.validateMacField}
      validateIpv6Field={ctx.validateIpv6Field}
      validateIpv6PrefixField={ctx.validateIpv6PrefixField}
      isValidIpAddress={ctx.isValidIpAddress}
      applyNtpServerTime={ctx.applyNtpServerTime}
      deviceId={ctx.deviceId}
      manualDhcpClickRef={ctx.manualDhcpClickRef}
      applyDhcpLeaseRef={ctx.applyDhcpLeaseRef}
    />
  );
};
