import * as acorn from 'acorn';
import * as html from './html';

export function normalizeText(s?: string): string | undefined {
  return s?.split(/\n\s+/).join('\n').split(/\s{2,}/).join(' ');
}

export function normalizeSpace(s?: string): string | undefined {
  return s?.split(/\s+/).join(' ');
}

export class Stack<T> extends Array<T> {

  constructor(a?: T[]) {
    super();
    a && this.push(...a);
  }

  peek(): T | undefined {
    if (this.length < 1) {
      return undefined;
    }
    return this[this.length - 1];
  }
}

export function regexMap(
  re: RegExp, s: string, cb: (match: RegExpExecArray) => string
): string {
  const _re = re.flags.indexOf('g') >= 0 ? re : new RegExp(re, 'g' + re.flags);
  const sb = new Array<string>();
  let i = 0;
  for (let match; (match = _re.exec(s)) !== null; i = match.index + match[0].length) {
    match.index > i && sb.push(s.substring(i, match.index));
    sb.push(cb(match));
  }
  s.length > i && sb.push(s.substring(i));
  return sb.join('');
}

export function hyphenToCamel(s: string) {
  return regexMap(/([-.].)/g, s, match =>
    s.substring(match.index + 1, match.index + 2).toUpperCase()
  );
}

export function camelToHyphen(s: string) {
  return regexMap(/([0-9a-z][A-Z])/g, s, match =>
    s.charAt(match.index) + '-' + s.charAt(match.index + 1).toLowerCase()
  );
}

function loc(ref: html.Node) {
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

export function object(ref: html.Node): acorn.ObjectExpression {
  return {
    type: 'ObjectExpression',
    properties: [],
    ...loc(ref),
  };
}

export function property(key: string, val: acorn.Expression, ref: html.Node): acorn.Property {
  return {
    type: 'Property',
    method: false,
    shorthand: false,
    computed: false,
    key: identifier(key, ref),
    value: val,
    kind: 'init',
    ...loc(ref),
  };
}

export function identifier(key: string, ref: html.Node): acorn.Identifier {
  return {
    type: 'Identifier',
    name: key,
    ...loc(ref),
  };
}

export function array(ref: html.Node): acorn.ArrayExpression {
  return {
    type: 'ArrayExpression',
    elements: [],
    ...loc(ref),
  };
}

export function literal(value: string | number, ref: html.Node): acorn.Literal {
  return {
    type: 'Literal',
    value,
    ...loc(ref),
  };
}

export function fnExpression(exp: acorn.Literal | acorn.Expression, ref: html.Node): acorn.FunctionExpression {
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
          ...loc(ref),
        }
      ],
      ...loc(ref),
    },
    ...loc(ref),
  };
}
