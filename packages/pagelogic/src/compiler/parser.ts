import * as acorn from 'acorn';
import * as html from './html';
import * as types from './types';

const SKIP_CONTENT_TAGS = new Set(['SCRIPT', 'CODE']);
const ATOMIC_TEXT_TAGS = new Set(['STYLE', 'TITLE']);
// const NON_NORMALIZED_TAGS = { PRE: true, SCRIPT: true };
const SLASH = '/'.charCodeAt(0);
const DASH = '-'.charCodeAt(0);
const GT = '>'.charCodeAt(0);
const EQ = '='.charCodeAt(0);
const QUOT = '"'.charCodeAt(0);
const APOS = '\''.charCodeAt(0);
const DOLLAR = '$'.charCodeAt(0);
const LEXP = '${';
const REXP = '}'.charCodeAt(0);

export function parse(s: string, fname: string, errors: types.Error[]): html.Document {
  const src = new Source(s, fname);
  const ret = new html.Document(src.loc(0, s.length));
  try {
    parseNodes(ret, src, 0, errors);
  } catch (ignored) {
    // nop: errors are added to returned doc, throws are used
    // to abort parsing when an irrecoverable error is found
  }
  return ret;
}

function parseNodes(p: html.Element, src: Source, i: number, errors: types.Error[]) {
  const s = src.s;
  let i1 = i; let i2; let closure; let i3 = i; let i4; let closetag = null;
  while ((i2 = s.indexOf('<', i1)) >= 0) {
    i4 = i2;
    i1 = i2 + 1;
    (closure = s.charCodeAt(i1) === SLASH) && i1++;
    if ((i2 = skipName(src, i1)) > i1) {
      if (i4 > i3) {
        parseText(p, src, i3, i4, errors);
      }
      if (closure) {
        const name = s.substring(i1, i2).toUpperCase();
        i2 = skipBlanks(s, i2);
        if (s.charCodeAt(i2) === GT) {
          if (name === p.name) {
            i1 = i2 + 1;
            closetag = name;
            break;
          } else {
            errors.push(new types.Error(
              'error',
              `Found </${name}> instead of </${p.name}>`,
              src.loc(i1, i1)
            ));
            throw Error();
          }
        } else {
          errors.push(new types.Error(
            'error',
            `Unterminated close tag ${name}`,
            src.loc(i1, i1)
          ));
          throw Error();
        }
        i1 = i2;
      } else {
        i1 = parseElement(p, src, i1, i2, errors);
      }
      i3 = i1;
    } else if (!closure && (i2 = skipComment(p, src, i1, errors)) > i1) {
      if (i4 > i3) {
        parseText(p, src, i3, i4, errors);
      }
      if (s.charCodeAt(i1 + 3) != DASH) {
        // if it doesn't start with `<!---`, store the comment
        const a = i1 + 3; const b = i2 - 3;
        new html.Comment(
          p.doc, p, s.substring(a, b),
          src.loc(a, b)
        );
      }
      i3 = i1 = i2;
    }
  }
  if (!p.name.startsWith('#') && closetag !== p.name) {
    errors.push(new types.Error(
      'error',
      `expected </${p.name}>`,
      src.loc(i1, i1)
    ));
    throw new Error();
  }
  return i1;
}

function parseElement(p: html.Element, src: Source, i1: number, i2: number, errors: types.Error[]): number {
  const s = src.s;
  const e = new html.Element(
    p.doc, p, s.substring(i1, i2),
    src.loc(i1 - 1, i2)
  );
  i1 = parseAttributes(e, src, i2, errors);
  i1 = skipBlanks(s, i1);
  let selfclose = false;
  if ((selfclose = (s.charCodeAt(i1) === SLASH))) {
    i1++;
  }
  if (s.charCodeAt(i1) != GT) {
    errors.push(new types.Error(
      'error',
      `Unterminated tag ${e.name}`,
      src.loc(i1, i1)
    ));
    throw new Error();
  }
  i1++;
  if (!selfclose && !html.VOID_ELEMENTS.has(e.name)) {
    if (SKIP_CONTENT_TAGS.has(e.name)) {
      const res = skipContent(p, e.name, src, i1, errors);
      if (!res) {
        errors.push(new types.Error(
          'error',
          `Unterminated tag ${e.name}`,
          src.loc(i1, i1)
        ));
        throw new Error();
      }
      if (res.i0 > i1) {
        new html.Text(
          e.doc, e, s.substring(i1, res.i0),
          src.loc(i1, res.i0)
        );
      }
      i1 = res.i2;
    } else {
      i1 = parseNodes(e, src, i1, errors);
    }
  }
  e.loc.end = src.pos(i1);
  e.loc.i2 = i1;
  return i1;
}

function parseAttributes(e: html.Element, src: Source, i2: number, errors: types.Error[]) {
  const s = src.s;
  let i1 = skipBlanksAndComments(s, i2);
  while ((i2 = skipName(src, i1, true)) > i1) {
    const name = s.substring(i1, i2);
    if (hasAttribute(e, name)) {
      errors.push(new types.Error(
        'error',
        `duplicated attribute "${name}"`,
        src.loc(i1, i1)
      ));
      throw Error();
    }
    const a = new html.Attribute(
      e.doc, e, name, '',
      src.loc(i1, i2)
    );
    i1 = skipBlanksAndComments(s, i2);
    if (s.charCodeAt(i1) === EQ) {
      i1 = skipBlanksAndComments(s, i1 + 1);
      const quote = s.charCodeAt(i1);
      a.valueLoc = src.loc(i1, i1);
      if (a && (quote === QUOT || quote === APOS)) {
        i1 = parseValue(e, a, src, i1 + 1, quote, String.fromCharCode(quote), errors);
      } else if (
        a &&
        s.startsWith(LEXP, i1)
      ) {
        i1 = parseValue(e, a, src, i1 + LEXP.length, quote, '}', errors);
      } else {
        // we don't support unquoted attribute values
        errors.push(new types.Error(
          'error',
          'Missing attribute value',
          src.loc(i1, i1)
        ));
        throw new Error();
      }
    }
    i1 = skipBlanksAndComments(s, i1);
  }
  return i1;
}

function parseValue(
  p: html.Element, a: html.Attribute, src: Source, i1: number,
  quote: number, term: string, errors: types.Error[]
) {
  if (quote !== DOLLAR) {
    return parseLiteralValue(p, a, src, i1, quote, term, errors);
  } else {
    return parseExpressionValue(p, a, src, i1, errors);
  }
}

function parseLiteralValue(
  p: html.Element, a: html.Attribute, src: Source, i1: number,
  quote: number, term: string, errors: types.Error[]
) {
  const s = src.s;
  let i2 = s.indexOf(term, i1);
  if (i2 < 0) {
    errors.push(new types.Error(
      'error',
      'Unterminated attribute value',
      src.loc(i1, i1)
    ));
    throw new Error();
  } else {
    a.quote = String.fromCharCode(quote);
    let j = i2 + term.length;
    while (j < s.length && s.charCodeAt(j) === term.charCodeAt(0)) {
      i2++; j++;
    }
    a.value = html.unescapeText(s.substring(i1, i2));
    i1 = i2 + term.length;
    a.loc.end = src.pos(i1);
    a.loc.i2 = i1;
    a.valueLoc!.end = src.pos(i1);
    a.valueLoc!.i2 = i1;
  }
  return i1;
}

function parseExpressionValue(
  p: html.Element, a: html.Attribute, src: Source, i1: number, errors: types.Error[]
) {
  const s = src.s;
  const exp = parseExpression(p, src, i1, errors);
  let i2 = exp.end;
  i2 = skipBlanks(s, i2);
  if (i2 >= s.length || s.charCodeAt(i2) !== REXP) {
    errors.push(new types.Error(
      'error',
      'unterminated attribute expression',
      src.loc(i1, i1)
    ));
    // abort parsing
    throw new Error();
  }
  i2++;
  a.value = exp;
  a.loc.end = src.pos(i2);
  a.loc.i2 = i2;
  a.valueLoc!.end = src.pos(i2);
  a.valueLoc!.i2 = i2;
  return i2;
}

function parseText(p: html.Element, src: Source, i1: number, i2: number, errors: types.Error[]) {
  if (ATOMIC_TEXT_TAGS.has(p.name)) {
    parseAtomicText(p, src, i1, i2, errors);
  } else {
    parseSplittableText(p, src, i1, i2, errors);
  }
}

function parseAtomicText(p: html.Element, src: Source, i1: number, i2: number, errors: types.Error[]) {
  const s = src.s;
  const k = s.indexOf(LEXP, i1);
  if (k < 0 || k >= i2) {
    // static text
    new html.Text(p.doc, p, s.substring(i1, i2), src.loc(i1, i2));
    return;
  }
  const exps = new Array<acorn.Expression>();
  for (let j1 = i1; j1 < i2;) {
    let j2 = s.indexOf(LEXP, j1);
    if (j2 < 0 || j2 >= i2) {
      exps.push({
        type: 'Literal',
        value: s.substring(j1, i2),
        start: j1,
        end: i2,
        loc: src.loc(j1, i2)
      });
      break;
    }
    if (j2 > j1) {
      exps.push({
        type: 'Literal',
        value: s.substring(j1, j2),
        start: j1,
        end: j2,
        loc: src.loc(j1, j2)
      });
      j1 = j2;
    }
    j2 += LEXP.length;
    j1 = skipBlanks(s, j2);
    if (j1 >= i2 || s.charCodeAt(j1) === REXP) {
      errors.push(new types.Error(
        'error',
        'invalid expression',
        src.loc(j2, j2)
      ));
      break;
    }
    const exp = parseExpression(p, src, j1, errors);
    j1 = exp.end;
    j1 = skipBlanks(s, j1);
    if (s.charCodeAt(j1) === REXP) {
      j1++;
    }
    exps.push(exp);
  }
  // ensure first expression is a string literal so '+' will mean concatenation
  if (exps[0].type !== 'Literal' || typeof exps[0].value !== 'string') {
    exps.unshift({
      type: 'Literal',
      value: '',
      start: i1,
      end: i1,
      loc: src.loc(i1, i1)
    });
  }
  if (exps.length === 1) {
    new html.Text(p.doc, p, exps[0], src.loc(i1, i2));
    return;
  }
  function concat(n: number): acorn.BinaryExpression {
    const start = (n > 1 ? exps[n - 1].start : exps[0].start);
    const end = exps[n].end;
    return {
      type: 'BinaryExpression',
      operator: '+',
      left: (n > 1 ? concat(n - 1) : exps[0]),
      right: exps[n],
      start,
      end,
      loc: src.loc(start, end)
    };
  }
  const exp = concat(exps.length - 1);
  new html.Text(p.doc, p, exp, src.loc(i1, i2));
}

function parseSplittableText(p: html.Element, src: Source, i1: number, i2: number, errors: types.Error[]) {
  const s = src.s;
  for (let j1 = i1; j1 < i2;) {
    let j2 = s.indexOf(LEXP, j1);
    if (j2 < 0 || j2 >= i2) {
      new html.Text(p.doc, p, s.substring(j1, i2), src.loc(j1, i2));
      break;
    }
    if (j2 > j1) {
      new html.Text(p.doc, p, s.substring(j1, j2), src.loc(j1, j2));
      j1 = j2;
    }
    const j0 = j2;
    j2 += LEXP.length;
    j1 = skipBlanks(s, j2);
    if (j1 >= i2 || s.charCodeAt(j1) === REXP) {
      errors.push(new types.Error(
        'error',
        'invalid expression',
        src.loc(j2, j2)
      ));
      break;
    }
    const exp = parseExpression(p, src, j1, errors);
    j1 = exp.end;
    j1 = skipBlanks(s, j1);
    if (s.charCodeAt(j1) === REXP) {
      j1++;
    }
    new html.Text(p.doc, p, exp, src.loc(j0, j1));
  }
}

function parseExpression(p: html.Element, src: Source, i1: number, errors: types.Error[]) {
  const s = src.s;
  try {
    const exp = acorn.parseExpressionAt(s, i1, {
      ecmaVersion: 'latest',
      sourceType: 'script',
      locations: true,
      sourceFile: src.fname
    });
    return exp;
  } catch (err) {
    errors.push(new types.Error(
      'error',
      `${err}`,
      src.loc(i1, i1)
    ));
    // abort parsing
    throw new Error();
  }
}

// =============================================================================
// utils
// =============================================================================

function hasAttribute(e: html.Element, name: string): boolean {
  for (const a of e.attributes) {
    if (a.name === name) {
      return true;
    }
  }
  return false;
}

function skipBlanks(s: string, i: number) {
  while (i < s.length) {
    if (s.charCodeAt(i) > 32) {
      break;
    }
    i++;
  }
  return i;
}

function skipBlanksAndComments(s: string, i: number) {
  i = skipBlanks(s, i);
  while (i < s.length) {
    if (s.startsWith('//', i)) {
      const i2 = s.indexOf('\n', i + 2);
      if (i2 < 0) {
        return s.length;
      }
      i = i2 + 1;
    } else if (s.startsWith('/*', i)) {
      const i2 = s.indexOf('*/', i + 2);
      if (i2 < 0) {
        return s.length;
      }
      i = i2 + 2;
    } else {
      return i;
    }
    i = skipBlanks(s, i);
  }
  return i;
}

function skipContent(p: html.Element, tag: string, src: Source, i1: number, errors: types.Error[]) {
  const s = src.s;
  let i2;
  while ((i2 = s.indexOf('</', i1)) >= 0) {
    const i0 = i2;
    i1 = i2 + 2;
    i2 = skipName(src, i1);
    if (i2 > i1) {
      if (s.substring(i1, i2).toUpperCase() === tag) {
        i2 = skipBlanks(s, i2);
        if (s.charCodeAt(i2) != GT) {
          errors.push(new types.Error(
            'error',
            'Unterminated close tag',
            src.loc(i1, i1)
          ));
          throw new Error();
        }
        i2++;
        // break;
        return { i0, i2 };
      }
    }
    i1 = i2;
  }
  return null;
}

function skipName(src: Source, i: number, acceptsDots = false) {
  const s = src.s;
  while (i < s.length) {
    const code = s.charCodeAt(i);
    if ((code < 'a'.charCodeAt(0) || code > 'z'.charCodeAt(0)) &&
      (code < 'A'.charCodeAt(0) || code > 'Z'.charCodeAt(0)) &&
      (code < '0'.charCodeAt(0) || code > '9'.charCodeAt(0)) &&
      code != DASH && code != '_'.charCodeAt(0) &&
      (!acceptsDots || code != '.'.charCodeAt(0)) &&
      code != ':'.charCodeAt(0)) {
      break;
    }
    i++;
  }
  return i;
}

function skipComment(p: html.Element, src: Source, i1: number, errors: types.Error[]) {
  const s = src.s;
  if (s.charCodeAt(i1) === '!'.charCodeAt(0) &&
    s.charCodeAt(i1 + 1) === DASH &&
    s.charCodeAt(i1 + 2) === DASH) {
    if ((i1 = s.indexOf('-->', i1 + 3)) < 0) {
      errors.push(new types.Error(
        'error',
        'Unterminated comment',
        src.loc(i1, i1)
      ));
      throw new Error();
    }
    i1 += 3;
  }
  return i1;
}

export class Source {
  s: string;
  fname?: string;
  linestarts: number[];

  constructor(s: string, fname?: string) {
    this.s = s = s.trimEnd();
    this.fname = fname;
    this.linestarts = [0];
    for (let i1 = 0, i2; (i2 = s.indexOf('\n', i1)) >= 0; i1 = i2 + 1) {
      this.linestarts.push(i2 + 1);
    }
  }

  pos(n: number): acorn.Position {
    const max = this.linestarts.length - 1;
    let i1 = 0, i2 = max;
    while (i1 < i2) {
      const j = i1 + Math.floor((i2 - i1) / 2);
      const n1 = this.linestarts[j];
      const n2 = j < max ? this.linestarts[j + 1] : n1;
      if (n >= n1 && n < n2) {
        i1 = i2 = j;
      } else if (n >= n2) {
        i1 = j + 1;
      } else if (n < n1) {
        i2 = j;
      }
    }
    return {
      // 1-based
      line: i1 + 1,
      // 0-based
      column: n - this.linestarts[i1]
    };
  }

  loc(i1: number, i2: number): html.SourceLocation {
    return {
      source: this.fname,
      start: this.pos(i1),
      end: this.pos(i2),
      i1, i2
    };
  }

  get lineCount() {
    return this.linestarts.length;
  }
}