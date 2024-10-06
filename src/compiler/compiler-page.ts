import {
  ArrayExpression, BlockStatement, Expression, ObjectExpression
} from 'acorn';
import * as dom from '../html/dom';
import { DIRECTIVE_TAG_PREFIX, PageError } from '../html/parser';
import {
  ServerAttribute, ServerComment, ServerDocument, ServerElement, ServerNode,
  ServerText, SourceLocation
} from '../html/server-dom';
import * as k from '../page/consts';
import * as pg from '../page/page';
import { ScopeType, ValueProps } from '../page/props';
import { Scope } from '../page/scope';
import { ForeachScope } from '../page/scopes/foreach-scope';
import { Value } from '../page/value';
import {
  astArrayExpression, astLiteral, astLocation, astObjectExpression, astProperty
} from './ast/acorn-utils';
import { qualifyPageIdentifiers } from './ast/qualifier';
import { resolveValueDependencies } from './ast/resolver';
import { dashToCamel, encodeEventName } from './util';
import { ELEMENT_NODE } from 'trillo/preprocessor/dom';

const FOREACH_TAG = DIRECTIVE_TAG_PREFIX + 'FOREACH';

const DEF_NAMES: { [key: string]: string } = {
  HTML: 'page',
  HEAD: 'head',
  BODY: 'body'
};

//TODO: prevent classic functions ${} expressions (error if there are)
export class CompilerPage extends pg.Page {
  ast!: ObjectExpression;
  scopes!: Array<Scope>;
  objects!: Array<ObjectExpression>;
  errors!: PageError[];

  override init() {
    const load = (
      e: ServerElement, s: Scope, p: ArrayExpression, v?: ObjectExpression
    ) => {
      if (this.needsScope(e)) {
        const l = e.loc;
        const id = this.scopes.length;
        e.setAttribute(k.DOM_ID_ATTR, `${id}`);
        (e.ownerDocument as ServerDocument).domIdElements[id] = e;

        s = this.newScope(id, e).linkTo(this, s);
        s.name = DEF_NAMES[e.tagName];
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
      e.childNodes.forEach((n: dom.Node) => {
        if (n.nodeType === dom.NodeType.ELEMENT) {
          load(n as ServerElement, s, p, v);
        }
      });
      return s;
    };

    const doc = this.global.doc as ServerDocument;
    this.ast = astObjectExpression(doc.loc);
    const p = astArrayExpression(doc.loc);
    this.ast.properties.push(astProperty('root', p, doc.loc));
    this.scopes = [];
    this.objects = [];
    this.errors = [];
    this.root = load(doc.documentElement! as ServerElement, this.global, p);
    !this.hasErrors() && qualifyPageIdentifiers(this);
    !this.hasErrors() && resolveValueDependencies(this);
  }

  override newScope(id: number, e: dom.Element, _?: ScopeType): Scope {
    if (e.tagName === FOREACH_TAG) {
      return this.newForeachScope(id, e);
    }
    if (e.tagName.startsWith(DIRECTIVE_TAG_PREFIX)) {
      this.errors.push(new PageError(
        'error', 'unknown directive ' + e.tagName, e.loc as SourceLocation
      ));
    }
    return new Scope(id, e, this.global);
  }

  protected newForeachScope(id: number, e: dom.Element): Scope {
    e.tagName = 'template';
    const ret = new ForeachScope(id, e, this.global);
    let count = 0;
    e.childNodes.forEach(n => n.nodeType === ELEMENT_NODE ? count++ : null);
    if (count !== 1) {
      const loc = e.loc as SourceLocation;
      this.errors.push(new PageError(
        'error', '<:foreach> should contain a single element', loc
      ));
    }
    return ret;
  }

  override newValue(
    page: pg.Page, scope: Scope, name: string, props: ValueProps
  ): Value {
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
    // 1) `:`-prefixed directive tags
    if (e.tagName.startsWith(DIRECTIVE_TAG_PREFIX)) {
      return true;
    }
    // 2) special tagnames
    if (DEF_NAMES[e.tagName]) {
      return true;
    }
    // 3) `:`-prefixed attributes & attribute expressions
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
    return DEF_NAMES[e.tagName];
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
      if (a.name.startsWith(k.SRC_SYS_ATTR_PREFIX)) {
        this.collectSysAttribute(scope, a, ret);
      } else if (a.name.startsWith(k.SRC_EVENT_ATTR_PREFIX)) {
        this.collectEventAttribute(a, ret);
      } else if (a.name.startsWith(k.SRC_LOGIC_ATTR_PREFIX)) {
        this.collectValueAttribute(a, ret);
      } else {
        this.collectNativeAttribute(a, ret);
      }
      e.attributes.splice(i, 1);
    }
  }

  collectSysAttribute(scope: Scope, a: ServerAttribute, ret: ObjectExpression) {
    const name = k.RT_SYS_VALUE_PREFIX
      + a.name.substring(k.SRC_SYS_ATTR_PREFIX.length);
    switch (name) {
    case '$name':
      this.checkLiteralAttribute(a) && (scope.name = a.value as string);
      break;
    }
    const value = this.makeValue('', name, a.value, a.loc, a.valueLoc!);
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
    const loc: SourceLocation = {
      source: a.loc.source,
      start: { ...a.loc.start },
      end: { ...a.loc.end },
      i1: a.loc.i1,
      i2: a.loc.i2,
    };
    loc.start.column += k.SRC_LOGIC_ATTR_PREFIX.length;
    const value = this.makeValue('', name, a.value, loc, a.valueLoc!);
    ret.properties.push(value);
  }

  collectNativeAttribute(a: ServerAttribute, ret: ObjectExpression) {
    const name = dashToCamel(a.name);
    const value = this.makeValue(
      k.RT_ATTR_VALUE_PREFIX, name, a.value, a.loc, a.valueLoc!
    );
    ret.properties.push(value);
  }

  collectEventAttribute(a: ServerAttribute, ret: ObjectExpression) {
    // attribute value must be a function expression
    if (
      typeof a.value !== 'object' ||
      a.value?.type !== 'ArrowFunctionExpression'
    ) {
      this.errors.push(new PageError(
        'error', 'event listeners must be arrow functions', a.valueLoc
      ));
    }
    // make value
    const n = encodeEventName(a.name.substring(k.SRC_EVENT_ATTR_PREFIX.length));
    const value = this.makeValue(
      k.RT_EVENT_VALUE_PREFIX, n, a.value, a.loc, a.valueLoc!
    );
    ret.properties.push(value);
  }

  collectTexts(e: ServerElement, v: ObjectExpression) {
    let count = 0;
    const f = (e: ServerElement) => {
      for (let i = 0; i < e.childNodes.length;) {
        const n = e.childNodes[i] as ServerNode;
        if (
          n.nodeType === dom.NodeType.ELEMENT &&
          !this.needsScope(n as ServerElement)
        ) {
          f(n as ServerElement);
        } else if (
          n.nodeType === dom.NodeType.TEXT &&
          typeof (n as ServerText).textContent !== 'string'
        ) {
          const name = k.RT_TEXT_VALUE_PREFIX + count;
          const value = this.makeValue(
            '', name, (n as ServerText).textContent, n.loc, n.loc
          );
          v.properties.push(value);
          const c1 = new ServerComment(
            e.ownerDocument, k.HTML_TEXT_MARKER1 + (count++), n.loc
          );
          e.insertBefore(c1, n);
          const c2 = new ServerComment(
            e.ownerDocument, k.HTML_TEXT_MARKER2, n.loc
          );
          e.insertBefore(c2, (n.nextSibling as ServerNode) ?? null);
          i += 2;
        }
        i++;
      }
    };
    f(e);
  }

  makeValue(
    prefix: string,
    name: string,
    value: string | Expression | null,
    loc1: SourceLocation,
    loc2: SourceLocation
  ) {
    this.checkName(name, loc1);
    const o = astObjectExpression(loc2);
    const p = astProperty('exp', this.makeValueFunction(value, loc2), loc2);
    o.properties.push(p);
    return astProperty(prefix + name, o, loc2);
  }

  makeValueFunction(
    value: string | Expression | null,
    l: SourceLocation
  ): Expression {
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

  checkName(name: string, loc: SourceLocation): boolean {
    if (!/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name)) {
      this.errors.push(new PageError(
        'error', `invalid value name "${name}"`, loc
      ));
      return false;
    }
    return true;
  }
}
