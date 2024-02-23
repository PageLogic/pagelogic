import { Expression, ExpressionStatement, Literal, Program, SourceLocation } from "acorn";
import { CodeError } from "./types";
import { parseHTML } from "./html-parser";
import { HtmlElement, HtmlLocation, HtmlText } from "./html";
import { JSXAttribute, JSXElement, JSXExpressionContainer, JSXIdentifier, JSXText } from "./walker";
import { VOID_ELEMENTS } from "./html-parser";

export interface Source {
  fname?: string;
  errors: CodeError[];
  program: Program;
}

// https://astexplorer.net
export function parseSource(s: string, fname?: string): Source {
  const document = parseHTML(s, fname);
  const errors = document.errors;
  const program: Program = {
    type: 'Program',
    sourceType: 'script',
    body: [],
    ...loc(document.loc),
  };
  const ret = { fname, program, errors };
  if (errors.length > 0) {
    return ret;
  }
  const documentElement = document.documentElement;
  if (!documentElement) {
    errors.push(new CodeError('error', 'missing root tag', document.loc));
    return ret;
  }
  const statement: ExpressionStatement = {
    type: 'ExpressionStatement',
    expression: makeElement(documentElement, errors) as unknown as Expression,
    ...loc(documentElement.loc),
  };
  program.body.push(statement);
  return { fname, program, errors };
}

function makeElement(e: HtmlElement, errors: CodeError[]): JSXElement {
  const name = makeIdentifier(e.name.toLowerCase(), e.loc);
  const ret: JSXElement = {
    type: 'JSXElement',
    openingElement: {
      type: 'JSXOpeningElement',
      name,
      attributes: makeAttributes(e, errors),
      selfClosing: true,
      ...loc(e.loc),
    },
    closingElement: null,
    children: [],
    ...loc(e.loc),
  }
  if (VOID_ELEMENTS.has(e.name)) {
    return ret;
  }
  ret.openingElement.selfClosing = false;
  ret.closingElement = {
    type: 'JSXClosingElement',
    name,
    ...loc(e.loc),
  };
  for (const n of e.children) {
    switch (n.type) {
      case 'element':
        ret.children.push(makeElement(n as HtmlElement, errors));
        break;
      case 'text':
        ret.children.push(makeText(n as HtmlText, errors));
    }
  }
  return ret;
}

function makeAttributes(e: HtmlElement, errors: CodeError[]): JSXAttribute[] {
  const ret = new Array<JSXAttribute>();
  for (const a of e.attributes) {
    const value = typeof a.value === 'string'
        ? makeLiteral(a.value, a.loc)
        : makeJSXExpressionContainer(a.value, a.loc);
    const ast: JSXAttribute = {
      type: 'JSXAttribute',
      name: makeIdentifier(a.name, a.loc),
      value,
      ...loc(a.loc),
    };
    ret.push(ast);
  }
  return ret;
}

function makeText(t: HtmlText, errors: CodeError[]): JSXText | JSXExpressionContainer {
  let ret: JSXText | JSXExpressionContainer;
  if (typeof t.value === 'string') {
    ret = {
      type: 'JSXText',
      value: t.value,
      ...loc(t.loc),
    };
  } else {
    ret = makeJSXExpressionContainer(t.value, t.loc);
  }
  return ret;
}

function loc(loc: HtmlLocation): { start: number, end: number, loc: SourceLocation} {
  return {
    start: loc.i1,
    end: loc.i2,
    loc,
  };
}

function makeIdentifier(name: string, l: HtmlLocation): JSXIdentifier {
  return {
    type: 'JSXIdentifier',
    name,
    ...loc(l),
  };
}

function makeLiteral(value: string, l: HtmlLocation): Literal {
  return {
    type: 'Literal',
    value,
    ...loc(l),
  }
}

function makeJSXExpressionContainer(ast: Expression, l: HtmlLocation): JSXExpressionContainer {
  return {
    type: 'JSXExpressionContainer',
    expression: ast,
    ...loc(l),
  }
}
