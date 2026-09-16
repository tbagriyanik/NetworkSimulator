'use client';

import React, { useCallback } from 'react';
import type { CanvasDevice, CanvasConnection } from '../NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { OutputLine } from './PCPanel.types';
import { checkConnectivity } from '@/lib/network/connectivity';
import { dispatchCapturedPackets } from '../../../utils/packetCapture';
import { syncMailFilesToFs } from './pcFileSystem';
import { secureStorage } from '@/lib/storage/secureStorage';

interface UsePCPanelMailOptions {
  language: string;
  deviceId: string;
  deviceFromTopology: CanvasDevice | undefined;
  topologyDevices: CanvasDevice[];
  topologyConnections: { sourceDeviceId: string; sourcePort: string; targetDeviceId: string; targetPort: string; cableType?: string; active?: boolean }[];
  deviceStates: Map<string, SwitchState> | undefined;
  pcIP: string;
  serviceMailDomain: string;
  serviceMailUsername: string;
  serviceMailEnabled: boolean;
  serviceMailPassword: string;
  serviceMailInbox: Array<{ from: string; subject: string; body: string; timestamp?: string }>;
  setServiceMailInbox: React.Dispatch<React.SetStateAction<Array<{ from: string; subject: string; body: string; timestamp?: string }>>>;
  serviceMailSent: Array<{ to: string; subject: string; body: string; timestamp?: string }>;
  setServiceMailSent: React.Dispatch<React.SetStateAction<Array<{ to: string; subject: string; body: string; timestamp?: string }>>>;
  serviceDnsEnabled: boolean;
  serviceDnsRecords: Array<{ domain: string; address: string }>;
  serviceHttpEnabled: boolean;
  serviceHttpContent: string;
  serviceFtpEnabled: boolean;
  serviceDhcpEnabled: boolean;
  serviceDhcpPools: Array<{ poolName: string; defaultGateway: string; dnsServer: string; startIp: string; subnetMask: string; maxUsers: number }>;
  dispatchDeviceConfig: (config: Partial<CanvasDevice>) => void;
  addLocalOutput: (type: OutputLine['type'], content: string) => void;
  addPcArpEntry?: (targetIp: string, targetMac: string, isIot?: boolean) => void;
}

export function usePCPanelMail({
  language,
  deviceId,
  deviceFromTopology,
  topologyDevices,
  topologyConnections,
  deviceStates,
  pcIP,
  serviceMailDomain,
  serviceMailUsername,
  serviceMailEnabled,
  serviceMailPassword,
  serviceMailInbox,
  setServiceMailInbox,
  serviceMailSent,
  setServiceMailSent,
  serviceDnsEnabled,
  serviceDnsRecords,
  serviceHttpEnabled,
  serviceHttpContent,
  serviceFtpEnabled,
  serviceDhcpEnabled,
  serviceDhcpPools,
  dispatchDeviceConfig,
  addLocalOutput,
  addPcArpEntry,
}: UsePCPanelMailOptions) {
  const handleComposeSend = useCallback(
    (
      to: string,
      subject: string,
      body: string,
      onError: (err: string) => void,
      onSuccess: () => void
    ) => {
      const recipient = to.trim();
      const subj = subject.trim() || '(no subject)';
      const bdy = body.trim();
      if (!recipient || !bdy) return;
      const [reqUser, reqDomain] = recipient.includes('@')
        ? recipient.split('@')
        : [recipient, serviceMailDomain];
      const targetDevice = topologyDevices.find((d: CanvasDevice) => {
        const mail = d.services?.mail;
        if (mail?.username === reqUser && mail?.domain === (reqDomain || serviceMailDomain))
          return true;
        const isNameMatch = d.name === reqUser || d.ip === reqUser || d.id === reqUser;
        const isDomainMatch = d.ip === reqDomain;
        return isNameMatch && (isDomainMatch || !reqDomain);
      });
      if (!targetDevice) {
        onError(language === 'tr' ? 'AlÄ±cÄ± bulunamadÄ±.' : 'Recipient not found.');
        return;
      }
      if (targetDevice.ip) {
        const connectivity = checkConnectivity(
          deviceId,
          targetDevice.ip,
          topologyDevices,
          topologyConnections as unknown as CanvasConnection[],
          deviceStates || new Map(),
          language as 'tr' | 'en',
          { protocol: 'tcp', port: '25' }
        );
        const smtpPackets = (connectivity.capturedPackets || []).map(p => ({
          ...p,
          protocol: 'SMTP',
          info: `SMTP: MAIL FROM:<${serviceMailUsername}@${serviceMailDomain}> RCPT TO:<${recipient}>`
        }));
        dispatchCapturedPackets(smtpPackets.length > 0 ? smtpPackets : connectivity.capturedPackets);
        if (!connectivity.success) {
          onError(
            language === 'tr'
              ? 'SMTP (port 25) engellendi. Posta gÃ¶nderilemiyor.'
              : 'SMTP (port 25) blocked. Cannot send mail.'
          );
          return;
        }
        // ARP gÃ¼ncelle: SMTP baÄŸlantÄ±sÄ± baÅŸarÄ±lÄ± olduÄŸunda ARP tablosu gÃ¼ncellenir
        if (connectivity.success && targetDevice.macAddress) {
          addPcArpEntry?.(targetDevice.ip, targetDevice.macAddress, targetDevice.type === 'iot');
        }
      }
      onError('');
      const timestamp = new Date().toISOString();
      const senderName = deviceFromTopology?.name || pcIP || serviceMailUsername;
      const senderEmail = `${serviceMailUsername}@${serviceMailDomain}`;
      const from = `${senderName} <${senderEmail}>`;
      const newInboxEntry = { from, to: recipient, subject: subj, body: bdy, timestamp };
      let existingInbox = targetDevice.services?.mail?.inbox || [];
      if (typeof window !== 'undefined') {
        try {
          const stored = secureStorage.getItem(`mail_inbox_${targetDevice.id}`);
          if (stored) existingInbox = JSON.parse(stored);
        } catch { }
      }
      const updatedInbox = [newInboxEntry, ...existingInbox];
      if (typeof window !== 'undefined')
        secureStorage.setItem(`mail_inbox_${targetDevice.id}`, JSON.stringify(updatedInbox));
      const newSentEntry = { from, to: recipient, subject: subj, body: bdy, timestamp };
      const nextSent = [newSentEntry, ...serviceMailSent];
      setServiceMailSent(nextSent);

      // Sync mail files to FS for target and local device
      syncMailFilesToFs(targetDevice.id, updatedInbox, targetDevice.services?.mail?.sent || []);
      syncMailFilesToFs(deviceId, serviceMailInbox, nextSent);

      window.dispatchEvent(
        new CustomEvent('update-topology-device-config', {
          detail: {
            deviceId: targetDevice.id,
            config: {
              services: {
                ...targetDevice.services,
                mail: {
                  ...targetDevice.services?.mail,
                  enabled: targetDevice.services?.mail?.enabled ?? true,
                  domain: targetDevice.services?.mail?.domain || serviceMailDomain,
                  username: targetDevice.services?.mail?.username || serviceMailUsername,
                  inbox: updatedInbox,
                },
              },
            },
          },
        })
      );
      window.dispatchEvent(
        new CustomEvent('update-topology-device-config', {
          detail: {
            deviceId,
            config: {
              services: {
                ...deviceFromTopology?.services,
                mail: {
                  ...deviceFromTopology?.services?.mail,
                  enabled: serviceMailEnabled,
                  domain: serviceMailDomain,
                  username: serviceMailUsername,
                  password: serviceMailPassword,
                  inbox: serviceMailInbox,
                  sent: nextSent,
                },
              },
            },
          },
        })
      );
      addLocalOutput('success', language === 'tr' ? 'Mesaj gÃ¶nderildi.' : 'Message sent.');
      onSuccess();
    },
    [
      serviceMailDomain,
      serviceMailUsername,
      serviceMailEnabled,
      serviceMailPassword,
      serviceMailInbox,
      serviceMailSent,
      topologyDevices,
      topologyConnections,
      deviceStates,
      deviceId,
      addLocalOutput,
      language,
      deviceFromTopology,
      pcIP,
      addPcArpEntry,
    ]
  );

  const handleViewReplySend = useCallback(
    (
      replyBody: string,
      msg: {
        from?: string;
        to?: string;
        subject: string;
        body: string;
        timestamp?: string;
      },
      onError: (err: string) => void,
      onSuccess: () => void
    ) => {
      if (!replyBody.trim() || !msg) return;
      if (!msg.from) return;
      const emailMatch = msg.from.match(/<([^>]+)>/);
      const senderEmail = emailMatch ? emailMatch[1] : msg.from;
      const [reqUser, reqDomain] = senderEmail.includes('@')
        ? senderEmail.split('@')
        : [senderEmail, serviceMailDomain];
      const targetDevice = topologyDevices.find((d: CanvasDevice) => {
        const mail = d.services?.mail;
        if (mail?.username === reqUser && mail?.domain === (reqDomain || serviceMailDomain))
          return true;
        const isNameMatch = d.name === reqUser || d.ip === reqUser || d.id === reqUser || d.name === msg.from || d.ip === msg.from;
        const isDomainMatch = d.ip === reqDomain;
        return isNameMatch && (isDomainMatch || !reqDomain);
      });
      if (!targetDevice) {
        onError(language === 'tr' ? 'AlÄ±cÄ± cihaz bulunamadÄ±.' : 'Target device not found.');
        return;
      }
      if (targetDevice.ip) {
        const connectivity = checkConnectivity(
          deviceId,
          targetDevice.ip,
          topologyDevices,
          topologyConnections as unknown as CanvasConnection[],
          deviceStates || new Map(),
          language as 'tr' | 'en',
          { protocol: 'tcp', port: '25' }
        );
        const smtpPackets = (connectivity.capturedPackets || []).map(p => ({
          ...p,
          protocol: 'SMTP',
          info: `SMTP: MAIL FROM:<${serviceMailUsername}@${serviceMailDomain}> RCPT TO:<${msg.from}>`
        }));
        dispatchCapturedPackets(smtpPackets.length > 0 ? smtpPackets : connectivity.capturedPackets);
        if (!connectivity.success) {
          onError(
            language === 'tr'
              ? 'SMTP (port 25) engellendi. YanÄ±t gÃ¶nderilemiyor.'
              : 'SMTP (port 25) blocked. Cannot send reply.'
          );
          return;
        }
        // ARP gÃ¼ncelle: SMTP yanÄ±t baÄŸlantÄ±sÄ± baÅŸarÄ±lÄ± olduÄŸunda ARP tablosu gÃ¼ncellenir
        if (connectivity.success && targetDevice.macAddress) {
          addPcArpEntry?.(targetDevice.ip, targetDevice.macAddress, targetDevice.type === 'iot');
        }
      }
      onError('');
      const subject = `Re: ${msg.subject}`;
      const timestamp = new Date().toISOString();
      const senderName = deviceFromTopology?.name || pcIP || serviceMailUsername;
      const senderAddr = `${serviceMailUsername}@${serviceMailDomain}`;
      const from = `${senderName} <${senderAddr}>`;
      const newInboxEntry = { from, to: msg.from, subject, body: replyBody, timestamp };
      let existingInbox = targetDevice.services?.mail?.inbox || [];
      if (typeof window !== 'undefined') {
        try {
          const stored = secureStorage.getItem(`mail_inbox_${targetDevice.id}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length >= existingInbox.length) {
              existingInbox = parsed;
            }
          }
        } catch { }
      }
      const updatedInbox = [newInboxEntry, ...existingInbox];
      if (typeof window !== 'undefined')
        secureStorage.setItem(`mail_inbox_${targetDevice.id}`, JSON.stringify(updatedInbox));
      const newSentEntry = { from, to: msg.from, subject, body: replyBody, timestamp };
      const nextSent = [newSentEntry, ...serviceMailSent];
      setServiceMailSent(nextSent);

      // Sync mail files to FS for target and local device
      syncMailFilesToFs(targetDevice.id, updatedInbox, targetDevice.services?.mail?.sent || []);
      syncMailFilesToFs(deviceId, serviceMailInbox, nextSent);

      window.dispatchEvent(
        new CustomEvent('update-topology-device-config', {
          detail: {
            deviceId: targetDevice.id,
            config: {
              services: {
                ...targetDevice.services,
                mail: {
                  ...targetDevice.services?.mail,
                  enabled: targetDevice.services?.mail?.enabled ?? true,
                  domain: targetDevice.services?.mail?.domain || reqDomain || serviceMailDomain,
                  username: targetDevice.services?.mail?.username || reqUser || serviceMailUsername,
                  inbox: updatedInbox,
                },
              },
            },
          },
        })
      );
      window.dispatchEvent(
        new CustomEvent('update-topology-device-config', {
          detail: {
            deviceId,
            config: {
              services: {
                ...deviceFromTopology?.services,
                mail: {
                  ...deviceFromTopology?.services?.mail,
                  enabled: serviceMailEnabled,
                  domain: serviceMailDomain,
                  username: serviceMailUsername,
                  password: serviceMailPassword,
                  inbox: serviceMailInbox,
                  sent: nextSent,
                },
              },
            },
          },
        })
      );
      addLocalOutput('success', language === 'tr' ? 'YanÄ±t gÃ¶nderildi.' : 'Reply sent.');
      onSuccess();
    },
    [
      serviceMailDomain,
      serviceMailUsername,
      serviceMailEnabled,
      serviceMailPassword,
      serviceMailInbox,
      serviceMailSent,
      topologyDevices,
      topologyConnections,
      deviceStates,
      deviceId,
      addLocalOutput,
      language,
      deviceFromTopology,
      pcIP,
      addPcArpEntry,
    ]
  );

  const handleDeleteInbox = useCallback(
    (idx: number) => {
      const updated = serviceMailInbox.filter((_, i) => i !== idx);
      setServiceMailInbox(updated);
      syncMailFilesToFs(deviceId, updated, serviceMailSent);
      dispatchDeviceConfig({
        services: {
          dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
          http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
          ftp: { enabled: serviceFtpEnabled },
          mail: {
            enabled: serviceMailEnabled,
            domain: serviceMailDomain,
            username: serviceMailUsername,
            password: serviceMailPassword,
            inbox: updated,
            sent: serviceMailSent,
          },
          dhcp: { enabled: serviceDhcpEnabled, pools: serviceDhcpPools },
        },
      });
    },
    [
      serviceMailInbox,
      serviceMailEnabled,
      serviceMailDomain,
      serviceMailUsername,
      serviceMailPassword,
      serviceMailSent,
      serviceDnsEnabled,
      serviceDnsRecords,
      serviceHttpEnabled,
      serviceHttpContent,
      serviceFtpEnabled,
      serviceDhcpEnabled,
      serviceDhcpPools,
      dispatchDeviceConfig,
      deviceId,
    ]
  );

  const handleDeleteSent = useCallback(
    (idx: number) => {
      const updated = serviceMailSent.filter((_, i) => i !== idx);
      setServiceMailSent(updated);
      syncMailFilesToFs(deviceId, serviceMailInbox, updated);
      dispatchDeviceConfig({
        services: {
          dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
          http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
          ftp: { enabled: serviceFtpEnabled },
          mail: {
            enabled: serviceMailEnabled,
            domain: serviceMailDomain,
            username: serviceMailUsername,
            password: serviceMailPassword,
            inbox: serviceMailInbox,
            sent: updated,
          },
          dhcp: { enabled: serviceDhcpEnabled, pools: serviceDhcpPools },
        },
      });
    },
    [
      serviceMailSent,
      serviceMailEnabled,
      serviceMailDomain,
      serviceMailUsername,
      serviceMailPassword,
      serviceMailInbox,
      serviceDnsEnabled,
      serviceDnsRecords,
      serviceHttpEnabled,
      serviceHttpContent,
      serviceFtpEnabled,
      serviceDhcpEnabled,
      serviceDhcpPools,
      dispatchDeviceConfig,
      deviceId,
    ]
  );

  return {
    handleComposeSend,
    handleViewReplySend,
    handleDeleteInbox,
    handleDeleteSent,
  };
}

