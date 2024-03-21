import estraverse from 'estraverse';
import * as es from 'estree';
import { Logic, SCOPE_NAME_KEY } from './logic';
import { Source } from './types';
import * as utils from './utils';
import { generate } from 'escodegen';
import { Attribute } from './html';

export function genRefFunctions(
  source: Source, scope: Logic,
  exp: es.Expression
): es.FunctionExpression[] {
  const refs = new Map<string, es.FunctionExpression>();
  const stack: es.Node[] = [];
  estraverse.traverse(exp, {
    enter: (node) => {
      stack.push(node);
      if (node.type === 'Identifier' || node.type === 'Literal') {
        maybeGenRefFunction(source, scope, node, stack, refs);
      }
    },

    leave: () => {
      stack.pop();
    },
  });
  return [...refs.values()];
}

function maybeGenRefFunction(
  source: Source, scope: Logic,
  node: es.Identifier | es.Literal, stack: es.Node[],
  refs: Map<string, es.FunctionExpression>
) {
  const chain = lookupRefChain(stack);
  if (!chain || chain.length < 2 || chain[0] !== 'this') {
    return;
  }
  chain.shift(); // remove initial 'this'
  const refExp = getRefExpression(chain, scope);
  if (!refExp) {
    return;
  }
  const refFn = utils.esFunction(refExp);
  refs.set(chain.join('.'), refFn);
}

// =============================================================================
// Logic reference path
// =============================================================================

function getRefExpression(
  chain: string[], scope: Logic
): es.CallExpression | null {

  function lookup(scope: Logic, key: string): Logic | Attribute | null {
    for (const child of scope.cc) {
      const a = child.vv[SCOPE_NAME_KEY];
      const n = typeof a?.value === 'string' ? a.value : null;
      if (n === key) {
        return child;
      }
    }
    for (const name of Reflect.ownKeys(scope.vv) as string[]) {
      if (name === key) {
        return scope.vv[name];
      }
    }
    if (scope.parent) {
      return lookup(scope.parent, key);
    }
    return null;
  }

  let ret: es.Expression = {
    type: 'ThisExpression',
  };

  for (const i in chain) {
    const key = chain[i];
    const item = lookup(scope, key);
    if (item instanceof Logic) {
      scope = item;
      ret = utils.esMember(ret, { type: 'Identifier', name: key });
      continue;
    }
    if (item) {
      ret = utils.esMember(ret, { type: 'Identifier', name: '$value' });
      ret = utils.esCall(ret, [{ type: 'Literal', value: key }]);
      return ret;
    }
    break;
  }

  //TODO: error: reference not found
  return null;
}

// =============================================================================
// AST reference path
// =============================================================================

function lookupRefChain(stack: es.Node[]): string[] | null {
  const exp = lookupRefStart(stack);
  const chain = exp && getRefChain(exp);
  if (!chain || chain.length < 2 || chain[0] !== 'this') {
    return null;
  }
  // console.log(JSON.stringify(exp, (key, val) => {
  //   return [
  //     'start', 'end', 'loc', 'range', 'computed', 'optional', 'raw'
  //   ].includes(key) ? undefined : val;
  // }));
  return chain;
}

function lookupRefStart(stack: es.Node[]): es.MemberExpression | null {
  let exp: es.MemberExpression | null = null;
  let i = stack.length - 2;
  while (i >= 0) {
    const n = stack[i];
    const p = (i > 0 ? stack[i - 1] : null);
    if (n.type === 'MemberExpression' && p?.type !== 'MemberExpression') {
      exp = n;
      break;
    }
    i--;
  }
  return exp;
}

function getRefChain(exp: es.MemberExpression): string[] {
  const sb: string[] = [];
  function f(e: es.MemberExpression) {
    if (e.object.type === 'MemberExpression') {
      f(e.object);
    } else if (e.object.type === 'ThisExpression') {
      sb.push('this');
    } else {
      //TODO: err?
    }
    if (e.property.type === 'Identifier') {
      sb.push(e.property.name);
    } else if (e.property.type === 'Literal' && typeof e.property.value === 'string') {
      sb.push(e.property.value);
    } else {
      //TODO: err?
    }
  }
  f(exp);
  return sb;
}
