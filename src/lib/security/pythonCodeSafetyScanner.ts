/**
 * Python Code Safety Scanner for PC Panel Evaluator.
 * Scans python code for unsafe reflection, dynamic evaluation, and forbidden system calls.
 */

export interface PythonSafetyResult {
  isSafe: boolean;
  violations: string[];
}

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; messageTr: string; messageEn: string }> = [
  {
    pattern: /\b(eval|exec)\s*\(/i,
    messageTr: "'eval' veya 'exec' ile dinamik kod çalıştırması yasaktır.",
    messageEn: "Dynamic code execution via 'eval' or 'exec' is forbidden.",
  },
  {
    pattern: /__import__|__subclasses__|__class__/i,
    messageTr: "Yansıtma (Reflection/dunder) niteliklerine erişim kısıtlanmıştır.",
    messageEn: "Access to internal reflection/dunder attributes is restricted.",
  },
  {
    pattern: /\b(subprocess|shutil|sys)\b/i,
    messageTr: "Sistem seviyesindeki kütüphaneler ('subprocess', 'shutil', 'sys') simülasyon ortamında engellenmiştir.",
    messageEn: "System libraries ('subprocess', 'shutil', 'sys') are blocked in simulation environment.",
  },
  {
    pattern: /os\.system|os\.popen|os\.spawn/i,
    messageTr: "Doğrudan işletim sistemi komut çalıştırması yasaktır.",
    messageEn: "Direct operating system command execution is prohibited.",
  },
];

export function scanPythonCodeSafety(code: string, language: 'tr' | 'en' = 'tr'): PythonSafetyResult {
  if (!code || !code.trim()) {
    return { isSafe: true, violations: [] };
  }

  const isTr = language === 'tr';
  const violations: string[] = [];

  for (const item of FORBIDDEN_PATTERNS) {
    if (item.pattern.test(code)) {
      violations.push(isTr ? item.messageTr : item.messageEn);
    }
  }

  return {
    isSafe: violations.length === 0,
    violations,
  };
}
