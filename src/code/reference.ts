import estraverse from "estraverse";
import * as es from "estree";
import { OUTER_KEY, RESERVED_PASSIVE_PREFIX, VALUE_KEY } from "../runtime/core/context";
import { CodeScope, CodeValue } from "./logic";
import { CodeError } from "./types";
import { identifier, literal } from "./utils";
import { ROOT_MEMBERS, SCOPE_MEMBERS } from "../runtime/web/scope";

export function qualifyIdentifiers(
  key: string | null, body: es.Node, references: Set<string>, locals?: Set<string>
): es.Node {
  const scopes: Array<{ isFunction: boolean, ids: Set<string> }> = [];

  function enterScope(isFunction: boolean, locals?: Set<string>) {
    scopes.push({ isFunction: isFunction, ids: locals ?? new Set() });
  }

  function leaveScope() {
    scopes.pop();
  }

  function addLocalId(id: string, isVar: boolean) {
    let scope;
    for (let i = scopes.length - 1; i >= 0; i--) {
      if (!isVar || scopes[i].isFunction) {
        scope = scopes[i];
        break;
      }
    }
    scope?.ids.add(id);
  }

  function isLocalId(id: string): boolean {
    for (let i = scopes.length - 1; i >= 0; i--) {
      if (scopes[i].ids.has(id)) {
        return true;
      }
    }
    return false;
  }

  function addPotentialReference(node: es.Node) {
    const parts = [];
    while (node && node.type === 'MemberExpression') {
      if (
        node.property.type !== 'Identifier' ||
        node.property.name.startsWith(RESERVED_PASSIVE_PREFIX)
      ) {
        return;
      }
      parts.unshift(node.property.name);
      node = node.object;
    }
    if (node.type === 'ThisExpression' && parts.length > 0) {
      references.add(parts.join('.'));
    }
  }

  // https://github.com/estools/estraverse
  const stack: es.Node[] = [];
  const ret = estraverse.replace(body, {
    enter: (node, parent) => {
      // console.log(`${'  '.repeat(stack.length)}${node.type} {`);
      const parentParent = (stack.length > 1 ? stack[stack.length - 2] : null);
      stack.push(node);

      if (node.type === 'Identifier') {
        if (parent?.type === 'MemberExpression' && node === parent.property) {
          addPotentialReference(parent);
          return;
        }
        if (isLocalId(node.name)) {
          return;
        }
        if (parent?.type === 'VariableDeclarator') {
          let isVar = true;
          if (parentParent?.type === 'VariableDeclaration') {
            isVar = (parentParent.kind === 'var');
          }
          addLocalId(node.name, isVar);
          return;
        }
        if (parent?.type === 'Property' && parent.key === node) {
          return;
        }
        //TODO: exclude function parameters?
        if (
          !node.name.startsWith(RESERVED_PASSIVE_PREFIX)
        ) {
          references.add(node.name);
        }
        let obj: es.Node;
        if (!key || node.name !== key) {
          obj = { type: 'ThisExpression' };
        } else {
          obj = {
            type: 'MemberExpression',
            computed: false,
            optional: false,
            object: { type: 'ThisExpression' },
            property: { type: 'Identifier', name: OUTER_KEY }
          };
        }
        return {
          type: 'MemberExpression',
          computed: false,
          optional: false,
          object: obj,
          property: node
        }
      } else if (node.type === 'BlockStatement') {
        if (stack.length == 1) {
          enterScope(true, locals);
        } else {
          enterScope(false);
        }
      } else if (
        node.type === 'WhileStatement' ||
        node.type === 'DoWhileStatement' ||
        node.type === 'ForStatement' ||
        node.type === 'ForInStatement' ||
        node.type === 'ForOfStatement'
      ) {
        enterScope(false);
      } else if (
        node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression'
      ) {
        if (node.type !== 'ArrowFunctionExpression') {
          if (node.id && node.id.type === 'Identifier') {
            addLocalId(node.id.name, true);
          }
        }
        enterScope(true);
        node.params.forEach(p => {
          if (p.type === 'Identifier') {
            addLocalId(p.name, true);
          }
          //TODO: other possible function parameter types
        });
      }
    },

    leave: (node, parent) => {
      stack.pop();
      // console.log(`${'  '.repeat(stack.length)}}`);

      if (node.type === 'BlockStatement') {
        leaveScope();
      } else if (
        node.type === 'WhileStatement' ||
        node.type === 'DoWhileStatement' ||
        node.type === 'ForStatement' ||
        node.type === 'ForInStatement' ||
        node.type === 'ForOfStatement'
      ) {
        leaveScope();
      } else if (
        node.type === 'FunctionDeclaration'
        //TODO: FunctionExpression | ArrowFunctionExpression
      ) {
        leaveScope();
      }
    }
  });

  return ret;
}

export function validateValueRef(
  errors: CodeError[], scope: CodeScope,
  refParts: string[], v: CodeValue
): 'invalid' | 'noref' | 'ref' {
  let i, value: CodeValue | undefined;
  for (i = 0; i < refParts.length; i++) {
    const part = refParts[i];
    const ret = lookup(scope, part);
    if (typeof ret === "boolean") {
      // it's a scope method
      return 'noref';
    }
    if (ret.type === 'scope') {
      scope = ret.target as CodeScope;
    } else if (ret.type === 'value') {
      value = ret.target as CodeValue;
      refParts.splice(i + 1);
      break;
    } else {
      break;
    }
  }
  // if we exausted the chain, it leads to either a scope or a value
  if (i >= refParts.length) {
    // if it's a value, generate the reference
    return value ? 'ref' : 'invalid';
  }
  // if we stopped before the end, it's ok as long as we found a value
  if (value) {
    // generate its reference
    return 'ref';
  }
  errors.push({
    type: 'error',
    msg: `invalid reference "${refParts.join('.')}"`,
    loc: v.node.loc || undefined
  });
  return 'invalid';
}

function lookup(scope: CodeScope | null, key: string
): {
  type: 'scope' | 'value', target: CodeScope | CodeValue | null
} | boolean {
  while (scope) {
    const value = getScopeValue(scope, key);
    if (value) {
      return { type: 'value', target: value };
    }
    if (SCOPE_MEMBERS[key]) {
      return true;
    }
    if (!scope.parent && ROOT_MEMBERS[key]) {
      return true;
    }
    for (const child of scope?.children || []) {
      if (child.name === key) {
        return { type: 'scope', target: child };
      }
    }
    scope = scope.parent;
  }
  return { type: 'value', target: null };
}

function getScopeValue(scope: CodeScope, key: string): CodeValue | null {
  return scope.values[key] || null;
}

export function compileValueRef(
  refParts: string[], v: CodeValue, name: string
): es.FunctionExpression {
  const parts = refParts.slice();
  const argument = parts.pop()!;
  if (argument === name) {
    parts.push(OUTER_KEY);
  }
  parts.push(VALUE_KEY);

  function chain(i: number, rootObj: es.Expression): es.MemberExpression {
    return {
      type: "MemberExpression",
      computed: false,
      optional: false,
      object: i > 0 ? chain(i - 1, rootObj) : rootObj,
      property: identifier(parts[i], v.node)
    };
  }

  const dst: es.FunctionExpression = {
    type: "FunctionExpression",
    id: null,
    params: [],
    body: {
      type: "BlockStatement",
      body: [{
        type: "ReturnStatement",
        argument: {
          type: "CallExpression",
          optional: false,
          callee: chain(parts.length - 1, { type: "ThisExpression" }),
          arguments: [literal(argument, v.node) as any]
        }
      }]
    }
  };
  return dst;
}
