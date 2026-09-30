export interface PolicyRule {
  protocol: 'TCP' | 'UDP' | 'ICMP';
  srcPortRange?: [number, number]; // inclusive
  dstPortRange?: [number, number];
  action: 'ALLOW' | 'DROP';
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

  /**
   * Returns true if the packet is permitted according to the configured rules.
   */
  isAllowed(protocol: 'TCP' | 'UDP' | 'ICMP', srcPort: number, dstPort: number): boolean {
    for (const rule of this.rules) {
      if (rule.protocol !== protocol) continue;
      if (rule.srcPortRange) {
        const [min, max] = rule.srcPortRange;
        if (srcPort < min || srcPort > max) continue;
      }
      if (rule.dstPortRange) {
        const [min, max] = rule.dstPortRange;
        if (dstPort < min || dstPort > max) continue;
      }
      return rule.action === 'ALLOW';
    }
    // No matching rule → allow by default
    return true;
  }
}
