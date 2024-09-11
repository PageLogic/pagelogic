import * as acorn from 'acorn';
import { Element, Text } from '../html/dom';
import { Page, SRC_LOGIC_ATTR_PREFIX } from '../page/page';
import { DOM_ID_ATTR, Scope } from '../page/scope';
import { astArrayExpression, astLiteral, astObjectExpression, astProperty } from './utils';

export class CompilerPage extends Page {
  ast!: acorn.ObjectExpression;

  override init() {
    const load = (e: Element, s: Scope, p: acorn.ArrayExpression) => {
      if (this.needsScope(e, true)) {
        const id = this.nextScopeId++;
        e.setAttribute(DOM_ID_ATTR, `${id}`);
        s = new Scope(e).linkTo(s);
        const o = astObjectExpression(e);
        o.properties.push(astProperty('dom', astLiteral(id, e), e));
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
    if (['HTML', 'HEAD', 'BODY'].includes(e.name)) {
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
}
