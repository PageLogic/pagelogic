import { Scope, ScopeProps } from "../core/scope";
import { Value } from "../core/value";
import { COMMENT_NODE, ELEMENT_NODE, TEXT_NODE } from "./util/dom-util";
import { ID_DATA_ATTR, TEXT_MARKER1_PREFIX, WebContext } from "./context";
import { WebValue } from "./value";

export interface WebScopeProps extends ScopeProps {
}

export class WebScope extends Scope {
  dom: Element;
  texts: Map<string, Node>;

  constructor(ctx: WebContext, parent: WebScope | null, props: WebScopeProps, cloneIndex?: number) {
    super(ctx, parent, props, cloneIndex);
    this.texts = new Map();
    this.dom = this.initDom();
    if (!parent || props.isolate) {
      this.object['window'] = ctx.win;
      this.object['setTimeout'] = ctx.win.setTimeout;
      this.object['setInterval'] = ctx.win.setInterval;
    }
  }

  clone(cloneIndex: number): WebScope {
    const e = this.dom.cloneNode(true) as Element;
    e.setAttribute(ID_DATA_ATTR, e.getAttribute(ID_DATA_ATTR) + `.${cloneIndex}`);
    this.dom.parentNode?.insertBefore(e, this.dom);
    return new WebScope(this.webCtx, this.webParent, this.props, cloneIndex);
  }

  get webCtx(): WebContext {
    return this.ctx as WebContext;
  }

  get webParent(): WebScope | null {
    return this.parent ? this.parent as WebScope : null;
  }

  protected override initValues(): Map<string, Value> {
    const ret = new Map();
    if (this.props.values) {
      for (let key of Reflect.ownKeys(this.props.values)) {
        if (typeof key === 'string') {
          const value = new WebValue(this, key, this.props.values[key]);
          this.object[key] = value;
          ret.set(key, value);
        }
      }
    }
    return ret;
  }

  protected initDom(): Element {
    const root = (this.webParent ? this.webParent.dom : this.webCtx.doc);
    const ret = root.querySelector(`[${ID_DATA_ATTR}='${this.id}']`);
    const collect = (e: Element) => {
      for (let n of e.childNodes) {
        if (n.nodeType === COMMENT_NODE && n.nodeValue?.startsWith(TEXT_MARKER1_PREFIX)) {
          const key = n.nodeValue.substring(TEXT_MARKER1_PREFIX.length);
          let val = n.nextSibling;
          if (!val || val.nodeType !== TEXT_NODE) {
            const t = e.ownerDocument.createTextNode('');
            val ? e.insertBefore(t, val) : e.appendChild(t);
            val = t;
          }
          this.texts.set(key, val);
        } else if (n.nodeType === ELEMENT_NODE && !(n as Element).hasAttribute(ID_DATA_ATTR)) {
          collect(n as Element);
        }
      }
    };
    collect(ret!);
    return ret!;
  }

}
