import { Scope, ScopeProps } from "../core/scope";
import { Value } from "../core/value";
import { EVENT_VALUE_PREFIX, ID_DATA_ATTR, TEXT_MARKER1_PREFIX, TEXT_VALUE_PREFIX, WebContext } from "./context";
import { COMMENT_NODE, ELEMENT_NODE, TEXT_NODE } from "./util/dom-util";
import { WebValue } from "./value";

export const SCOPE_MEMBERS: { [key: string]: any } = {
  // setInterval: true, clearInterval: true,
  // setTimeout: true, clearTimeout: true,
};

export const ROOT_MEMBERS: { [key: string]: any } = {
  window: true,
};

export interface WebScopeProps extends ScopeProps {
}

export class WebScope extends Scope {
  dom: Element;
  texts: Map<string, Node>;

  constructor(ctx: WebContext, parent: WebScope | null, props: WebScopeProps, cloneIndex?: number) {
    super(ctx, parent, props, cloneIndex);
    this.texts = new Map();
    this.dom = this.initDom();
    // this.initTimers();
    if (!parent || props.isolate) {
      const win = ctx.win;
      this.object['window'] = win;
      this.object['setTimeout'] = (fn: () => void, ms: number) => {
        return win.setTimeout.apply(win, [fn, ms]);
      }
      this.object['setInterval'] = (fn: () => void, ms: number) => {
        return win.setInterval.apply(win, [fn, ms]);
      }
    }
  }

  clone(cloneIndex: number): WebScope {
    const e = this.dom.cloneNode(true) as Element;
    e.setAttribute(ID_DATA_ATTR, e.getAttribute(ID_DATA_ATTR) + `.${cloneIndex}`);
    this.dom.parentNode?.insertBefore(e, this.dom);
    return new WebScope(this.webCtx, this.webParent, this.props, cloneIndex);
  }

  dispose(unlinkDOM = true) {
    this.disposeListeners();
    unlinkDOM && this.dom.remove();
    super.dispose();
  }

  get webCtx(): WebContext {
    return this.ctx as WebContext;
  }

  get webParent(): WebScope | null {
    return this.parent ? this.parent as WebScope : null;
  }

  override loadChildren(props: ScopeProps[]) {
    if (this.dom.tagName === 'TEMPLATE') {
      return;
    }
    super.loadChildren(props);
  }

  protected override initValues(): Map<string, Value> {
    const ret = new Map();
    // root members
    if (!this.parent) {
      this.object['window'] = this.webCtx.win;
    }
    // default members
    // scope values
    if (this.props.values) {
      for (const key of Reflect.ownKeys(this.props.values)) {
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
      e.childNodes.forEach((n) => {
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
      });
    };
    collect(ret!);
    this.values.forEach((_, key) => {
      if (key.startsWith(EVENT_VALUE_PREFIX)) {
        const id = key.substring(EVENT_VALUE_PREFIX.length);
        ret!.addEventListener(id, (ev) => this.proxy[key]());
      } else if (key.startsWith(TEXT_VALUE_PREFIX) && this.texts.size === 0) {
        // whole-text element w/ dynamic content
        this.texts.set('0', ret!.firstChild!);
      }
    });
    return ret!;
  }

  // // ---------------------------------------------------------------------------
  // // timers
  // // ---------------------------------------------------------------------------
  // timeouts?: Set<any>;
  // intervals?: Set<any>;

  // initTimers() {
  //   const that = this;

  //   this.object['setTimeout'] = new Value(this, 'setTimeout', {
  //     exp: function() {
  //       return (cb: () => void, delay: number) => {
  //         const ret = setTimeout(cb, delay);
  //         that.timeouts ? that.timeouts.add(ret) : that.timeouts = new Set([ret]);
  //         return ret;
  //       }
  //     },
  //   });

  //   this.object['setInterval'] = new Value(this, 'setInterval', {
  //     exp: function() {
  //       return (cb: () => void, delay: number) => {
  //         const ret = setInterval(cb, delay);
  //         that.intervals ? that.intervals.add(ret) : that.intervals = new Set([ret]);
  //         return ret;
  //       }
  //     },
  //   });

  //   // this.object['clearTimeout'] = new Value(this, 'clearTimeout', {
  //   //   exp: function(id: any) {
  //   //     clearTimeout(id);
  //   //     that.timeouts?.delete(id);
  //   //   },
  //   // }, this);

  //   // this.object['clearInterval'] = new Value(this, 'clearInterval', {
  //   //   exp: function(id: any) {
  //   //     clearInterval(id);
  //   //     that.intervals?.delete(id);
  //   //   },
  //   // }, this);

  // }

  // disposeTimers() {
  //   // this.timeouts?.forEach(id => clearTimeout(id));
  //   // this.timeouts?.clear();
  //   // this.intervals?.forEach(id => clearInterval(id));
  //   // this.intervals?.clear();
  // }

  // ---------------------------------------------------------------------------
  // events
  // ---------------------------------------------------------------------------
  listeners?: Array<EventListener>;

  addListener(
    target: EventTarget,
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean
  ) {
    const listener = { target, type, callback, options };
    this.listeners ? this.listeners.push(listener) : this.listeners = [listener];
  }

  removeListener(
    target: EventTarget,
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean
  ) {
    const listener = { target, type, callback, options };
    const i = this.listeners ? this.listeners.indexOf(listener) : -1;
    i >= 0 && this.listeners?.splice(i, 1);
  }

  disposeListeners() {
    while (this.listeners?.length) {
      const l = this.listeners.pop() as EventListener;
      l.target.removeEventListener(l.type, l.callback, l.options);
    }
  }
}

type EventListener = {
  target: EventTarget,
  type: string,
  callback: EventListenerOrEventListenerObject | null,
  options?: AddEventListenerOptions | boolean
}
