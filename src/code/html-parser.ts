import { BinaryExpression, Expression, Position, SourceLocation, parseExpressionAt } from "acorn";
import { CodeError } from "./types";
import { HtmlAttribute, HtmlComment, HtmlDocument, HtmlElement, HtmlLocation, HtmlText } from "./html";

// http://xahlee.info/js/html5_non-closing_tag.html
export const VOID_ELEMENTS = new Set([
  'AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG', 'INPUT',
  'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR',
  // obsolete
  'COMMAND', 'KEYGEN', 'MENUITEM'
]);
export const SKIP_CONTENT_TAGS = new Set(['SCRIPT', 'CODE']);
export const ATOMIC_TEXT_TAGS = new Set(['STYLE', 'TITLE']);
// export const NON_NORMALIZED_TAGS = { PRE: true, SCRIPT: true };
const SLASH = '/'.charCodeAt(0);
const DASH = '-'.charCodeAt(0);
const GT = '>'.charCodeAt(0);
const EQ = '='.charCodeAt(0);
const QUOT = '"'.charCodeAt(0);
const APOS = "'".charCodeAt(0);
const DOLLAR = '$'.charCodeAt(0);
const LEXP = '${';
const REXP = '}'.charCodeAt(0);

export function parseHTML(s: string, fname?: string): HtmlDocument {
  const ret = new HtmlDocument(loc(s, 0, s.length, {
    source: fname,
    start: { line: 1, column: 0 },
    end: { line: 1, column: 0 }
  }, 0));
  try {
    parseNodes(ret, s, 0);
  } catch (ignored) {}
  return ret;
}

function parseNodes(p: HtmlElement, s: string, i: number) {
  var i1 = i, i2, closure, i3 = i, i4, closetag = null;
  while ((i2 = s.indexOf('<', i1)) >= 0) {
    i4 = i2;
    i1 = i2 + 1;
    (closure = s.charCodeAt(i1) === SLASH) ? i1++ : null;
    if ((i2 = skipName(s, i1)) > i1) {
      if (i4 > i3) {
        // new HtmlText(p.doc, p, s.substring(i3, i4), loc(s, i3, i4, p.loc, i));
        parseText(p, s, i, i3, i4);
      }
      if (closure) {
        var name = s.substring(i1, i2).toUpperCase();
        i2 = skipBlanks(s, i2);
        if (s.charCodeAt(i2) === GT) {
          if (name === p.name) {
            i1 = i2 + 1;
            closetag = name;
            break;
          } else {
            p.doc?.errors.push(new CodeError(
              'error',
              `Found </${name}> instead of </${p.name}>`,
              loc(s, i1, i1, p.loc, i)
            ));
            throw Error();
          }
        } else {
          p.doc?.errors.push(new CodeError(
            'error',
            `Unterminated close tag ${name}`,
            loc(s, i1, i1, p.loc, i)
          ));
          throw Error();
        }
        i1 = i2;
      } else {
        i1 = parseElement(p, s, i, i1, i2);
      }
      i3 = i1;
    } else if (!closure && (i2 = skipComment(p, i, s, i1)) > i1) {
      if (i4 > i3) {
        // new HtmlText(p.doc, p, s.substring(i3, i4), loc(s, i3, i4, p.loc, i));
        parseText(p, s, i, i3, i4);
      }
      if (s.charCodeAt(i1 + 3) != DASH) {
        // if it doesn't start with `<!---`, store the comment
        const a = i1 + 3, b = i2 - 3;
        new HtmlComment(p.doc, p, s.substring(a, b), loc(s, a, b, p.loc, i));
      }
      i3 = i1 = i2;
    }
  }
  if (!p.name.startsWith('#') && closetag !== p.name) {
    p.doc?.errors.push(new CodeError(
      'error',
      `expected </${p.name}>`,
      loc(s, i1, i1, p.loc, i)
    ));
    throw new Error();
  }
  return i1;
}

function parseElement(p: HtmlElement, s: string, i: number, i1: number, i2: number): number {
  var e = new HtmlElement(p.doc, p, s.substring(i1, i2), loc(s, i1 - 1, i2, p.loc, i));
  i1 = parseAttributes(e, s, i, i2);
  i1 = skipBlanks(s, i1);
  var selfclose = false;
  if ((selfclose = (s.charCodeAt(i1) === SLASH))) {
    i1++;
  }
  if (s.charCodeAt(i1) != GT) {
    p.doc?.errors.push(new CodeError(
      'error',
      `Unterminated tag ${e.name}`,
      loc(s, i1, i1, p.loc, i)
    ));
    throw new Error();
  }
  i1++;
  if (!selfclose && !VOID_ELEMENTS.has(e.name)) {
    if (SKIP_CONTENT_TAGS.has(e.name)) {
      var res = skipContent(p, i, e.name, s, i1);
      if (!res) {
        p.doc?.errors.push(new CodeError(
          'error',
          `Unterminated tag ${e.name}`,
          loc(s, i1, i1, p.loc, i)
        ));
        throw new Error();
      }
      if (res.i0 > i1) {
        new HtmlText(e.doc, e, s.substring(i1, res.i0), loc(s, i1, res.i0, p.loc, i));
      }
      i1 = res.i2;
    } else {
      i1 = parseNodes(e, s, i1);
    }
  }
  e.loc.end = pos(s, i1, p.loc, i);
  return i1;
}

function parseAttributes(e: HtmlElement, s: string, i: number, i2: number) {
  var i1 = skipBlanksAndComments(s, i2);
  while ((i2 = skipName(s, i1, true)) > i1) {
    var name = s.substring(i1, i2);
    if (hasAttribute(e, name)) {
      e.doc?.errors.push(new CodeError(
        'error',
        `duplicated attribute "${name}"`,
        loc(s, i1, i1, e.loc, i)
      ));
      throw Error();
    }
    let a = new HtmlAttribute(e.doc, e, name, '', loc(s, i1, i2, e.loc, i));
    i1 = skipBlanksAndComments(s, i2);
    if (s.charCodeAt(i1) === EQ) {
      i1 = skipBlanksAndComments(s, i1 + 1);
      var quote = s.charCodeAt(i1);
      if (a && (quote === QUOT || quote === APOS)) {
        i1 = parseValue(e, i, a, s, i1 + 1, quote, String.fromCharCode(quote));
      } else if (
        a
        && s.startsWith(LEXP, i1)
      ) {
        i1 = parseValue(e, i, a, s, i1 + LEXP.length, quote, '}');
      } else {
        // we don't support unquoted attribute values
        e.doc?.errors.push(new CodeError(
          'error',
          'Missing attribute value',
          loc(s, i1, i1, e.loc, i)
        ));
        throw new Error();
      }
    }
    i1 = skipBlanksAndComments(s, i1);
  };
  return i1;
}

function parseValue(
  p: HtmlElement, i: number,
  a: HtmlAttribute, s: string, i1: number,
  quote: number, term: string
) {
  if (quote !== DOLLAR) {
    return parseLiteralValue(p, i, a, s, i1, quote, term);
  } else {
    return parseExpressionValue(p, i, a, s, i1);
  }
}

function parseLiteralValue(
  p: HtmlElement, i: number,
  a: HtmlAttribute, s: string, i1: number,
  quote: number, term: string
) {
  var i2 = s.indexOf(term, i1);
  if (i2 < 0) {
    p.doc?.errors.push(new CodeError(
      'error',
      'Unterminated attribute value',
      loc(s, i1, i1, p.loc, i)
    ));
    throw new Error();
  } else {
    a.quote = String.fromCharCode(quote);
    var j = i2 + term.length;
    while (j < s.length && s.charCodeAt(j) === term.charCodeAt(0)) {
      i2++; j++;
    }
    a.value = htmlUnescape(s.substring(i1, i2));
    i1 = i2 + term.length;
    a.loc.end = pos(s, i1, p.loc, i)
  }
  return i1;
}

function parseExpressionValue(
  p: HtmlElement, i: number,
  a: HtmlAttribute, s: string, i1: number
) {
  // const exp = parseExpressionAt(s, i1, { ecmaVersion: 'latest', sourceType: 'script' });
  const exp = parseExpression(p, s, i, i1);
  // console.log(s.substring(i1));
  // console.log(JSON.stringify(exp));
  // console.log('');
  let i2 = exp.end;
  i2 = skipBlanks(s, i2);
  if (i2 >= s.length || s.charCodeAt(i2) !== REXP) {
    p.doc?.errors.push(new CodeError(
      'error',
      `unterminated attribute expression`,
      loc(s, i1, i1, p.loc, i)
    ));
    // abort parsing
    throw new Error();
  }
  a.value = exp;
  return i2 + 1;
}

function parseText(p: HtmlElement, s: string, i: number, i1: number, i2: number) {
  if (ATOMIC_TEXT_TAGS.has(p.name)) {
    parseAtomicText(p, s, i, i1, i2);
  } else {
    parseNormalText(p, s, i, i1, i2);
  }
}

function parseAtomicText(p: HtmlElement, s: string, i: number, i1: number, i2: number) {
  let k = s.indexOf(LEXP, i1);
  if (k < 0 || k >= i2) {
    // static text
    new HtmlText(p.doc, p, s.substring(i1, i2), p.loc);
    return;
  }
  const exps = new Array<Expression>();
  for (let j1 = i1; j1 < i2;) {
    let j2 = s.indexOf(LEXP, j1);
    if (j2 < 0 || j2 >= i2) {
      // new HtmlText(p.doc, p, s.substring(j1, i2), p.loc);
      exps.push({
        type: 'Literal',
        value: s.substring(j1, i2),
        start: j1, end: i2, loc: loc(s, j1, i2, p.loc, i)
      });
      break;
    }
    if (j2 > j1) {
      // new HtmlText(p.doc, p, s.substring(j1, j2), p.loc);
      exps.push({
        type: 'Literal',
        value: s.substring(j1, j2),
        start: j1, end: j2, loc: loc(s, j1, j2, p.loc, i)
      });
      j1 = j2;
    }
    j2 += LEXP.length;
    j1 = skipBlanks(s, j2);
    if (j1 >= i2 || s.charCodeAt(j1) === REXP) {
      p.doc?.errors.push(new CodeError(
        'error',
        `invalid expression`,
        loc(s, j2, j2, p.loc, i)
      ));
      break;
    }
    // const exp = parseExpressionAt(s, j1, { ecmaVersion: 'latest', sourceType: 'script' });
    const exp = parseExpression(p, s, i, j1);
    j1 = exp.end;
    j1 = skipBlanks(s, j1);
    if (s.charCodeAt(j1) === REXP) {
      j1++;
    }
    // new HtmlText(p.doc, p, exp, p.loc);
    exps.push(exp);
  }
  // ensure first expression is a string literal so '+' will mean concatenation
  if (exps[0].type !== 'Literal' || typeof exps[0].value !== 'string') {
    exps.unshift({
      type: 'Literal',
      value: '',
      start: i1, end: i1, loc: loc(s, i1, i1, p.loc, i)
    });
  }
  if (exps.length === 1) {
    new HtmlText(p.doc, p, exps[0], p.loc);
    return;
  }
  function f(n: number): BinaryExpression {
    const start = (n > 1 ? exps[n - 1].start : exps[0].start);
    const end = exps[n].end;
    return {
      type: 'BinaryExpression',
      operator: '+',
      left: (n > 1 ? f(n - 1) : exps[0]),
      right: exps[n],
      start, end, loc: loc(s, start, end, p.loc, i)
    };
  }
  const exp = f(exps.length - 1);
  new HtmlText(p.doc, p, exp, p.loc);
}

function parseNormalText(p: HtmlElement, s: string, i: number, i1: number, i2: number) {
  for (let j1 = i1; j1 < i2;) {
    let j2 = s.indexOf(LEXP, j1);
    if (j2 < 0 || j2 >= i2) {
      new HtmlText(p.doc, p, s.substring(j1, i2), p.loc);
      break;
    }
    if (j2 > j1) {
      new HtmlText(p.doc, p, s.substring(j1, j2), p.loc);
      j1 = j2;
    }
    j2 += LEXP.length;
    j1 = skipBlanks(s, j2);
    if (j1 >= i2 || s.charCodeAt(j1) === REXP) {
      p.doc?.errors.push(new CodeError(
        'error',
        `invalid expression`,
        loc(s, j2, j2, p.loc, i)
      ));
      break;
    }
    // const exp = parseExpressionAt(s, j1, { ecmaVersion: 'latest', sourceType: 'script' });
    const exp = parseExpression(p, s, i, j1);
    j1 = exp.end;
    j1 = skipBlanks(s, j1);
    if (s.charCodeAt(j1) === REXP) {
      j1++;
    }
    new HtmlText(p.doc, p, exp, p.loc);
  }
}

function parseExpression(p: HtmlElement, s: string, i: number, i1: number) {
  try {
    const exp = parseExpressionAt(s, i1, { ecmaVersion: 'latest', sourceType: 'script' });
    //TODO: adapt ast nodes location
    return exp;
  } catch (err) {
    p.doc?.errors.push(new CodeError(
      'error',
      `${err}`,
      loc(s, i1, i1, p.loc, i)
    ));
    // abort parsing
    throw new Error();
  }
}

// =============================================================================
// utils
// =============================================================================

function hasAttribute(e: HtmlElement, name: string): boolean {
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

function skipContent(p: HtmlElement, i: number, tag: string, s: string, i1: number) {
  var i2;
  while ((i2 = s.indexOf('</', i1)) >= 0) {
    var i0 = i2;
    i1 = i2 + 2;
    i2 = skipName(s, i1);
    if (i2 > i1) {
      if (s.substring(i1, i2).toUpperCase() === tag) {
        i2 = skipBlanks(s, i2);
        if (s.charCodeAt(i2) != GT) {
          p.doc?.errors.push(new CodeError(
            'error',
            'Unterminated close tag',
            loc(s, i1, i1, p.loc, i)
          ));
          throw new Error();
        }
        i2++;
        // break;
        return {i0: i0, i2: i2};
      }
    }
    i1 = i2;
  }
  return null;
}

function skipName(s: string, i: number, acceptsDots = false) {
  while (i < s.length) {
    var code = s.charCodeAt(i);
    if ((code < 'a'.charCodeAt(0) || code > 'z'.charCodeAt(0)) &&
      (code < 'A'.charCodeAt(0) || code > 'Z'.charCodeAt(0)) &&
      (code < '0'.charCodeAt(0) || code > '9'.charCodeAt(0)) &&
      code != DASH && code != '_'.charCodeAt(0) &&
    // #if HTML_EXTENSIONS
      (!acceptsDots || code != '.'.charCodeAt(0)) &&
    // #end
      code != ':'.charCodeAt(0)) {
      break;
    }
    i++;
  }
  return i;
}

function skipComment(p: HtmlElement, i: number, s: string, i1: number) {
  if (s.charCodeAt(i1) === '!'.charCodeAt(0)
    && s.charCodeAt(i1 + 1) === DASH
    && s.charCodeAt(i1 + 2) === DASH) {
    if ((i1 = s.indexOf('-->', i1 + 3)) < 0) {
      p.doc?.errors.push(new CodeError(
        'error',
        'Unterminated comment',
        loc(s, i1, i1, p.loc, i)
      ));
      throw new Error();
    }
    i1 += 3;
  }
  return i1;
}

function loc(
  s: string, i1: number, i2: number,
  parentLoc: SourceLocation, parentIndex: number
): HtmlLocation {
  const start = pos(s, i1, parentLoc, parentIndex);
  const end = pos(s, i2, parentLoc, parentIndex);
  return {
    source: parentLoc.source,
    start,
    end,
    i1, i2
  };
}

// let lastIndex = 0;
// let lastLine = 1;
// let lastColumn = 0;

function pos(
  s: string, i: number, parentLoc: SourceLocation, parentIndex: number
): Position {
  // if (i === lastIndex) {
  //   return { line: lastLine, column: lastColumn };
  // } else if (i > lastIndex) {
  //   let line = lastLine;
  //   let column = lastColumn;
  //   var i1 = lastIndex, i2;
  //   while ((i2 = s.indexOf('\n', i1)) >= 0 && (i2 <= i)) {
  //     i1 = i2 + 1;
  //     line++;
  //   }
  //   column += Math.max(0, (i - Math.max(0, i1)));
  //   lastIndex = i;
  //   lastLine = line;
  //   lastColumn = column;
  //   return { line, column };
  // }

  let line = 1;
  let column = 0;
  var i1 = 0, i2;
  while ((i2 = s.indexOf('\n', i1)) >= 0 && (i2 < i)) {
    i1 = i2 + 1;
    line++;
  }
  column += Math.max(0, (i - Math.max(0, i1)));

  // lastIndex = i;
  // lastLine = line;
  // lastColumn = column;

  return { line, column };
}

export function htmlUnescape(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}
