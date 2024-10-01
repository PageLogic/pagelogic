import {
  ArrayExpression, BlockStatement, Expression, ObjectExpression
} from 'acorn';
import { ServerAttribute, ServerComment, SourceLocation, ServerText, ServerDocument, ServerElement, ServerNode } from '../html/server-dom';
import * as dom from '../html/dom';
import { PageError } from '../html/parser';
import * as k from '../page/consts';
import * as pg from '../page/page';
import { ValueProps } from '../page/props';
import { Scope } from '../page/scope';
import { Value } from '../page/value';
import {
  astArrayExpression, astLiteral, astLocation, astObjectExpression, astProperty
} from './ast/acorn-utils';
import { qualifyPageIdentifiers } from './ast/qualifier';
import { resolveValueDependencies } from './ast/resolver';

const DEF_NAMES: { [key: string]: string } = {
  HTML: 'page',
  HEAD: 'head',
  BODY: 'body'
};

//TODO: check that no classic functions are used in ${} expressions (error if they are)
export class CompilerPage extends pg.Page {
  ast!: ObjectExpression;
  scopes!: Array<Scope>;
  objects!: Array<ObjectExpression>;
  errors!: PageError[];

  override init() {
    const load = (e: ServerElement, s: Scope, p: ArrayExpression, v?: ObjectExpression) => {
      if (this.needsScope(e)) {
        const l = e.loc;
        const id = this.scopes.length;
        e.setAttribute(k.DOM_ID_ATTR, `${id}`);

        s = this.newScope(id, e).linkTo(s);
        s.name = DEF_NAMES[e.name];
        this.scopes.push(s);
        const o = astObjectExpression(l);
        this.objects.push(o);

        o.properties.push(astProperty('dom', astLiteral(id, l), l));
        const name = this.getName(e);
        name && o.properties.push(astProperty('name', astLiteral(name, l), l));

        v = astObjectExpression(l);
        this.collectAttributes(s, e, v);
        this.collectTexts(e, v);
        v.properties.length && o.properties.push(astProperty('values', v, l));

        p.elements.push(o);
        p = astArrayExpression(l);
        o.properties.push(astProperty('children', p, l));
      }
      e.children.forEach((n: dom.Node) => {
        if (n.type === 'element') {
          load(n as ServerElement, s, p, v);
        }
      });
      return s;
    };

    const doc = this.glob.doc as ServerDocument;
    this.ast = astObjectExpression(doc.loc);
    const p = astArrayExpression(doc.loc);
    this.ast.properties.push(astProperty('root', p, doc.loc));
    this.scopes = [];
    this.objects = [];
    this.errors = [];
    this.root = load(doc.documentElement! as ServerElement, this.glob, p);
    !this.hasErrors() && qualifyPageIdentifiers(this);
    !this.hasErrors() && resolveValueDependencies(this);
  }

  override newScope(id: number, e: dom.Element): Scope {
    return new Scope(id, e);
  }

  override newValue(page: pg.Page, scope: Scope, name: string, props: ValueProps): Value {
    return new Value(page, scope, props);
  }

  hasErrors() {
    for (const e of this.errors) {
      if (e.type === 'error') {
        return true;
      }
    }
    return false;
  }

  needsScope(e: ServerElement) {
    // 1) special tagnames
    if (DEF_NAMES[e.name]) {
      return true;
    }
    // 2) `:`-prefixed attributes & attribute expressions
    for (const attr of e.attributes) {
      if (
        attr.name.startsWith(k.SRC_LOGIC_ATTR_PREFIX) ||
        typeof attr.value !== 'string'
      ) {
        return true;
      }
    }
    return false;
  }

  getName(e: ServerElement) {
    const attr = e.getAttributeNode(k.SRC_NAME_ATTR) as ServerAttribute;
    if (attr) {
      const name = typeof attr.value === 'string' ? attr.value : null;
      if (/^[a-zA-z_]\w*$/.test(name ?? '')) {
        return name;
      } else {
        const err = new PageError('error', 'invalid name', attr.valueLoc);
        this.errors.push(err);
      }
    }
    return DEF_NAMES[e.name];
  }

  collectAttributes(scope: Scope, e: ServerElement, ret: ObjectExpression) {
    for (let i = 0; i < e.attributes.length;) {
      const a = e.attributes[i] as ServerAttribute;
      if (!k.SRC_ATTR_NAME_REGEX.test(a.name)) {
        const err = new PageError('error', 'invalid attribute name', a.loc);
        this.errors.push(err);
        i++;
        continue;
      }
      if (
        !a.name.startsWith(k.SRC_LOGIC_ATTR_PREFIX) &&
        typeof a.value === 'string'
      ) {
        i++;
        continue;
      }
      if (a.name.startsWith(k.SRC_SYSTEM_ATTR_PREFIX)) {
        this.collectSystemAttribute(scope, a, ret);
      } else if (a.name.startsWith(k.SRC_LOGIC_ATTR_PREFIX)) {
        this.collectValueAttribute(a, ret);
      } else {
        this.collectNativeAttribute(a, ret);
      }
      e.attributes.splice(i, 1);
    }
  }

  collectSystemAttribute(scope: Scope, a: ServerAttribute, ret: ObjectExpression) {
    const name = k.RT_SYS_VALUE_PREFIX
      + a.name.substring(k.SRC_SYSTEM_ATTR_PREFIX.length);
    switch (name) {
    case '$name':
      this.checkLiteralAttribute(a) && (scope.name = a.value as string);
      break;
    }
    const value = this.makeValue(name, a.value, a.valueLoc!);
    ret.properties.push(value);
  }

  checkLiteralAttribute(a: ServerAttribute): boolean {
    const ret = typeof a.value === 'string';
    if (!ret) {
      this.errors.push(new PageError(
        'error',
        `invalid ${a.name} attribute`,
        a.valueLoc
      ));
    }
    return ret;
  }

  collectValueAttribute(a: ServerAttribute, ret: ObjectExpression) {
    const name = a.name.substring(k.SRC_LOGIC_ATTR_PREFIX.length);
    const value = this.makeValue(name, a.value, a.valueLoc!);
    ret.properties.push(value);
  }

  collectNativeAttribute(a: ServerAttribute, ret: ObjectExpression) {
    const name = k.RT_ATTR_VALUE_PREFIX + a.name;
    const value = this.makeValue(name, a.value, a.valueLoc!);
    ret.properties.push(value);
  }

  collectTexts(e: ServerElement, v: ObjectExpression) {
    let count = 0;
    const f = (e: ServerElement) => {
      for (let i = 0; i < e.children.length;) {
        const n = e.children[i] as ServerNode;
        if (n.type === 'element' && !this.needsScope(n as ServerElement)) {
          f(n as ServerElement);
        } else if (n.type === 'text' && typeof (n as ServerText).value !== 'string') {
          const name = k.RT_TEXT_VALUE_PREFIX + count;
          const value = this.makeValue(name, (n as ServerText).value, n.loc);
          v.properties.push(value);
          const c1 = new ServerComment(e.doc, k.HTML_TEXT_MARKER1 + (count++), n.loc);
          e.insertBefore(c1, n);
          const c2 = new ServerComment(e.doc, k.HTML_TEXT_MARKER2, n.loc);
          e.insertBefore(c2, (n.nextSibling as ServerNode) ?? null);
          i += 2;
        }
        i++;
      }
    };
    f(e);
  }

  makeValue(name: string, value: string | Expression | null, l: SourceLocation) {
    const o = astObjectExpression(l);
    const p = astProperty('exp', this.makeValueFunction(value, l), l);
    o.properties.push(p);
    return astProperty(name, o, l);
  }

  makeValueFunction(value: string | Expression | null, l: SourceLocation): Expression {
    const body: BlockStatement = {
      type: 'BlockStatement',
      body: [
        {
          type: 'ReturnStatement',
          argument: typeof value === 'string'
            ? { type: 'Literal', value, ...astLocation(l) }
            : value,
          ...astLocation(l)
        }
      ],
      ...astLocation(l)
    };
    return {
      type: 'FunctionExpression',
      id: null,
      expression: false,
      generator: false,
      async: false,
      params: [],
      body,
      ...astLocation(l)
    };
  }
}
