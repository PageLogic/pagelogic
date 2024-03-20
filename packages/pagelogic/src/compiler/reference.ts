import estraverse from 'estraverse';
import * as es from 'estree';
import { Logic } from './logic';
import { Source } from './types';
import { Stack } from './utils';

export function genRefFunctions(
  source: Source, scope: Logic, logicStack: Stack<Logic>,
  exp: es.Expression
): es.FunctionExpression[] {
  const refs = new Map<string, es.FunctionExpression>();
  const stack: es.Node[] = [];
  estraverse.traverse(exp, {
    enter: (node) => {
      stack.push(node);
      if (node.type === 'Identifier' || node.type === 'Literal') {
        maybeGenRefFunction(source, scope, logicStack, node, stack, refs);
      }
    },

    leave: () => {
      stack.pop();
    },
  });
  return [...refs.values()];
}

function maybeGenRefFunction(
  source: Source, scope: Logic, logicStack: Stack<Logic>,
  node: es.Identifier | es.Literal, stack: es.Node[],
  refs: Map<string, es.FunctionExpression>
) {
  const chain = lookupRefChain(stack);
  if (!chain) {
    return;
  }
  //TODO
}

// =============================================================================
// Logic reference path
// =============================================================================

function lookupScope(
  chain: string[], scope: Logic, logicStack: Stack<Logic>
): Logic | null {
  console.log('lookupRefExpression', chain.join('.'));//tempdebug
  //TODO
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
  //   return ['start', 'end', 'loc', 'range', 'computed', 'optional', 'raw'].includes(key) ? undefined : val;
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
