import estraverse from 'estraverse';
import * as acorn from 'acorn';
import * as es from 'estree';
import { Source } from './types';
import { Logic } from './logic';

// https://astexplorer.net
export function qualifyReferences(
  source: Source, scope: Logic,
  key: string, exp: es.Expression
): acorn.Expression {
  if (exp.type === 'Literal') {
    return exp as acorn.Expression;
  }
  const stack: es.Node[] = [];
  // https://github.com/estools/estraverse
  const ret = estraverse.replace(exp, {
    enter: (node, parent) => {
      stack.push(node);
      if (node.type === 'Identifier') {
        if (isInDeclaration(node, stack)) {
          // this ID is getting declared
        } else if (!isLocalAccess(node, stack)) {
          if (!isQualified(node, parent)) {
            // unqualified remote ID reference: prefix with `this.`
            return {
              type: 'MemberExpression',
              object:  { type: 'ThisExpression', ...loc(node) },
              property: node,
              computed: false,
              optional: false,
              ...loc(node)
            } as es.MemberExpression;
          }
        }
      }
    },

    leave: () => {
      stack.pop();
    },
  });
  return ret as acorn.Expression;
}

function loc(node: es.Node) {
  const anode = node as acorn.Node;
  return {
    range: [anode.start, anode.end],
    loc: node.loc
  };
}

function isQualified(id: es.Identifier, parent: es.Node | null) {
  return parent?.type === 'MemberExpression' && parent.property === id;
}

function isInDeclaration(id: es.Identifier, stack: es.Node[]) {
  if (stack.length < 2) {
    return false;
  }
  const parent = stack[stack.length - 2];
  if ([
    'VariableDeclarator',
    'Property',
    'CatchClause'
  ].includes(parent.type)) {
    return true;
  }
  if (
    parent.type === 'FunctionDeclaration' ||
    parent.type === 'FunctionExpression' ||
    parent.type === 'ArrowFunctionExpression'
  ) {
    return parent.params.includes(id);
  }
  if (
    parent.type === 'AssignmentPattern'
  ) {
    return parent.left === id;
  }
  return false;
}

function isLocalAccess(id: es.Identifier, stack: es.Node[]) {
  for (let i = stack.length - 2; i >= 0; i--) {
    const parent = stack[i];
    if (
      parent.type === 'FunctionDeclaration' ||
      parent.type === 'FunctionExpression' ||
      parent.type === 'ArrowFunctionExpression'
    ) {
      if (isInFunctionParams(id.name, parent.params)) {
        return true;
      }
    }
    if (
      parent.type === 'BlockStatement'
    ) {
      if (isInBlockDeclarations(id.name, parent.body)) {
        return true;
      }
    }
  }
  return false;
}

function isInFunctionParams(name: string, params: es.Pattern[]) {
  for (const p of params) {
    switch (p.type) {
    case 'Identifier':
      if (p.name === name) {
        return true;
      }
      break;
    case 'AssignmentPattern':
      if (p.left.type === 'Identifier' && p.left.name === name) {
        return true;
      }
      break;
    }
  }
  return false;
}

function isInBlockDeclarations(name: string, body: es.Statement[]) {
  for (const s of body) {
    if (s.type === 'VariableDeclaration') {
      for (const d of s.declarations) {
        if (d.id.type === 'Identifier') {
          if (d.id.name === name) {
            return true;
          }
        }
      }
    }
  }
  return false;
}
