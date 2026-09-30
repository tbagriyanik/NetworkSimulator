/**
 * YANG 1.1 AST Lexer & Parser implementation.
 * Replaces Regex-based string matching with a formal Tokenizer, AST Node Parser, and Schema Resolver.
 */

export type YangTokenType = 'IDENTIFIER' | 'STRING' | 'LBRACE' | 'RBRACE' | 'SEMICOLON' | 'EOF';

export interface YangToken {
  type: YangTokenType;
  value: string;
  line: number;
  col: number;
}

export interface YangAstNode {
  keyword: string;
  argument?: string;
  substatements: YangAstNode[];
}

export interface YangLeaf {
  name: string;
  type: string;
  config: boolean;
  description?: string;
  mandatory?: boolean;
  defaultValue?: string;
}

export interface YangContainer {
  name: string;
  leaves: YangLeaf[];
  description?: string;
  containers?: YangContainer[];
}

export interface YangList {
  name: string;
  key: string;
  leaves: YangLeaf[];
  description?: string;
}

export interface YangRpc {
  name: string;
  inputLeaves: YangLeaf[];
  outputLeaves: YangLeaf[];
  description?: string;
}

export interface YangTypedef {
  name: string;
  baseType: string;
  description?: string;
}

export interface YangModule {
  name: string;
  namespace: string;
  prefix?: string;
  leaves: YangLeaf[];
  containers?: YangContainer[];
  lists?: YangList[];
  rpcs?: YangRpc[];
  typedefs?: YangTypedef[];
  ast?: YangAstNode;
}

/**
 * Tokenize YANG source code into lexer tokens.
 */
export function tokenizeYang(source: string): YangToken[] {
  const tokens: YangToken[] = [];
  let pos = 0;
  let line = 1;
  let col = 1;

  while (pos < source.length) {
    const char = source[pos];

    // Skip whitespace & track line/col
    if (/\s/.test(char)) {
      if (char === '\n') {
        line++;
        col = 1;
      } else {
        col++;
      }
      pos++;
      continue;
    }

    // Skip single-line comments // ...
    if (char === '/' && source[pos + 1] === '/') {
      pos += 2;
      col += 2;
      while (pos < source.length && source[pos] !== '\n') {
        pos++;
        col++;
      }
      continue;
    }

    // Skip multi-line comments /* ... */
    if (char === '/' && source[pos + 1] === '*') {
      pos += 2;
      col += 2;
      while (pos < source.length && !(source[pos] === '*' && source[pos + 1] === '/')) {
        if (source[pos] === '\n') {
          line++;
          col = 1;
        } else {
          col++;
        }
        pos++;
      }
      pos += 2;
      col += 2;
      continue;
    }

    // Structural punctuation
    if (char === '{') {
      tokens.push({ type: 'LBRACE', value: '{', line, col });
      pos++;
      col++;
      continue;
    }
    if (char === '}') {
      tokens.push({ type: 'RBRACE', value: '}', line, col });
      pos++;
      col++;
      continue;
    }
    if (char === ';') {
      tokens.push({ type: 'SEMICOLON', value: ';', line, col });
      pos++;
      col++;
      continue;
    }

    // Quoted string (double or single quotes)
    if (char === '"' || char === "'") {
      const quoteChar = char;
      const startLine = line;
      const startCol = col;
      pos++;
      col++;
      let strVal = '';
      while (pos < source.length && source[pos] !== quoteChar) {
        if (source[pos] === '\\' && pos + 1 < source.length) {
          strVal += source[pos + 1];
          pos += 2;
          col += 2;
        } else {
          if (source[pos] === '\n') {
            line++;
            col = 1;
          } else {
            col++;
          }
          strVal += source[pos];
          pos++;
        }
      }
      if (pos < source.length && source[pos] === quoteChar) {
        pos++;
        col++;
      }
      tokens.push({ type: 'STRING', value: strVal, line: startLine, col: startCol });
      continue;
    }

    // Identifier / Keyword / Unquoted String
    let idVal = '';
    const startLine = line;
    const startCol = col;
    while (pos < source.length && !/\s|[{};"']/.test(source[pos])) {
      idVal += source[pos];
      pos++;
      col++;
    }
    if (idVal) {
      tokens.push({ type: 'IDENTIFIER', value: idVal, line: startLine, col: startCol });
    }
  }

  tokens.push({ type: 'EOF', value: '', line, col });
  return tokens;
}

/**
 * Parses YANG token stream into an Abstract Syntax Tree (AST).
 */
export function parseYangTokens(tokens: YangToken[]): YangAstNode[] {
  let index = 0;

  function parseSubstatements(): YangAstNode[] {
    const nodes: YangAstNode[] = [];

    while (index < tokens.length && tokens[index].type !== 'RBRACE' && tokens[index].type !== 'EOF') {
      const keywordToken = tokens[index];
      if (keywordToken.type !== 'IDENTIFIER' && keywordToken.type !== 'STRING') {
        index++;
        continue;
      }

      const keyword = keywordToken.value;
      index++;

      let argument: string | undefined;

      // Check if next token is an argument (IDENTIFIER or STRING) before semicolon or block brace
      if (index < tokens.length && tokens[index].type !== 'LBRACE' && tokens[index].type !== 'SEMICOLON' && tokens[index].type !== 'RBRACE') {
        argument = tokens[index].value;
        index++;
      }

      let substatements: YangAstNode[] = [];

      if (index < tokens.length && tokens[index].type === 'LBRACE') {
        index++; // consume '{'
        substatements = parseSubstatements();
        if (index < tokens.length && tokens[index].type === 'RBRACE') {
          index++; // consume '}'
        }
      } else if (index < tokens.length && tokens[index].type === 'SEMICOLON') {
        index++; // consume ';'
      }

      nodes.push({ keyword, argument, substatements });
    }

    return nodes;
  }

  return parseSubstatements();
}

function findSubstatementValue(node: YangAstNode, keyword: string): string | undefined {
  const match = node.substatements.find(s => s.keyword === keyword);
  return match?.argument;
}

function parseLeafNode(leafNode: YangAstNode): YangLeaf {
  const name = leafNode.argument || 'unnamed';
  const typeNode = leafNode.substatements.find(s => s.keyword === 'type');
  const type = typeNode?.argument || 'string';
  const configVal = findSubstatementValue(leafNode, 'config');
  const config = configVal !== 'false';
  const description = findSubstatementValue(leafNode, 'description');
  const mandatoryVal = findSubstatementValue(leafNode, 'mandatory');
  const mandatory = mandatoryVal === 'true';
  const defaultValue = findSubstatementValue(leafNode, 'default');

  return { name, type, config, description, mandatory, defaultValue };
}

function parseContainerNode(containerNode: YangAstNode): YangContainer {
  const name = containerNode.argument || 'unnamed';
  const description = findSubstatementValue(containerNode, 'description');

  const leaves = containerNode.substatements
    .filter(s => s.keyword === 'leaf')
    .map(parseLeafNode);

  const nestedContainers = containerNode.substatements
    .filter(s => s.keyword === 'container')
    .map(parseContainerNode);

  return { name, leaves, description, containers: nestedContainers.length > 0 ? nestedContainers : undefined };
}

function parseListNode(listNode: YangAstNode): YangList {
  const name = listNode.argument || 'unnamed';
  const key = findSubstatementValue(listNode, 'key') || 'id';
  const description = findSubstatementValue(listNode, 'description');

  const leaves = listNode.substatements
    .filter(s => s.keyword === 'leaf')
    .map(parseLeafNode);

  return { name, key, leaves, description };
}

function parseRpcNode(rpcNode: YangAstNode): YangRpc {
  const name = rpcNode.argument || 'unnamed';
  const description = findSubstatementValue(rpcNode, 'description');

  const inputBlock = rpcNode.substatements.find(s => s.keyword === 'input');
  const outputBlock = rpcNode.substatements.find(s => s.keyword === 'output');

  const inputLeaves = inputBlock
    ? inputBlock.substatements.filter(s => s.keyword === 'leaf').map(parseLeafNode)
    : [];

  const outputLeaves = outputBlock
    ? outputBlock.substatements.filter(s => s.keyword === 'leaf').map(parseLeafNode)
    : [];

  return { name, inputLeaves, outputLeaves, description };
}

/**
 * Builds a formal YANG Module Schema representation from an AST node tree.
 */
export function buildYangSchemaFromAst(astNodes: YangAstNode[]): YangModule {
  const moduleNode = astNodes.find(n => n.keyword === 'module' || n.keyword === 'submodule');
  if (!moduleNode || !moduleNode.argument) {
    throw new Error('Invalid YANG source: missing module declaration');
  }

  const name = moduleNode.argument;
  const namespace = findSubstatementValue(moduleNode, 'namespace');
  const prefix = findSubstatementValue(moduleNode, 'prefix');

  if (!namespace) {
    throw new Error('Invalid YANG module: module and namespace are required');
  }

  // Top-level declarations
  const leaves = moduleNode.substatements.filter(s => s.keyword === 'leaf').map(parseLeafNode);
  const containers = moduleNode.substatements.filter(s => s.keyword === 'container').map(parseContainerNode);
  const lists = moduleNode.substatements.filter(s => s.keyword === 'list').map(parseListNode);
  const rpcs = moduleNode.substatements.filter(s => s.keyword === 'rpc').map(parseRpcNode);

  const typedefs: YangTypedef[] = moduleNode.substatements
    .filter(s => s.keyword === 'typedef')
    .map(tNode => ({
      name: tNode.argument || '',
      baseType: findSubstatementValue(tNode, 'type') || 'string',
      description: findSubstatementValue(tNode, 'description'),
    }));

  return {
    name,
    namespace,
    prefix,
    leaves,
    containers,
    lists,
    rpcs,
    typedefs: typedefs.length > 0 ? typedefs : undefined,
    ast: moduleNode,
  };
}

/**
 * Full AST-based YANG 1.1 parser.
 * Replaces legacy regex/string matchers with formal lexing, AST parsing, and schema generation.
 */
export function parseYangModule(source: string): YangModule {
  const tokens = tokenizeYang(source);
  const ast = parseYangTokens(tokens);
  return buildYangSchemaFromAst(ast);
}
