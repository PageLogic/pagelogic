import { Value, ValueProps } from '../core/value';
import { ATTR_VALUE_PREFIX, CLASS_VALUE_PREFIX, STYLE_VALUE_PREFIX, TEXT_VALUE_PREFIX } from './context';
import { WebScope } from './scope';
import { camelToHyphen } from './util/util';

export interface WebValueProps extends ValueProps {
}

export class WebValue extends Value {
  classParts?: Set<string>;
  styleParts?: Map<string, string>;

  constructor(scope: WebScope, key: string, props: WebValueProps) {
    super(scope, key, props);
    if (key.startsWith(ATTR_VALUE_PREFIX)) {
      const name = key.substring(ATTR_VALUE_PREFIX.length);
      if (name === 'class') {
        this.classParts = new Set();
        this.cb = (v) => this.attrClassCB(name, v);
      } else if (name === 'style') {
        this.styleParts = new Map();
        this.cb = (v) => this.attrStyleCB(name, v);
      } else {
        this.cb = (v) => this.attrCB(name, v);
      }
    } else if (key.startsWith(CLASS_VALUE_PREFIX)) {
      const name = key.substring(CLASS_VALUE_PREFIX.length);
      const k = camelToHyphen(name);
      this.cb = (v) => this.classCB(k, v);
    } else if (key.startsWith(STYLE_VALUE_PREFIX)) {
      const name = key.substring(STYLE_VALUE_PREFIX.length);
      const k = camelToHyphen(name);
      this.cb = (v) => this.styleCB(k, v);
    } else if (key.startsWith(TEXT_VALUE_PREFIX)) {
      const id = key.substring(TEXT_VALUE_PREFIX.length);
      this.cb = (v) => this.textCB(id, v);
    }
  }

  get webScope(): WebScope {
    return this.scope as WebScope;
  }

  attrCB(k: string, v: never) {
    const e = this.webScope.dom;
    if (v != null) {
      e.setAttribute(k, `${v}`.trim());
    } else {
      e.removeAttribute(k);
    }
    return v;
  }

  attrClassCB(k: string, v: never) {
    const e = this.webScope.dom;
    const p1 = this.classParts!;
    const p2 = new Set(`${v || ''}`.trim().split(/\s+/));
    p1.forEach(v => !p2.has(v) && e.classList.remove(v));
    p2.forEach(v => !p1.has(v) && e.classList.add(v));
    this.classParts = p2;
    return v;
  }

  classCB(k: string, v: never) {
    const e = this.webScope.dom;
    v ? e.classList.add(k) : e.classList.remove(k);
    return v;
  }

  attrStyleCB(k: string, v: never) {
    const e = this.webScope.dom as HTMLElement;
    const p1 = this.styleParts!;
    const p2 = new Map<string, string>();
    (`${(v || '')}`.trim().split(/\s*;\s*/) as string[]).forEach(s => {
      const p = s.split(/\s*:\s*/);
      (p.length > 1 && p[0] && p[1]) && p2.set(p[0], p[1]);
    });
    p2.forEach((val, key) => !p1.has(key) && e.style.setProperty(key, val));
    p1.forEach((val, key) => !p2.has(key) && e.style.removeProperty(key));
    this.styleParts = p2;
    return v;
  }

  styleCB(k: string, v: unknown) {
    const e = this.webScope.dom as HTMLElement;
    v = (v ? `${v}`.trim() : null);
    if (v) {
      e.style.setProperty(k, v as string);
    } else {
      e.style.removeProperty(k);
    }
    return v as never;
  }

  textCB(id: string, v: never) {
    const n = this.webScope.texts.get(id);
    n && (n.nodeValue = (v != null ? `${v}` : ''));
    return v;
  }

}
