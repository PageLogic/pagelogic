import estraverse from 'estraverse';
import * as acorn from 'acorn';
import * as es from 'estree';
import { Source } from './types';
import { Logic } from './logic';
import { Stack } from './utils';

// https://astexplorer.net
export function qualifyReferences(
  source: Source, scope: Logic, logicStack: Stack<Logic>,
  key: string, exp: es.Expression
): acorn.Expression {
  if (exp.type === 'Literal') {
    return exp as acorn.Expression;
  }
  // const toQualify = new Array<es.Node[]>();
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
            // this unqualified remote ID is being referenced
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

function isInDeclaration(id: es.Identifier, ancestors: es.Node[]) {
  if (ancestors.length <= 1) {
    return false;
  }
  const parent = ancestors[ancestors.length - 2];
  if ([
    'VariableDeclarator',
    'ObjectExpression',
    'FunctionExpression',
    'ArrowFunctionExpression',
    'CatchClause'
  ].includes(parent.type)) {
    return true;
  }
  return false;
}

function isLocalAccess(id: es.Identifier, ancestor: es.Node[]) {
  //TODO
  return false;
}

function isQualified(id: es.Identifier, parent: es.Node | null) {
  return parent?.type === 'MemberExpression' && parent.property === id;
}
