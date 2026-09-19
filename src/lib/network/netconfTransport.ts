import type { SwitchState } from './types';
import type { NetconfFramePayload } from './forwarding/packetFrame';

type RuntimeState = SwitchState & { netconfSessions?: Record<string, { established: boolean; lastMessageId: string }> };

export function processNetconfFrame(state: SwitchState, source: string, request: NetconfFramePayload): { state: SwitchState; response: NetconfFramePayload; error?: string } {
  const next = state as RuntimeState;
  next.netconfSessions = { ...next.netconfSessions, [source]: { established: true, lastMessageId: request.messageId } };
  if (request.operation === 'close-session') {
    next.netconfSessions[source] = { established: false, lastMessageId: request.messageId };
    return { state: next, response: { messageId: request.messageId, operation: 'close-session' } };
  }
  if (request.operation === 'hello') return { state: next, response: { messageId: request.messageId, operation: 'hello' } };
  if (request.operation === 'edit-config' && request.data) {
    (next as SwitchState & { netconfYangData?: Record<string, unknown> }).netconfYangData = {
      ...(next as SwitchState & { netconfYangData?: Record<string, unknown> }).netconfYangData,
      ...(request.data)
    };
  }
  return { state: next, response: { messageId: request.messageId, operation: request.operation === 'edit-config' ? 'commit' : request.operation, path: request.path, data: request.data } };
}
