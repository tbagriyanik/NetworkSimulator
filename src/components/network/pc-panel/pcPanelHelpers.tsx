'use client';

import React from 'react';
import type { OutputLine } from './PCPanel.types';

export function validateIP(ip: string) {
  const parts = ip.trim().split('.');
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

export function validateIPv6(ipv6: string) {
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  return ipv6Regex.test(ipv6);
}

export function isValidIpAddress(value: string) {
  return validateIP(value);
}

export function formatMacForArp(mac?: string) {
  if (!mac) return '';
  const hex = mac.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
  if (hex.length !== 12) return mac.toLowerCase();
  return hex.match(/.{1,2}/g)?.join('-') || mac.toLowerCase();
}

interface HighlightTextParams {
  text: string;
  searchQuery: string;
  isDark: boolean;
}

export function highlightText({ text, searchQuery, isDark }: HighlightTextParams) {
  const q = searchQuery.trim();
  if (!q) return text;
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(safe, 'gi');
  const parts = text.split(re);
  const matches = text.match(re);
  if (!matches) return text;
  const out: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) out.push(<span key={`p-${i}`}>{parts[i]}</span>);
    if (matches[i]) {
      out.push(
        <mark
          key={`m-${i}`}
          className={`px-0.5 rounded ${isDark ? 'bg-accent-500/20 text-accent-200' : 'bg-accent-200 text-secondary-900'}`}
        >
          {matches[i]}
        </mark>
      );
    }
  }
  return <>{out}</>;
}

export function getInitialPcOutput(deviceFromTopology?: { ip?: string; subnet?: string; gateway?: string; ipv6?: string }): OutputLine[] {
  return [{
    id: '1',
    type: 'output',
    content: 'OS [Version 10.0.26200.8037]\n(c) OS Corporation. All rights reserved.\n\nEthernet adapter Ethernet connection:\n   IPv4 Address. . . . . . . . . . . : ' + (deviceFromTopology?.ip || '0.0.0.0') + '\n   Subnet Mask . . . . . . . . . . : ' + (deviceFromTopology?.subnet || '255.255.255.0') + '\n   Default Gateway . . . . . . . . . : ' + (deviceFromTopology?.gateway || '0.0.0.0') + '\n   IPv6 Address. . . . . . . . . . : ' + (deviceFromTopology?.ipv6 || '2001:db8:acad:1::10') + '\n'
  }];
}
