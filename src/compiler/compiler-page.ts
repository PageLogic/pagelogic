import * as acorn from 'acorn';
import { Attribute, Element, Node, Text } from '../html/dom';
import { Page, SRC_ATTR_NAME_REGEX, SRC_LOGIC_ATTR_PREFIX, SRC_NAME_ATTR, SRC_SYSTEM_ATTR_PREFIX } from '../page/page';
import { DOM_ID_ATTR, Scope } from '../page/scope';
import { astArrayExpression, astLiteral, astObjectExpression, astProperty } from './utils';
import { PageError } from '../html/parser';

const DEF_NAMES: { [key: string]: string } = {
  HTML: 'page',
  HEAD: 'head',
  BODY: 'body'
}

export class CompilerPage extends Page {
  ast!: acorn.ObjectExpression;
  errors = new Array<PageError>();

  override init() {
    const load = (e: Element, s: Scope, p: acorn.ArrayExpression) => {
      if (this.needsScope(e, true)) {
        const id = this.nextScopeId++;
        e.setAttribute(DOM_ID_ATTR, `${id}`);

        s = new Scope(e).linkTo(s);
        const o = astObjectExpression(e);

        o.properties.push(astProperty('dom', astLiteral(id, e), e));
        const name = this.getName(e);
        name && o.properties.push(astProperty('name', astLiteral(name, e), e));

        const v = astObjectExpression(e);
        this.collectAttributes(e, v);
        v.properties.length && o.properties.push(astProperty('values', v, e));

        p.elements.push(o);
        p = astArrayExpression(e);
        o.properties.push(astProperty('children', p, e));
      }
      e.children.forEach(n => {
        if (n.type === 'element') {
          load(n as Element, s, p);
        }
      });
      return s;
    };

    this.ast = astObjectExpression(this.glob.doc);
    const p = astArrayExpression(this.glob.doc);
    this.ast.properties.push(astProperty('root', p, this.glob.doc));

    this.root = load(this.glob.doc.documentElement!, this.glob, p);
  }

  needsScope(e: Element, checkTexts = false) {
    // 1) special tagnames
    if (DEF_NAMES[e.name]) {
      return true;
    }
    // 2) `:`-prefixed attributes & attribute expressions
    for (const attr of e.attributes) {
      if (
        attr.name.startsWith(SRC_LOGIC_ATTR_PREFIX) ||
        typeof attr.value !== 'string'
      ) {
        return true;
      }
    }
    // 3) text expressions
    const f = (e: Element): boolean => {
      for (const n of e.children) {
        if (n.type === 'element' && !this.needsScope(e) && f(e)) {
          return true;
        } else if (n.type === 'text' && typeof (n as Text).value !== 'string') {
          return true;
        }
      }
      return false;
    };
    if (checkTexts && f(e)) {
      return true;
    }
    return false;
  }

  getName(e: Element) {
    let name = e.getAttribute(SRC_NAME_ATTR);
    if (name) {
      if (/^[a-zA-z_]\w*&/.test(name)) {
        return name;
      } else {
        //TODO error
      }
    }
    return DEF_NAMES[e.name];
  }

  collectAttributes(e: Element, ret: acorn.ObjectExpression) {
    for (let i = 0; i < e.attributes.length;) {
      const a = e.attributes[i];
      if (!SRC_ATTR_NAME_REGEX.test(a.name)) {
        this.errors.push(new PageError('error', `invalid attribute name`, a.loc));
        i++;
        continue;
      }
      if (
        !a.name.startsWith(SRC_LOGIC_ATTR_PREFIX) &&
        typeof a.value === 'string'
      ) {
        i++;
        continue;
      }
      if (a.name.startsWith(SRC_SYSTEM_ATTR_PREFIX)) {
        this.collectSystemAttribute(a, ret);
      } else if (a.name.startsWith(SRC_LOGIC_ATTR_PREFIX)) {
        this.collectValueAttribute(a, ret);
      } else {
        this.collectNativeAttribute(a, ret);
      }
      e.attributes.splice(i, 1);
    }
  }

  collectSystemAttribute(a: Attribute, ret: acorn.ObjectExpression) {

  }

  collectValueAttribute(a: Attribute, ret: acorn.ObjectExpression) {
    const name = a.name.substring(SRC_LOGIC_ATTR_PREFIX.length);
  }

  collectNativeAttribute(a: Attribute, ret: acorn.ObjectExpression) {
    
  }

  // makeValue(name: string, value: string | acorn.Expression, n: Node) {
  //   const o = astObjectExpression(n);
  //   const exp = typeof value === 'string' ?
  //     {
  //       type: ''
  //     }
  //   return astProperty(name, o, n);
  // }

  // makeValueFunction() {
  //   const ret: acorn.FunctionExpression = {
  //     type: 'FunctionExpression',
  //   }
  //   return ret;
  // }
}
