import { describe, expect, it } from 'vitest';
import { tokenizeYang, parseYangTokens, parseYangModule } from '@/lib/network/yangParser';

describe('YANG 1.1 Formal Lexer & AST Parser Engine', () => {
  it('tokenizes YANG source code into lexer tokens correctly', () => {
    const source = `module test-module { namespace "urn:test"; prefix "t"; leaf id { type string; } }`;
    const tokens = tokenizeYang(source);

    expect(tokens.length).toBeGreaterThan(10);
    expect(tokens[0]).toEqual({ type: 'IDENTIFIER', value: 'module', line: 1, col: 1 });
    expect(tokens[1]).toEqual({ type: 'IDENTIFIER', value: 'test-module', line: 1, col: 8 });
    expect(tokens[2]).toEqual({ type: 'LBRACE', value: '{', line: 1, col: 20 });
    expect(tokens.find(t => t.type === 'STRING')?.value).toBe('urn:test');
  });

  it('builds an Abstract Syntax Tree (AST) node tree from tokens', () => {
    const source = `
      module interface-config {
        namespace "urn:ietf:params:xml:ns:yang:ietf-interfaces";
        prefix "if";

        container interfaces {
          leaf enabled {
            type boolean;
            default true;
          }
        }
      }
    `;
    const tokens = tokenizeYang(source);
    const astNodes = parseYangTokens(tokens);

    expect(astNodes).toHaveLength(1);
    const moduleNode = astNodes[0];
    expect(moduleNode.keyword).toBe('module');
    expect(moduleNode.argument).toBe('interface-config');

    const containerNode = moduleNode.substatements.find(s => s.keyword === 'container');
    expect(containerNode).toBeDefined();
    expect(containerNode?.argument).toBe('interfaces');

    const leafNode = containerNode?.substatements.find(s => s.keyword === 'leaf');
    expect(leafNode?.argument).toBe('enabled');
    expect(leafNode?.substatements.find(s => s.keyword === 'type')?.argument).toBe('boolean');
    expect(leafNode?.substatements.find(s => s.keyword === 'default')?.argument).toBe('true');
  });

  it('parses typedefs, nested containers, lists with keys, and RPCs into schema', () => {
    const source = `
      module router-services {
        namespace "urn:enterprise:params:xml:ns:yang:router";
        prefix "rt";

        typedef vlan-id-type {
          type uint16;
          description "VLAN identifier integer";
        }

        container system {
          leaf hostname { type string; }
          container logging {
            leaf level { type string; }
          }
        }

        list route {
          key "destination";
          leaf destination { type string; }
          leaf nexthop { type string; }
        }

        rpc clear-counters {
          input {
            leaf interface-name { type string; }
          }
          output {
            leaf packets-cleared { type string; }
          }
        }
      }
    `;

    const moduleSchema = parseYangModule(source);

    expect(moduleSchema.name).toBe('router-services');
    expect(moduleSchema.namespace).toBe('urn:enterprise:params:xml:ns:yang:router');
    expect(moduleSchema.prefix).toBe('rt');

    // Typedef check
    expect(moduleSchema.typedefs).toBeDefined();
    expect(moduleSchema.typedefs?.[0]).toEqual({
      name: 'vlan-id-type',
      baseType: 'uint16',
      description: 'VLAN identifier integer',
    });

    // Container & Nested Container check
    expect(moduleSchema.containers).toHaveLength(1);
    const sysContainer = moduleSchema.containers?.[0];
    expect(sysContainer?.name).toBe('system');
    expect(sysContainer?.leaves).toHaveLength(1);
    expect(sysContainer?.containers).toHaveLength(1);
    expect(sysContainer?.containers?.[0].name).toBe('logging');

    // List check
    expect(moduleSchema.lists).toHaveLength(1);
    expect(moduleSchema.lists?.[0].key).toBe('destination');
    expect(moduleSchema.lists?.[0].leaves).toHaveLength(2);

    // RPC check
    expect(moduleSchema.rpcs).toHaveLength(1);
    expect(moduleSchema.rpcs?.[0].inputLeaves[0].name).toBe('interface-name');
    expect(moduleSchema.rpcs?.[0].outputLeaves[0].name).toBe('packets-cleared');

    // AST verification
    expect(moduleSchema.ast).toBeDefined();
    expect(moduleSchema.ast?.keyword).toBe('module');
  });
});
