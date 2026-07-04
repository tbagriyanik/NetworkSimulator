'use client';

import { SecurityConfig } from '@/lib/network/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Translations } from '@/contexts/LanguageContext';
import { ShieldCheck } from 'lucide-react';


interface SecurityPanelProps {
  security: SecurityConfig;
  t: Translations;
  theme: string;
  isDevicePoweredOff?: boolean;
}

export type { SecurityPanelProps };

interface SecurityItem {
  name: string;
  enabled: boolean;
  description: string;
  weight: number;
}

export function SecurityPanel({ security, t, theme, isDevicePoweredOff = false }: SecurityPanelProps) {
  const isDark = theme === 'dark';

  const securityItems: SecurityItem[] = [
    {
      name: t.enableSecret,
      enabled: !!security.enableSecret,
      description: security.enableSecret ? t.secEnableSecretOn : t.secEnableSecretOff,
      weight: 25
    },
    {
      name: t.consoleSecurity,
      enabled: security.consoleLine.login && !!security.consoleLine.password,
      description: security.consoleLine.login ? t.secConsoleOn : t.secConsoleOff,
      weight: 20
    },
    {
      name: t.vtySecurity,
      enabled: security.vtyLines.login && !!security.vtyLines.password,
      description: security.vtyLines.login ? t.secVtyOn : t.secVtyOff,
      weight: 20
    },
    {
      name: t.passwordEncryption,
      enabled: security.servicePasswordEncryption,
      description: security.servicePasswordEncryption ? t.secPassEncOn : t.secPassEncOff,
      weight: 15
    },
    {
      name: t.sshAccess,
      enabled: security.vtyLines.transportInput.includes('ssh') &&
        !security.vtyLines.transportInput.includes('telnet') &&
        security.vtyLines.transportInput[0] !== 'all' &&
        security.vtyLines.transportInput[0] !== 'none',
      description: security.vtyLines.transportInput.includes('ssh') &&
        !security.vtyLines.transportInput.includes('telnet')
        ? t.secSshOnly
        : security.vtyLines.transportInput.includes('telnet')
          ? t.secTelnetWarn
          : t.secNoProtocol,
      weight: 20
    }
  ];

  const cardBg = isDark ? 'bg-secondary-800 border-secondary-700' : 'bg-white border-secondary-200';
  const innerBg = isDark ? 'bg-secondary-900' : 'bg-secondary-100';
  const itemBg = isDark ? 'bg-secondary-900' : 'bg-secondary-50';
  const textPrimary = isDark ? 'text-white' : 'text-secondary-900';
  const textSecondary = isDark ? 'text-secondary-400' : 'text-secondary-600';
  const textMuted = isDark ? 'text-secondary-500' : 'text-secondary-400';

  return (
    <Card className={`${cardBg} transition-all duration-300 hover:shadow-lg`}>
      <CardHeader className={`py-3 px-5 border-b ${isDark ? 'border-secondary-800/50 bg-secondary-800/20' : 'border-secondary-200 bg-secondary-50'}`}>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-warning-400 text-base sm:text-lg flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            {t.securityControls}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isDevicePoweredOff && (
          <div className="mb-4 px-3 py-2 rounded-lg border border-error-500/30 bg-error-500/10 text-error-500 text-xs font-bold tracking-wider text-center">
            {t.connectionError}
          </div>
        )}

        <div className="space-y-1.5 sm:space-y-2">
          {securityItems.map((item, index) => (
            <div
              key={item.name}
              className={`flex items-center justify-between p-2 ${itemBg} rounded-lg transition-all duration-300 hover:bg-opacity-80`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300 ${item.enabled ? 'bg-success-500 shadow-[0_0_2px_rgba(34,197,94,0.2)]' : 'bg-error-500 shadow-[0_0_2px_rgba(239,68,68,0.2)]'
                  } ${item.enabled ? 'animate-pulse' : ''}`} />
                <div className="min-w-0">
                  <div className={`text-xs sm:text-sm ${textPrimary} truncate transition-colors`}>{item.name}</div>
                  <div className={`text-xs ${textMuted} truncate hidden sm:block transition-colors`}>{item.description}</div>
                </div>
              </div>
              <Badge
                variant={item.enabled ? 'default' : 'destructive'}
                className={`text-xs flex-shrink-0 ml-1 transition-all duration-300 ${item.enabled
                  ? 'bg-success-500/20 text-success-400 border border-success-500/30 hover:bg-success-500/30'
                  : 'hover:bg-error-500/20'
                  }`}
              >
                {item.enabled ? t.on : t.off}
              </Badge>
            </div>
          ))}
        </div>

        {security.users.length > 0 && (
          <div className={`mt-3 sm:mt-4 p-2 ${innerBg} rounded-lg animate-fade-in`}>
            <div className={`text-xs ${textSecondary} mb-1`}>{t.definedUsers}</div>
            <div className="flex flex-wrap gap-1">
              {security.users.map((user) => (
                <Badge
                  key={user.username}
                  variant="outline"
                  className="text-xs transition-all duration-200 hover:scale-105 hover:bg-warning-500/10 hover:text-warning-400"
                >
                  {user.username} (priv: {user.privilege})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
