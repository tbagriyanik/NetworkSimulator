// Komut kısaltmaları için eşleşme - TÜM NETWORK KOMUTLARI
import { commandAliasesBasic } from './commandAliasesBasic';
import { commandAliasesAdvanced } from './commandAliasesAdvanced';

export const commandAliases: Record<string, string> = {
  ...commandAliasesBasic,
  ...commandAliasesAdvanced,
};
