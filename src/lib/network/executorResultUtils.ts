import type { CommandMode, CommandResult, SwitchState } from './types';

export function processCommandResult(result: CommandResult, input: string, mode: CommandMode, state: SwitchState, language: 'tr' | 'en', getSuggestions: (input: string, mode: CommandMode, state?: SwitchState) => string[]): CommandResult {
  if (!result.success && result.error && !result.requiresPassword && !result.newState?.awaitingPassword && !result.error.includes('cancelled') && !result.error.includes('Access denied') && !result.error.includes('Erişim reddedildi')) {
    const suggestions = getSuggestions(input, mode, state);
    if (suggestions.length > 0) {
      const title = language === 'tr' ? 'Tahmini Öneriler' : 'Estimated Suggestions';
      let error = result.error;
      const trIndex = error.indexOf('\n\nBunu mu demek istediniz?');
      if (trIndex !== -1) error = error.substring(0, trIndex);
      const enIndex = error.indexOf('\n\nDid you mean?');
      if (enIndex !== -1) error = error.substring(0, enIndex);
      return { ...result, error: `${error}\n\n${title}: ${suggestions.join(', ')}` };
    }
  }

  // --More-- pager: when `terminal length N` (N>0) is set, long success output
  // is truncated to N lines plus a --More-- marker; the remainder is queued in
  // `pendingPager` and served by the executor on Space/Enter/'q'.
  const pageLength = state.terminalLength ?? 0;
  if (result.success && typeof result.output === 'string' && result.output && pageLength > 0
      && !result.requiresPassword && !result.newState?.awaitingPassword) {
    const paged = paginateOutput(result.output, pageLength);
    if (!paged.complete) {
      return {
        ...result,
        output: paged.page,
        newState: { ...result.newState, pendingPager: { rest: paged.rest, length: pageLength } }
      };
    }
  }
  return result;
}

/** Splits `output` into a first page (at most `length` lines + --More--) and the rest. */
export function paginateOutput(output: string, length: number): { page: string; rest: string; complete: boolean } {
  const lines = output.split('\n');
  if (lines.length <= length) return { page: output, rest: '', complete: true };
  const head = lines.slice(0, length).join('\n');
  const rest = lines.slice(length).join('\n');
  return { page: `${head}\n--More-- `, rest, complete: false };
}

export function applyPipeFilterOutput(
  output: string,
  filter: { type: 'include' | 'exclude' | 'begin' | 'section'; query: string }
): string {
  if (!output) return '';
  const lines = output.split('\n');
  const rawQuery = filter.query.trim();
  if (!rawQuery) return output;

  // Build safe case-insensitive matcher (supports regex if valid, otherwise literal substring)
  let regex: RegExp | null = null;
  try {
    regex = new RegExp(rawQuery, 'i');
  } catch {
    regex = null;
  }
  const qLower = rawQuery.toLowerCase();
  const match = (line: string): boolean => {
    if (regex) return regex.test(line);
    return line.toLowerCase().includes(qLower);
  };

  if (filter.type === 'include') {
    return lines.filter(match).join('\n');
  }

  if (filter.type === 'exclude') {
    return lines.filter(line => !match(line)).join('\n');
  }

  if (filter.type === 'begin') {
    const idx = lines.findIndex(match);
    return idx >= 0 ? lines.slice(idx).join('\n') : '';
  }

  if (filter.type === 'section') {
    const out: string[] = [];
    let i = 0;
    while (i < lines.length) {
      if (match(lines[i])) {
        out.push(lines[i]);
        i++;
        // Capture indented sub-lines, comments, and empty lines belonging to this section
        while (i < lines.length) {
          const currentLine = lines[i];
          const isIndented = currentLine.startsWith(' ') || currentLine.startsWith('\t');
          const isDelim = currentLine.trim() === '!' || currentLine.trim() === '';
          if (isIndented || (isDelim && i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t')))) {
            out.push(currentLine);
            i++;
          } else {
            break;
          }
        }
      } else {
        i++;
      }
    }
    return out.join('\n');
  }

  return output;
}
