'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ListTree } from 'lucide-react';
import type { MacTableEntry } from '@/lib/network/macLearning';

interface MacTablePanelProps {
  macTable: MacTableEntry[];
  isDark?: boolean;
  language: string;
  deviceName?: string;
}

export function MacTablePanel({ macTable, isDark = false, language, deviceName }: MacTablePanelProps) {
  const cardBg = isDark ? 'bg-secondary-800 border-secondary-700' : 'bg-white border-secondary-200';
  const headerBg = isDark ? 'border-secondary-500/60 bg-secondary-700' : 'border-secondary-200 bg-secondary-50';
  const rowBorder = isDark ? 'border-secondary-800' : 'border-secondary-200';
  const hoverBg = isDark ? 'hover:bg-secondary-800/30' : 'hover:bg-secondary-100/60';

  const sorted = [...(macTable || [])].sort((a, b) =>
    (a.vlan - b.vlan) || (a.port || '').localeCompare(b.port || '')
  );

  return (
    <Card className={`${cardBg} transition-all duration-300 hover:shadow-lg`}>
      <CardHeader className={`py-3 px-5 border-b ${headerBg}`}>
        <CardTitle className="text-primary text-base sm:text-lg flex items-center gap-2">
          <ListTree className="w-4 h-4 sm:w-5 sm:h-5" />
          {language === 'tr' ? 'MAC Adres Tablosu' : 'MAC Address Table'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className={cn(
          "rounded-lg border overflow-hidden",
          isDark ? "bg-secondary-900 border-secondary-700" : "bg-secondary-50 border-secondary-200"
        )}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className={cn(
                "border-b text-[10px] uppercase tracking-wider font-semibold",
                isDark ? "bg-secondary-950 border-secondary-800 text-secondary-400" : "bg-secondary-100 border-secondary-200 text-secondary-600"
              )}>
                <tr>
                  <th className="p-2.5">VLAN</th>
                  <th className="p-2.5">{language === 'tr' ? 'MAC Adresi' : 'MAC Address'}</th>
                  <th className="p-2.5">{language === 'tr' ? 'Tür' : 'Type'}</th>
                  <th className="p-2.5">{language === 'tr' ? 'Port' : 'Port'}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length > 0 ? (
                  sorted.map((entry) => (
                    <tr key={`mac-${entry.vlan}-${entry.mac}-${entry.port || 'none'}`} className={cn("border-b last:border-0", rowBorder, hoverBg)}>
                      <td className="p-2.5 font-mono font-semibold">{entry.vlan}</td>
                      <td className="p-2.5 font-mono">{entry.mac}</td>
                      <td className="p-2.5">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                          entry.type === 'STATIC'
                            ? "bg-primary-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                            : "bg-success-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        )}>
                          {entry.type || 'DYNAMIC'}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-muted-foreground">{entry.port || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground italic">
                      {language === 'tr'
                        ? (deviceName ? `${deviceName} cihazında öğrenilmiş MAC adresi yok.` : 'Öğrenilmiş MAC adresi yok.')
                        : (deviceName ? `No learned MAC addresses on ${deviceName}.` : 'No learned MAC addresses.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {sorted.length > 0 && (
            <div className={cn(
              "px-4 py-2 border-t text-[10px] font-medium",
              isDark ? "border-secondary-800 text-secondary-500" : "border-secondary-200 text-secondary-500"
            )}>
              {language === 'tr'
                ? `Toplam ${sorted.length} MAC adresi`
                : `${sorted.length} MAC address(es)`}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}