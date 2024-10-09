import { ELEMENT_NODE } from 'trillo/preprocessor/dom';
import { Document, Element } from '../html/dom';
import * as k from './consts';
import { Page } from './page';
import { PageProps } from './props';
import { Scope } from './scope';
import { Value } from './value';

export abstract class Global extends Scope {
  pageProps: PageProps;

  constructor(doc: Document, props: PageProps) {
    super({ dom: -1 }, doc);
    this.pageProps = props;
    this.init();
  }

  get doc(): Document {
    return this.e as Document;
  }

  abstract init(): void;
  abstract getElement(dom: number): Element;
  abstract cloneTemplateImpl(template: Element): Element;

  getLocalElements(root: Element, dom: number): Element[] {
    const ret = new Array<Element>();
    const s = `${dom}`;
    function f(e: Element) {
      e.childNodes.forEach(n => {
        if (n.nodeType !== ELEMENT_NODE) {
          return;
        }
        if ((n as Element).getAttribute(k.DOM_ID_ATTR) === s) {
          ret.push(e);
          return;
        }
        f(n as Element);
      });
    }
    f(root);
    return ret;
  }

  cloneTemplate(template: Element): Element {
    function fixDomIds(e: Element) {
      const id = e.getAttribute(k.DOM_ID_ATTR);
      id && e.setAttribute(k.DOM_ID_ATTR, `${-parseInt(id)}`);
      e.childNodes.forEach(n => {
        n.nodeType === ELEMENT_NODE && fixDomIds(n as Element);
      });
      return e;
    }
    return fixDomIds(this.cloneTemplateImpl(template));
  }

  override makeObj(page: Page): this {
    this.values['console'] = page.newValue(page, this, 'console', {
      exp: function() { return console; }
    });
    return super.makeObj(page);
  }

  setValueCB(name: string, value: Value, scope: Scope) {
    if (name.startsWith(k.RT_ATTR_VALUE_PREFIX)) {
      const key = name.substring(k.RT_ATTR_VALUE_PREFIX.length);
      value.cb = (scope, v) => {
        scope.e.setAttribute(key, `${v != null ? v : ''}`);
        return v;
      };
    } else if (name.startsWith(k.RT_TEXT_VALUE_PREFIX)) {
      const key = name.substring(k.RT_TEXT_VALUE_PREFIX.length);
      const t = scope.getText(key)!;
      value.cb = (_, v) => {
        t.textContent = `${v != null ? v : ''}`;
        return v;
      };
    }
  }

  addEventListeners(scope: Scope) {
    this.foreachListener(scope, (evname, listener) => {
      scope.e.addEventListener(evname, listener);
    });
  }

  removeEventListeners(scope: Scope) {
    this.foreachListener(scope, (evname, listener) => {
      scope.e.removeEventListener(evname, listener);
    });
  }

  foreachListener(scope: Scope, cb: (ev: string, listener: unknown) => void) {
    Object.keys(scope.values).forEach(key => {
      if (!key.startsWith(k.RT_EVENT_VALUE_PREFIX)) {
        return;
      }
      const evname = key.substring(k.RT_EVENT_VALUE_PREFIX.length);
      const listener = scope.values[key].get();
      cb(evname, listener);
    });
  }
}
