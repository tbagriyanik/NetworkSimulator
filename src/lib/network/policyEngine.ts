/**
 * policyEngine.ts — Stateful-less packet policy engine used by the forwarding pipeline.
 *
 * Rules are evaluated in order; the first rule whose criteria all match decides
 * the verdict. A rule with no criteria matches everything of its protocol.
 * When no rule matches, traffic is permitted (implicit permit), mirroring the
 * behaviour of an empty ACL applied to an interface.
 *
 * Supported match criteria per rule:
 *  - protocol          TCP / UDP / ICMP / IP (any IP protocol) / ANY
 *  - srcPortRange      inclusive [min, max]
 *  - dstPortRange      inclusive [min, max]
 *  - srcCidr / dstCidr IPv4 prefix in "a.b.c.d/len" form
 *  - vlanId            iki VLAN eşleşmesi (802.1Q tag / access VLAN)
 *  - interfaceId       ingress or egress port (matches either side)
 *  - direction         inbound (untrusted ingress) / outbound (trusted ingress)
 */

export type PolicyProtocol = 'TCP' | 'UDP' | 'ICMP' | 'IP' | 'ANY';
export type PolicyAction = 'ALLOW' | 'DROP';
export type PolicyDirection = 'inbound' | 'outbound' | 'unknown';

export interface PolicyRule {
  /** Optional operator-visible name (used in traces). */
  name?: string;
  protocol: PolicyProtocol;
  srcPortRange?: [number, number]; // inclusive
  dstPortRange?: [number, number];
  /** Source IPv4 prefix, e.g. "192.168.1.0/24". */
  srcCidr?: string;
  /** Destination IPv4 prefix, e.g. "0.0.0.0/0". */
  dstCidr?: string;
  vlanId?: number;
  /** Matches when the packet's ingress or egress port equals this value. */
  interfaceId?: string;
  direction?: PolicyDirection;
  action: PolicyAction;
}

export interface PolicyMatchContext {
  srcIp?: string;
  dstIp?: string;
  vlanId?: number;
  ingressPortId?: string;
  egressPortId?: string;
  direction?: PolicyDirection;
}

export interface PolicyEvaluation {
  allowed: boolean;
  /** The rule that decided the verdict, or null for the implicit permit. */
  matchedRule: PolicyRule | null;
  reason: string;
}

/** Convert an IPv4 address into its 32-bit numeric form (NaN-safe → 0). */
export function ipToLong(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) return 0;
  return parts.reduce((acc, part) => {
    const n = Number(part);
    return acc * 256 + (Number.isInteger(n) && n >= 0 && n <= 255 ? n : 0);
  }, 0);
}

/** True when `ip` falls inside the `a.b.c.d/len` prefix. Malformed input → false. */
export function cidrMatches(ip: string | undefined, cidr: string): boolean {
  if (!ip) return false;
  const [network, lenRaw] = cidr.split('/');
  if (!network) return false;
  const len = lenRaw === undefined ? 32 : Number(lenRaw);
  if (!Number.isInteger(len) || len < 0 || len > 32) return false;

  // /0 mask must not be produced by shifting (JS shifts are mod-32).
  const mask = len === 0 ? 0 : (0xffffffff << (32 - len)) >>> 0;
  const ipLong = ipToLong(ip);
  const netLong = ipToLong(network);
  if (ipLong === 0 && ip !== '0.0.0.0') return false;
  return ((ipLong & mask) >>> 0) === ((netLong & mask) >>> 0);
}

function inRange(value: number, range: [number, number]): boolean {
  const [min, max] = range;
  return value >= Math.min(min, max) && value <= Math.max(min, max);
}

/**
 * Very lightweight policy engine used by the packet pipeline.
 * Policies are evaluated in order; first match decides the result.
 * If no rule matches, traffic is allowed by default.
 */
export class PolicyEngine {
  private rules: PolicyRule[] = [];

  constructor(initialRules?: PolicyRule[]) {
    if (initialRules) this.rules = initialRules;
  }

  addRule(rule: PolicyRule): void {
    this.rules.push(rule);
  }

  setRules(rules: PolicyRule[]): void {
    this.rules = rules;
  }

  getRules(): PolicyRule[] {
    return this.rules;
  }

  clear(): void {
    this.rules = [];
  }

  /** Does this rule's criteria match the packet? */
  private matches(
    rule: PolicyRule,
    protocol: string,
    srcPort: number,
    dstPort: number,
    ctx: PolicyMatchContext
  ): boolean {
    if (rule.protocol !== 'ANY' && rule.protocol !== 'IP' && rule.protocol !== protocol) {
      return false;
    }
    if (rule.srcPortRange && !inRange(srcPort, rule.srcPortRange)) return false;
    if (rule.dstPortRange && !inRange(dstPort, rule.dstPortRange)) return false;
    if (rule.srcCidr && !cidrMatches(ctx.srcIp, rule.srcCidr)) return false;
    if (rule.dstCidr && !cidrMatches(ctx.dstIp, rule.dstCidr)) return false;
    if (rule.vlanId !== undefined && ctx.vlanId !== undefined && rule.vlanId !== ctx.vlanId) return false;
    if (rule.vlanId !== undefined && ctx.vlanId === undefined) return false;
    if (rule.interfaceId) {
      const matchesPort = ctx.ingressPortId === rule.interfaceId || ctx.egressPortId === rule.interfaceId;
      if (!matchesPort) return false;
    }
    if (rule.direction && ctx.direction !== rule.direction) return false;
    return true;
  }

  /**
   * Evaluate a packet and return the full verdict (matched rule + reason).
   */
  evaluate(
    protocol: string,
    srcPort: number,
    dstPort: number,
    ctx: PolicyMatchContext = {}
  ): PolicyEvaluation {
    for (const rule of this.rules) {
      if (!this.matches(rule, protocol, srcPort, dstPort, ctx)) continue;
      const label = rule.name ? `rule "${rule.name}"` : `rule ${rule.protocol}`;
      if (rule.action === 'ALLOW') {
        return { allowed: true, matchedRule: rule, reason: `PolicyEngine ALLOW by ${label}` };
      }
      return { allowed: false, matchedRule: rule, reason: `PolicyEngine DROP by ${label}` };
    }
    return { allowed: true, matchedRule: null, reason: 'PolicyEngine ALLOW by implicit permit' };
  }

  /**
   * Returns true if the packet is permitted according to the configured rules.
   */
  isAllowed(
    protocol: string,
    srcPort: number,
    dstPort: number,
    ctx: PolicyMatchContext = {}
  ): boolean {
    return this.evaluate(protocol, srcPort, dstPort, ctx).allowed;
  }
}
