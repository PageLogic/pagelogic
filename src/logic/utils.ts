import * as acorn from 'acorn';
import * as es from 'estree';
import * as dom from '../source/dom';

function domLoc(ref: dom.Node) {
  return {
    start: ref.loc.i1,
    end: ref.loc.i2,
    loc: {
      source: ref.loc.source,
      start: ref.loc.start,
      end: ref.loc.end
    }
  };
}

export function acornLoc(ref: acorn.Node) {
  const ret = {
    start: ref.start,
    end: ref.end,
    loc: ref.loc,
    range: ref.range,
  };
  return ret;
}

export function esLoc(ref: es.Node) {
  const ret = {
    loc: ref.loc,
    range: ref.range,
  };
  return ret;
}

export function object(ref: dom.Node): acorn.ObjectExpression {
  return {
    type: 'ObjectExpression',
    properties: [],
    ...domLoc(ref),
  };
}

export function property(key: string, val: acorn.Expression, ref: dom.Node): acorn.Property {
  return {
    type: 'Property',
    method: false,
    shorthand: false,
    computed: false,
    key: identifier(key, ref),
    value: val,
    kind: 'init',
    ...domLoc(ref),
  };
}

export function identifier(key: string, ref: dom.Node): acorn.Identifier {
  return {
    type: 'Identifier',
    name: key,
    ...domLoc(ref),
  };
}

export function esIdentifier(key: string, ref: es.Node): es.Identifier {
  return {
    type: 'Identifier',
    name: key,
    ...esLoc(ref),
  };
}

export function array(ref: dom.Node): acorn.ArrayExpression {
  return {
    type: 'ArrayExpression',
    elements: [],
    ...domLoc(ref),
  };
}

export function literal(value: string | number, ref: dom.Node): acorn.Literal {
  return {
    type: 'Literal',
    value,
    ...domLoc(ref),
  };
}

export function fnExpression(exp: acorn.Literal | acorn.Expression, ref: dom.Node): acorn.FunctionExpression {
  return {
    type: 'FunctionExpression',
    expression: false,
    generator: false,
    async: false,
    params: [],
    body: {
      type: 'BlockStatement',
      body: [
        {
          type: 'ReturnStatement',
          argument: exp,
          ...domLoc(ref),
        }
      ],
      ...domLoc(ref),
    },
    ...domLoc(ref),
  };
}

export function call(callee: acorn.Expression, args: acorn.Expression[], ref: dom.Node): acorn.CallExpression {
  return {
    type: 'CallExpression',
    callee,
    arguments: args,
    optional: false,
    ...domLoc(ref)
  };
}
