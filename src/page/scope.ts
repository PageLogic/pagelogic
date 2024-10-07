import { Comment, Element, NodeType, Text } from '../html/dom';
import * as k from './consts';
import { Page } from './page';
import { Global } from './global';
import { ScopeType, ValueProps } from './props';
import { Value } from './value';

export type ScopeValues = { [key: string]: Value };
export type ScopeObj = { [key: string]: unknown };

export class Scope {
  parent?: Scope;
  id: number;
  e: Element;
  global?: Global;
  type?: ScopeType;
  name?: string;
  isolated?: boolean;
  values: ScopeValues;
  obj!: ScopeObj;
  children: Scope[];

  constructor(id: number, e: Element, global?: Global, type?: ScopeType) {
    this.id = id;
    this.e = e;
    this.global = global;
    this.type = type;
    this.values = {};
    this.children = [];
  }

  setName(name?: string): this {
    this.name = name;
    return this;
  }

  setValues(page: Page, values?: { [key: string]: ValueProps }): this {
    if (values) {
      Reflect.ownKeys(values).forEach(key => {
        const name = key as string;
        const v = page.newValue(page, this, name, values![name]);
        this.values[name] = v;
      });
    }
    return this;
  }

  linkTo(page: Page, p: Scope, ref?: Scope): this {
    let i = ref ? p.children.indexOf(ref) : -1;
    i = i < 0 ? p.children.length : i;
    p.children.splice(i, 0, this);
    this.parent = p;
    !this.e.parent
      && this.e.tagName !== 'HTML'
      && p.e.insertBefore(this.e, ref?.e ?? null);
    if (this.name) {
      if (!p.values[this.name]) {
        const that = this;
        // add name to parent scope
        p.values[this.name] = new Value(page, p, {
          exp: function() { return that.obj; }
        });
      }
    }
    page.global.addEventListeners(this);
    this.linkValues();
    return this;
  }

  unlink(page: Page): this {
    this.unlinkValues();
    page.global.removeEventListeners(this);
    if (this.name && this.parent && this.parent.obj[this.name] === this.obj) {
      // remove name from parent scope
      delete this.parent.values[this.name];
    }
    this.e.unlink();
    const i = this.parent ? this.parent.children.indexOf(this) : -1;
    i >= 0 && this.parent!.children.splice(i, 1);
    delete this.parent;
    return this;
  }

  protected addValue(page: Page, name: string, exp: () => unknown) {
    this.values[name] = page.newValue(page, this, name, { exp });
  }

  getText(id: string): Text | undefined {
    const key = k.HTML_TEXT_MARKER1 + id;
    const f = (e: Element): Text | undefined => {
      for (let i = 0; i < e.childNodes.length; i++) {
        const n = e.childNodes[i];
        if (n.nodeType === NodeType.ELEMENT) {
          const ret = f(n as Element);
          if (ret) {
            return ret;
          }
        } else if (
          n.nodeType === NodeType.COMMENT &&
          (n as Comment).textContent === key
        ) {
          let ret = e.childNodes[i + 1] as Text;
          if (ret.nodeType !== NodeType.TEXT) {
            const t = e.ownerDocument?.createTextNode('');
            e.insertBefore(t!, ret);
            ret = t!;
          }
          return ret;
        }
      }
    };
    return f(this.e);
  }

  // ===========================================================================
  // proxy object
  // ===========================================================================

  makeObj(page: Page): this {
    const that = this;

    this.values[k.RT_SCOPE_ID_KEY] = page.newValue(page, this, k.RT_SCOPE_ID_KEY, {
      exp: function() { return that.id; }
    });
    this.values[k.RT_SCOPE_NAME_KEY] = page.newValue(page, this, k.RT_SCOPE_NAME_KEY, {
      exp: function() { return that.name; }
    });
    this.values[k.RT_SCOPE_DOM_KEY] = page.newValue(page, this, k.RT_SCOPE_DOM_KEY, {
      exp: function() { return that.e; }
    });
    this.values[k.RT_SCOPE_ISOLATED_KEY] = page.newValue(page, this, k.RT_SCOPE_ISOLATED_KEY, {
      exp: function() { return !!that.isolated; }
    });
    this.values[k.RT_SCOPE_PARENT_KEY] = page.newValue(page, this, k.RT_SCOPE_PARENT_KEY, {
      exp: function() { return that.parent?.obj; }
    });
    this.values[k.RT_SCOPE_CHILDREN_KEY] = page.newValue(page, this, k.RT_SCOPE_CHILDREN_KEY, {
      exp: function() { return that.children.map(child => child.obj); }
    });
    this.values[k.RT_SCOPE_VALUE_KEY] = page.newValue(page, this, k.RT_SCOPE_VALUE_KEY, {
      exp: function() {
        return (key: string) => {
          let s: Scope | false | undefined = that;
          do {
            if (s.values[key]) {
              return s.values[key];
            }
            s = !s.isolated && s.parent;
          } while (s);
          return undefined;
        };
      }
    });

    this.obj = new Proxy(this.values, {

      get: (target: { [key: string]: Value }, key: string | symbol) => {
        const v = target[key as string];
        if (v) {
          return v.get();
        }
        const isolated = target[k.RT_SCOPE_ISOLATED_KEY].get();
        const parent = !isolated && target[k.RT_SCOPE_PARENT_KEY].get();
        if (parent) {
          return (parent as { [key: string]: unknown })[key as string];
        } else if (this.global) {
          return this.global.obj[key as string];
        }
        return undefined;
      },

      set: (
        target: { [key: string]: Value },
        key: string | symbol,
        val: unknown
      ) => {
        if (!this.global) {
          // this is the global object and it's write protected
          // (it's got no reference to global cause it's the global itself)
          return false;
        }
        const v = target[key as string];
        if (v) {
          v.set(val);
          return true;
        }
        const isolated = target[k.RT_SCOPE_ISOLATED_KEY];
        const parent = isolated ? null : target[k.RT_SCOPE_PARENT_KEY];
        if (parent) {
          try {
            (parent.get() as ScopeObj)[key as string] = val;
            return true;
          } catch (err) {
            return false;
          }
        }
        return false;
      },

      defineProperty: (_: { [key: string]: Value }, __: string | symbol) => {
        return false;
      },

      deleteProperty: (_: { [key: string]: Value }, __: string | symbol) => {
        return false;
      },
    });

    return this;
  }

  // ===========================================================================
  // refresh
  // ===========================================================================

  unlinkValues(recur = true) {
    this.foreachValue(v => {
      v.src.forEach(o => o.dst.delete(v));
      v.dst.forEach(o => o.src.delete(v));
    });
    recur && this.children.forEach(s => s.unlinkValues());
  }

  linkValues(recur = true) {
    this.foreachValue(v => {
      v.props.deps?.forEach(dep => {
        try {
          const o = dep.apply(this.obj);
          o.dst.add(v);
          v.src.add(o);
        } catch (ignored) { /* nop */ }
      });
    });
    recur && this.children.forEach(s => s.linkValues());
  }

  updateValues(recur = true) {
    this.foreachValue(v => v.get());
    recur && this.children.forEach(s => s.updateValues());
  }

  protected foreachValue(cb: (v: Value) => void) {
    const values = this.values;
    (Reflect.ownKeys(values) as string[]).forEach(k => cb(values[k]));
  }
}
