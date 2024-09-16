import {
  ArrayExpression, BlockStatement, Expression, ObjectExpression
} from 'acorn';
import { Attribute, Element, SourceLocation, Text } from '../html/dom';
import { PageError } from '../html/parser';
import * as pg from '../page/page';
import { DOM_ID_ATTR, Scope } from '../page/scope';
import { qualifyPageIdentifiers } from './ast/qualifier';
import {
  astArrayExpression, astLiteral, astLocation, astObjectExpression, astProperty
} from './ast/utils';

const DEF_NAMES: { [key: string]: string } = {
  HTML: 'page',
  HEAD: 'head',
  BODY: 'body'
};

export class CompilerPage extends pg.Page {
  ast!: ObjectExpression;
  scopes!: Array<Scope>;
  objects!: Array<ObjectExpression>;
  errors = new Array<PageError>();

  override init() {
    const load = (e: Element, s: Scope, p: ArrayExpression, v?: ObjectExpression) => {
      if (this.needsScope(e)) {
        const l = e.loc;
        const id = this.scopes.length;
        e.setAttribute(DOM_ID_ATTR, `${id}`);

        s = new Scope(id, e).linkTo(s);
        this.scopes.push(s);
        const o = astObjectExpression(l);
        this.objects.push(o);

        o.properties.push(astProperty('dom', astLiteral(id, l), l));
        const name = this.getName(e);
        name && o.properties.push(astProperty('name', astLiteral(name, l), l));

        v = astObjectExpression(l);
        this.collectAttributes(e, v);
        this.collectTexts(e, v);
        v.properties.length && o.properties.push(astProperty('values', v, l));

        p.elements.push(o);
        p = astArrayExpression(l);
        o.properties.push(astProperty('children', p, l));
      }
      e.children.forEach(n => {
        if (n.type === 'element') {
          load(n as Element, s, p, v);
        }
      });
      return s;
    };

    this.ast = astObjectExpression(this.glob.doc.loc);
    const p = astArrayExpression(this.glob.doc.loc);
    this.ast.properties.push(astProperty('root', p, this.glob.doc.loc));
    this.scopes = [];
    this.objects = [];
    this.root = load(this.glob.doc.documentElement!, this.glob, p);
    qualifyPageIdentifiers(this);
  }

  needsScope(e: Element) {
    // 1) special tagnames
    if (DEF_NAMES[e.name]) {
      return true;
    }
    // 2) `:`-prefixed attributes & attribute expressions
    for (const attr of e.attributes) {
      if (
        attr.name.startsWith(pg.SRC_LOGIC_ATTR_PREFIX) ||
        typeof attr.value !== 'string'
      ) {
        return true;
      }
    }
    return false;
  }

  getName(e: Element) {
    const attr = e.getAttributeNode(pg.SRC_NAME_ATTR);
    if (attr) {
      const name = typeof attr.value === 'string' ? attr.name : null;
      if (/^[a-zA-z_]\w*&/.test(name ?? '')) {
        return name;
      } else {
        const err = new PageError('error', 'invalid name', attr.valueLoc);
        this.errors.push(err);
      }
    }
    return DEF_NAMES[e.name];
  }

  collectAttributes(e: Element, ret: ObjectExpression) {
    for (let i = 0; i < e.attributes.length;) {
      const a = e.attributes[i];
      if (!pg.SRC_ATTR_NAME_REGEX.test(a.name)) {
        const err = new PageError('error', 'invalid attribute name', a.loc);
        this.errors.push(err);
        i++;
        continue;
      }
      if (
        !a.name.startsWith(pg.SRC_LOGIC_ATTR_PREFIX) &&
        typeof a.value === 'string'
      ) {
        i++;
        continue;
      }
      if (a.name.startsWith(pg.SRC_SYSTEM_ATTR_PREFIX)) {
        this.collectSystemAttribute(a, ret);
      } else if (a.name.startsWith(pg.SRC_LOGIC_ATTR_PREFIX)) {
        this.collectValueAttribute(a, ret);
      } else {
        this.collectNativeAttribute(a, ret);
      }
      e.attributes.splice(i, 1);
    }
  }

  collectSystemAttribute(a: Attribute, ret: ObjectExpression) {
    //TODO
  }

  collectValueAttribute(a: Attribute, ret: ObjectExpression) {
    const name = a.name.substring(pg.SRC_LOGIC_ATTR_PREFIX.length);
    const value = this.makeValue(name, a.value, a.valueLoc!);
    ret.properties.push(value);
  }

  collectNativeAttribute(a: Attribute, ret: ObjectExpression) {
    const name = pg.RT_ATTR_VALUE_PREFIX + a.name;
    const value = this.makeValue(name, a.value, a.valueLoc!);
    ret.properties.push(value);    
  }

  collectTexts(e: Element, v: ObjectExpression) {
    let count = 0;
    const f = (e: Element) => {
      for (const n of e.children) {
        if (n.type === 'element' && !this.needsScope(n as Element)) {
          f(n as Element);
        } else if (n.type === 'text' && typeof (n as Text).value !== 'string') {
          const name = pg.RT_TEXT_VALUE_PREFIX + (count++);
          const value = this.makeValue(name, (n as Text).value, n.loc);
          v.properties.push(value);
        }
      }
    };
    f(e);
  }

  makeValue(name: string, value: string | Expression, l: SourceLocation) {
    const o = astObjectExpression(l);
    const p = astProperty('exp', this.makeValueFunction(value, l), l);
    o.properties.push(p);
    return astProperty(name, o, l);
  }

  makeValueFunction(value: string | Expression, l: SourceLocation): Expression {
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
