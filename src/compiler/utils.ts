import * as acorn from 'acorn';
import { Node } from '../html/dom';

export function astLocation(n: Node) {
  return {
    start: n.loc.i1,
    end: n.loc.i2,
    loc: n.loc
  };
}

export function astIdentifier(name: string, n: Node): acorn.Identifier {
  return {
    type: 'Identifier',
    name,
    ...astLocation(n)
  };
}

export function astProperty(key: string, e: acorn.Expression, n: Node): acorn.Property {
  return {
    type: 'Property',
    key: astIdentifier(key, n),
    value: e,
    kind: 'init',
    method: false,
    computed: false,
    shorthand: false,
    ...astLocation(n)
  };
}

export function astArrayExpression(n: Node): acorn.ArrayExpression {
  return {
    type: 'ArrayExpression',
    elements: [],
    ...astLocation(n)
  };
}

export function astObjectExpression(n: Node): acorn.ObjectExpression {
  return {
    type: 'ObjectExpression',
    properties: [],
    ...astLocation(n)
  };
}

export function astLiteral(value: string | number, n: Node): acorn.Literal {
  return {
    type: 'Literal',
    value,
    ...astLocation(n)
  };
}
