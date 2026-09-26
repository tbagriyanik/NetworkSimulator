import { SwitchState } from '@/lib/network/types';
import { matchIpWithWildcard } from '@/lib/network/connectivity.utils';

function incrementAclCounter(state: SwitchState, aclId: string, ruleIndex: number): void {
  if (!state.aclMatchCounters) state.aclMatchCounters = {};
  if (!state.aclMatchCounters[aclId]) state.aclMatchCounters[aclId] = {};
  state.aclMatchCounters[aclId][ruleIndex] = (state.aclMatchCounters[aclId][ruleIndex] || 0) + 1;
}

/**
 * Evaluate ACL (Standard or Extended)
 */
export function evaluateAcl(
  aclId: string,
  state: SwitchState,
  sourceIp: string,
  targetIp: string,
  protocol: string = 'any',
  port: string = 'any'
): 'permit' | 'deny' | 'none' {
  const rules = state.accessLists?.[aclId];
  if (!rules || rules.length === 0) return 'none';

  const aclNum = parseInt(aclId);
  const aclType = state.namedAclTypes?.[aclId];
  // Named ACLs and extended numbered ACLs (100-199, 2000-2699 modern)
  const isExtended = aclType ? (aclType === 'extended') : ((aclNum >= 100 && aclNum <= 199) || (aclNum >= 2000 && aclNum <= 2699) || isNaN(aclNum));

  for (let ruleIdx = 0; ruleIdx < rules.length; ruleIdx++) {
    const rule = rules[ruleIdx];
    // Extract rule body: skip optional sequence number prefix
    const seqMatch = rule.match(/^\d+\s+(.+)$/);
    const ruleContent = seqMatch ? seqMatch[1] : rule;
    const parts = ruleContent.trim().split(/\s+/);
    const action = parts[0].toLowerCase() as 'permit' | 'deny';
    const body = parts.slice(1);

    if (!isExtended) {
      // Standard ACL: [permit|deny] <source> [wildcard]
      let srcIp = body[0];
      let srcWildcard = '0.0.0.0';
      if (srcIp === 'any') {
        srcIp = '0.0.0.0';
        srcWildcard = '255.255.255.255';
      } else if (srcIp === 'host') {
        srcIp = body[1];
        srcWildcard = '0.0.0.0';
      } else if (body[1] && /^\d+\./.test(body[1])) {
        srcWildcard = body[1];
      }

      if (matchIpWithWildcard(sourceIp, srcIp, srcWildcard)) {
        incrementAclCounter(state, aclId, ruleIdx);
        return action;
      }
    } else {
      // Extended ACL: [permit|deny] <protocol> <source> [src-wildcard] <destination> [dst-wildcard] [eq <port>]
      let currentIdx = 0;
      const ruleProto = body[currentIdx++]?.toLowerCase();

      // Protocol match
      if (ruleProto !== 'ip' && ruleProto !== protocol && protocol !== 'any') {
        continue;
      }

      // Match source
      let srcIp = body[currentIdx++];
      let srcWildcard = '0.0.0.0';
      if (srcIp === 'host') {
        srcIp = body[currentIdx++];
      } else if (srcIp === 'any') {
        srcIp = '0.0.0.0';
        srcWildcard = '255.255.255.255';
      } else {
        if (body[currentIdx] && /^\d+\./.test(body[currentIdx])) {
          srcWildcard = body[currentIdx++];
        }
      }

      if (!matchIpWithWildcard(sourceIp, srcIp, srcWildcard)) continue;

      // Match destination
      let dstIp = body[currentIdx++];
      let dstWildcard = '0.0.0.0';
      if (dstIp === 'host') {
        dstIp = body[currentIdx++];
      } else if (dstIp === 'any') {
        dstIp = '0.0.0.0';
        dstWildcard = '255.255.255.255';
      } else {
        if (body[currentIdx] && /^\d+\./.test(body[currentIdx])) {
          dstWildcard = body[currentIdx++];
        }
      }

      if (!matchIpWithWildcard(targetIp, dstIp, dstWildcard)) continue;

      // Match port (optional)
      if (body[currentIdx] === 'eq') {
        const rulePort = body[currentIdx + 1];
        if (port !== 'any' && port !== rulePort) continue;
      }

      incrementAclCounter(state, aclId, ruleIdx);
      return action;
    }
  }

  return 'deny'; // Implicit deny
}

/**
 * Evaluate IPv6 ACL
 */
export function evaluateIpv6Acl(
  aclId: string,
  state: SwitchState,
  sourceIp: string,
  targetIp: string,
  protocol: string = 'ipv6'
): 'permit' | 'deny' | 'none' {
  const rules = state.ipv6AccessLists?.[aclId];
  if (!rules || rules.length === 0) return 'none';

  for (let ruleIdx = 0; ruleIdx < rules.length; ruleIdx++) {
    const rule = rules[ruleIdx];
    const seqMatch = rule.match(/^\d+\s+(.+)$/);
    const ruleContent = seqMatch ? seqMatch[1] : rule;
    const parts = ruleContent.trim().split(/\s+/);
    const action = parts[0].toLowerCase() as 'permit' | 'deny';
    const ruleProto = parts[1]?.toLowerCase() || 'ipv6';

    if (ruleProto !== 'ipv6' && ruleProto !== protocol && protocol !== 'ipv6') {
      continue;
    }

    let idx = 2;
    let srcSpec = parts[idx++] || 'any';
    if (srcSpec === 'host') {
      srcSpec = parts[idx++] || '';
    }

    let dstSpec = parts[idx++] || 'any';
    if (dstSpec === 'host') {
      dstSpec = parts[idx++] || '';
    }

    const matchSpec = (addr: string, spec: string) => {
      if (!spec || spec.toLowerCase() === 'any') return true;
      const cleanSpec = spec.toLowerCase().replace(/^host\s+/, '');
      const cleanAddr = addr.toLowerCase();
      if (cleanSpec.includes('/')) {
        const prefix = cleanSpec.split('/')[0].replace(/::$/, '');
        return cleanAddr.startsWith(prefix);
      }
      return cleanAddr === cleanSpec;
    };

    if (!matchSpec(sourceIp, srcSpec)) continue;
    if (!matchSpec(targetIp, dstSpec)) continue;

    incrementAclCounter(state, aclId, ruleIdx);
    return action;
  }

  return 'deny'; // Implicit deny
}
