import { SwitchState, CommandResult } from './types';
import { getPrompt } from './executorPrompt';
import { generateBootMessages } from './executorBootMessages';
import { findDeviceByHost, formatBytes } from './executorSessionUtils';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import { secureStorage } from '@/lib/storage/secureStorage';

function handleConsoleConnect(state: SwitchState, language: 'tr' | 'en'): CommandResult {
  const needsLogin = !!(state.security.consoleLine.login && state.security.consoleLine.password);

  let output = `${generateBootMessages(state, language, true)}\n`;

  // Display banner MOTD next
  if (state.bannerMOTD) {
    output += `\n${state.bannerMOTD}\n`;
  }

  output += `\nReady!\n\n`;

  if (!needsLogin) {
    // Check if enable password is configured - if not, start in privileged mode
    const needsEnablePassword = !!(state.security?.enableSecret || state.security?.enablePassword);
    const initialMode = needsEnablePassword ? 'user' : 'privileged';

    const prompt = getPrompt({ ...state, currentMode: initialMode });
    output += prompt;
    return {
      success: true,
      output,
      newState: {
        consoleAuthenticated: true,
        currentMode: initialMode
      }
    };
  }

  output += 'User Access Verification\n\nPassword: ';
  return {
    success: true,
    output,
    requiresPassword: true,
    passwordPrompt: 'Password: ',
    passwordContext: 'console',
    newState: {
      consoleAuthenticated: false,
      awaitingPassword: true,
      passwordContext: 'console'
    }
  };
}

function handleTelnetConnect(state: SwitchState, language: 'tr' | 'en'): CommandResult {
  const needsLogin = !!(state.security.vtyLines?.login && state.security.vtyLines?.password);

  let output = `${generateBootMessages(state, language, false)}\n`;

  if (!needsLogin) {
    // Display banner MOTD for open access
    if (state.bannerMOTD) {
      output += `\n${state.bannerMOTD}\n`;
    }
    output += `\nReady!\n\n`;

    // Telnet authentication always starts in user mode - enable password required to go to privileged
    const initialMode = 'user';

    const prompt = getPrompt({ ...state, currentMode: initialMode });
    output += prompt;
    return {
      success: true,
      output,
      newState: {
        telnetAuthenticated: true,
        currentMode: initialMode
      }
    };
  }

  // Display banner MOTD before login prompt (and banner login if configured)
  output = '';
  if (state.bannerLogin) {
    output += `${state.bannerLogin}\n`;
  }
  if (state.bannerMOTD) {
    output += `\n${state.bannerMOTD}\n`;
  }

  output += `\nReady!\n\nUser Access Verification\n\nPassword: `;
  return {
    success: true,
    output,
    requiresPassword: true,
    passwordPrompt: 'Password: ',
    passwordContext: 'vty' as const,
    newState: {
      telnetAuthenticated: false,
      awaitingPassword: true,
      passwordContext: 'vty' as const
    }
  };
}

function handleSshConnect(state: SwitchState, _language: 'tr' | 'en', requestedUser?: string): CommandResult {
  const existingSessions = Array.isArray(state.sshSessions) ? state.sshSessions : [];
  const nextSourceIndex = existingSessions.length;
  const user = requestedUser || state.sshLastUser || state.hostname || 'admin';
  const source = `vty${nextSourceIndex}`;

  // SSH authentication always starts in user mode - enable password required to go to privileged
  const initialMode = 'user';

  let output = '';
  if (state.bannerLogin) {
    output += `${state.bannerLogin}\n`;
  }
  if (state.bannerMOTD) {
    output += `\n${state.bannerMOTD}\n\n`;
  } else {
    output += '\n';
  }
  output += 'Password: ';
  return {
    success: true,
    output,
    passwordPrompt: 'Password: ',
    passwordContext: 'vty' as const,
    newState: {
      telnetAuthenticated: false,
      awaitingPassword: true,
      passwordContext: 'vty' as const,
      currentMode: initialMode,
      sshLastUser: user,
      sshLastSource: source,
    }
  };
}

/**
 * Handle the "Configuring from terminal, memory, or network [terminal]?" prompt
 * that follows the bare "configure" command.
 */
function handleConfigSourceInput(_state: SwitchState, input: string, language: 'tr' | 'en'): CommandResult {
  const answer = input.trim().toLowerCase();

  if (answer === 'terminal' || answer === '') {
    return {
      success: true,
      newState: {
        currentMode: 'config',
        awaitingConfigSource: false
      }
    };
  }

  if (answer === 'memory' || answer === 'network') {
    return {
      success: true,
      output: language === 'tr'
        ? `% ${answer === 'memory' ? 'Bellekten' : 'Ağdan'} yapılandırma yükleme desteklenmiyor.\n`
        : `% Configuration from ${answer} is not supported.\n`,
      newState: {
        awaitingConfigSource: false
      }
    };
  }

  // Invalid option - re-ask the prompt
  return {
    success: true,
    output: language === 'tr'
      ? '% Geçersiz seçenek. terminal, memory veya network girin.\nConfiguring from terminal, memory, or network [terminal]? '
      : '% Invalid option. Enter terminal, memory, or network.\nConfiguring from terminal, memory, or network [terminal]? ',
    newState: {
      awaitingConfigSource: true
    }
  };
}

function handlePasswordInput(state: SwitchState, password: string, language: 'tr' | 'en'): CommandResult {
  if (state.passwordContext === 'enable') {
    // Check if enable password is configured
    const hasEnablePassword = !!(state.security.enableSecret || state.security.enablePassword);

    if (!hasEnablePassword) {
      return {
        success: false,
        error: language === 'tr' ? '% Parola ayarlanmamış' : '% No password set',
        newState: {
          awaitingPassword: false,
          passwordContext: undefined
        }
      };
    }

    let validPassword = false;

    // Check enable secret (MD5 encrypted)
    if (state.security.enableSecret) {
      const storedSecret = state.security.enableSecret;
      // If stored secret is already encrypted (starts with $1$), re-encrypt with the same salt
      // so the hashes can be compared deterministically.
      if (storedSecret.startsWith('$1$')) {
        validPassword = verifyMd5Password(password, storedSecret);
      } else {
        // Legacy: plain text comparison
        validPassword = password === storedSecret;
      }
    }
    // Check enable password (Type 7 encrypted or plain text)
    else if (state.security.enablePassword) {
      const storedPassword = state.security.enablePassword;
      // Compare against plain or Type 7 encrypted forms. Type 7 hashing is
      // deterministic, so re-encrypting the input matches regardless of whether
      // the stored value is plaintext or was encrypted by service password-encryption.
      validPassword =
        password === storedPassword ||
        encryptType7Password(password) === storedPassword;
    }

    if (validPassword) {
      let output = '';
      // Display exec banner when entering privileged EXEC mode
      if (state.bannerExec) {
        output = `\n${state.bannerExec}\n`;
      }
      if (state.bannerMOTD) {
        output += `\n${state.bannerMOTD}\n\n`;
      }
      return {
        success: true,
        output,
        newState: {
          currentMode: 'privileged',
          awaitingPassword: false,
          passwordContext: undefined
        }
      };
    } else {
      return {
        success: false,
        error: language === 'tr' ? '% Erişim reddedildi' : '% Access denied',
        newState: {
          awaitingPassword: true,
          passwordContext: 'enable'
        }
      };
    }
  }

  if (state.passwordContext === 'console') {
    const storedConsole = state.security.consoleLine.password;
    const validPassword =
      password === storedConsole ||
      encryptType7Password(password) === storedConsole;
    if (validPassword) {
      let output = '';
      if (state.bannerMOTD) {
        output = `\n${state.bannerMOTD}\n\n`;
      }
      const prompt = getPrompt(state);
      output += prompt;
      return {
        success: true,
        output,
        newState: {
          consoleAuthenticated: true,
          awaitingPassword: false,
          passwordContext: undefined
        }
      };
    } else {
      return {
        success: false,
        error: language === 'tr' ? '% Erişim reddedildi' : '% Access denied',
        newState: {
          awaitingPassword: true,
          passwordContext: 'console'
        }
      };
    }
  }

  if (state.passwordContext === 'vty') {
    const useLocalLogin = !!state.security?.vtyLines?.loginLocal;
    const configuredPassword = state.security.vtyLines.password || '';
    const rawUsers = state.security?.users;
    const configuredUsers: { username: string; password: string; privilege: number }[] = Array.isArray(rawUsers) ? rawUsers : Object.values(rawUsers || {});
    const sshUsername = state.sshLastUser || '';
    const matchedUser = configuredUsers.find(user => user.username.toLowerCase() === sshUsername.toLowerCase());
    const validPassword = useLocalLogin
      ? !!matchedUser && String(matchedUser.password || '') === password
      : password === configuredPassword || encryptType7Password(password) === configuredPassword;
    if (validPassword) {
      const sessionUser = state.sshLastUser || state.hostname || 'admin';
      const sessionSource = state.sshLastSource || 'vty0';
      const existingSessions = Array.isArray(state.sshSessions) ? state.sshSessions : [];
      const nextSessions = [
        ...existingSessions.filter((session) => session.source !== sessionSource),
        { user: sessionUser, source: sessionSource, state: 'established' }
      ];
      let output = '';
      if (state.bannerMOTD) {
        output = `\n${state.bannerMOTD}\n\n`;
      }
      const prompt = getPrompt(state);
      output += prompt;
      return {
        success: true,
        output,
        newState: {
          telnetAuthenticated: true,
          awaitingPassword: false,
          passwordContext: undefined,
          sshSessions: nextSessions,
          sshLastUser: sessionUser,
          sshLastSource: sessionSource,
        }
      };
    } else {
      return {
        success: false,
        error: language === 'tr' ? '% Erişim reddedildi' : '% Access denied',
        newState: {
          awaitingPassword: true,
          passwordContext: 'vty'
        }
      };
    }
  }

  return {
    success: false,
    error: CLI_ERRORS.badPasswords,
    newState: {
      awaitingPassword: true,
      passwordContext: state.passwordContext
    }
  };
}

function handleFtpSessionCommand(
  state: SwitchState,
  input: string,
  _language: 'tr' | 'en',
  ctx: { devices?: CanvasDevice[]; connections?: CanvasConnection[]; deviceStates?: Map<string, SwitchState>; sourceDeviceId?: string }
): CommandResult {
  const session = state.ftpSession;
  if (!session) return { success: false, error: CLI_ERRORS.unknown };
  const target = session.targetDeviceId ? ctx.devices?.find(d => d.id === session.targetDeviceId) : findDeviceByHost(ctx, session.host);
  const targetState = session.targetDeviceId ? ctx.deviceStates?.get(session.targetDeviceId) : target ? ctx.deviceStates?.get(target.id) : undefined;
  const ftp = targetState?.services?.ftp;
  const cmd = input.trim();
  const lower = cmd.toLowerCase();

  if (session.stage === 'username') {
    const username = cmd || 'anonymous';
    if (ftp?.anonymousAccess && username.toLowerCase() === 'anonymous') {
      return {
        success: true,
        output: `Password: \nWelcome to FTP server ${session.host}\nftp> `,
        newState: { ftpSession: { ...session, stage: 'ready', username, targetDeviceId: target?.id } }
      };
    }
    return {
      success: true,
      output: 'Password: ',
      newState: { ftpSession: { ...session, stage: 'password', username, targetDeviceId: target?.id } }
    };
  }

  if (session.stage === 'password') {
    const valid = !!ftp && (cmd === (ftp.password || '') || (ftp.anonymousAccess && (session.username || '').toLowerCase() === 'anonymous'));
    if (!valid) {
      return {
        success: false,
        output: '\nLogin failed.\nName required.\nftp> ',
        newState: { ftpSession: undefined }
      };
    }
    return {
      success: true,
      output: `\nConnected to ${session.host}\nftp> `,
      newState: { ftpSession: { ...session, stage: 'ready', targetDeviceId: target?.id } }
    };
  }

  const files = Array.isArray(ftp?.files) ? [...ftp.files] : [];
  if (lower === 'quit' || lower === 'bye' || lower === 'exit') {
    return { success: true, output: '\n221 Goodbye.\n', newState: { ftpSession: undefined } };
  }
  if (lower === 'help' || lower === '?') {
    return { success: true, output: 'Commands: ls, dir, get <file>, put <file>, delete <file>, quit\nftp> ' };
  }
  if (lower === 'ls' || lower === 'dir') {
    const list = files.length
      ? files.map(file => `${file.name.padEnd(18)} ${formatBytes(file.size)}`).join('\n')
      : '(empty)';
    return { success: true, output: `\n${list}\nftp> ` };
  }
  const getMatch = cmd.match(/^(get|recv|mget)\s+(\S+)$/i);
  if (getMatch) {
    const file = files.find(entry => entry.name.toLowerCase() === getMatch[2].toLowerCase());
    if (!file) return { success: false, output: '550 File not found.\nftp> ' };
    return { success: true, output: `\n150 Opening BINARY mode data connection for ${file.name} (${formatBytes(file.size)})\n226 Transfer complete.\nftp> ` };
  }
  const putMatch = cmd.match(/^(put|send|mput)\s+(\S+)$/i);
  if (putMatch) {
    const nextFiles = [...files, { name: putMatch[2], size: 1024, modifiedAt: new Date().toISOString() }];
    if (targetState && target) {
      const updatedDeviceStates = new Map(ctx.deviceStates || []);
      updatedDeviceStates.set(target.id, {
        ...targetState,
        services: {
          ...targetState.services,
          ftp: {
            ...targetState.services?.ftp,
            enabled: !!targetState.services?.ftp?.enabled,
            files: nextFiles
          }
        }
      });
      return { success: true, output: `\n150 Opening BINARY mode data connection for ${putMatch[2]}\n226 Transfer complete.\nftp> `, deviceStates: updatedDeviceStates };
    }
    return { success: true, output: `\n150 Opening BINARY mode data connection for ${putMatch[2]}\n226 Transfer complete.\nftp> ` };
  }
  return { success: true, output: `\n200 Command okay.\nftp> ` };
}

function handleMailSessionCommand(
  state: SwitchState,
  input: string,
  _language: 'tr' | 'en',
  ctx: { devices?: CanvasDevice[]; connections?: CanvasConnection[]; deviceStates?: Map<string, SwitchState>; sourceDeviceId?: string }
): CommandResult {
  const session = state.mailSession;
  if (!session) return { success: false, error: CLI_ERRORS.unknown };
  const target = session.targetDeviceId ? ctx.devices?.find(d => d.id === session.targetDeviceId) : findDeviceByHost(ctx, session.domain || session.address);
  const targetState = session.targetDeviceId ? ctx.deviceStates?.get(session.targetDeviceId) : target ? ctx.deviceStates?.get(target.id) : undefined;
  const mail = targetState?.services?.mail;
  const cmd = input.trim();
  const lower = cmd.toLowerCase();

  if (session.stage === 'password') {
    const valid = !!mail && (!mail.password || cmd === mail.password);
    if (!valid) {
      return { success: false, output: '\nAuthentication failed.\n', newState: { mailSession: undefined } };
    }
    return { success: true, output: `\nMailbox opened for ${session.address}\nmail> `, newState: { mailSession: { ...session, stage: 'ready', targetDeviceId: target?.id } } };
  }

  if (lower === 'quit' || lower === 'exit') return { success: true, output: '\n221 Closing mailbox.\n', newState: { mailSession: undefined } };
  if (lower === 'inbox') {
    const inbox = Array.isArray(mail?.inbox) ? mail.inbox : [];
    const list = inbox.length
      ? inbox.map((msg, idx) => `${idx + 1}. From: ${msg.from} | Subject: ${msg.subject}`).join('\n')
      : '(inbox empty)';
    return { success: true, output: `\n${list}\nmail> ` };
  }
  const sendMatch = cmd.match(/^send\s+(\S+)\s+(.+)$/i);
  if (sendMatch) {
    const recipient = sendMatch[1];
    const subject = sendMatch[2];
    const timestamp = new Date().toISOString();
    const delivered = ctx.devices?.map(device => ({ device, state: ctx.deviceStates?.get(device.id) })).find(entry => {
      const mail = entry.state?.services?.mail;
      if (!mail?.enabled) return false;
      const reqUser = recipient.split('@')[0];
      const reqDomain = recipient.split('@')[1] || recipient;
      if (mail.username === reqUser && mail.domain === reqDomain) return true;
      const isIpMatch = entry.device.ip === reqDomain || Object.values(entry.state?.ports || {}).some((p: { ipAddress?: string }) => p.ipAddress === reqDomain);
      const isNameMatch = entry.device.name === reqUser || entry.state?.hostname === reqUser;
      return isIpMatch && isNameMatch;
    });
    if (delivered?.device && delivered.state) {
      let currentInbox = delivered.state.services?.mail?.inbox || [];
      if (typeof window !== 'undefined') {
        try {
          const storedInbox = secureStorage.getItem(`mail_inbox_${delivered.device.id}`);
          if (storedInbox) currentInbox = JSON.parse(storedInbox);
        } catch { /* storage error */ }
      }
      const inbox = [{ from: session.address, subject, body: subject, timestamp }, ...currentInbox];
      if (typeof window !== 'undefined') secureStorage.setItem(`mail_inbox_${delivered.device.id}`, JSON.stringify(inbox));

      const sourceMail = state.services?.mail;
      let currentSent = sourceMail?.sent || [];
      if (ctx.sourceDeviceId && typeof window !== 'undefined') {
        try {
          const storedSent = secureStorage.getItem(`mail_sent_${ctx.sourceDeviceId}`);
          if (storedSent) currentSent = JSON.parse(storedSent);
        } catch { /* storage error */ }
      }
      const sent = [{ to: recipient, subject, body: subject, timestamp }, ...currentSent];
      if (ctx.sourceDeviceId && typeof window !== 'undefined') secureStorage.setItem(`mail_sent_${ctx.sourceDeviceId}`, JSON.stringify(sent));

      const updated = new Map(ctx.deviceStates || []);
      // Update recipient's inbox
      updated.set(delivered.device.id, { ...delivered.state, services: { ...delivered.state.services, mail: { ...delivered.state.services?.mail, enabled: !!delivered.state.services?.mail?.enabled, inbox } } });
      // Update sender's sent box
      const newSenderState = { ...state, services: { ...state.services, mail: { ...state.services?.mail, enabled: !!state.services?.mail?.enabled, sent } } };
      if (ctx.sourceDeviceId) {
        updated.set(ctx.sourceDeviceId, newSenderState);
      }
      return { success: true, output: '\n250 Message accepted for delivery.\nmail> ', deviceStates: updated, newState: newSenderState };
    }
    return { success: false, output: '\n550 Recipient mailbox unavailable.\nmail> ' };
  }
  return { success: true, output: '\nCommands: inbox, send <to> <subject>, quit\nmail> ' };
}

// Import encryption functions
import { verifyMd5Password, encryptType7Password } from './crypto';
import { CLI_ERRORS } from './core/cliErrors';

export {
  handleConsoleConnect,
  handleTelnetConnect,
  handleSshConnect,
  handleConfigSourceInput,
  handlePasswordInput,
  handleFtpSessionCommand,
  handleMailSessionCommand
};