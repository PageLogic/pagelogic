import { Comment, Element, Text } from '../html/dom';
import * as k from './consts';
import { Page } from './page';
import { ValueProps } from './props';
import { Value } from './value';

export type ScopeValues = { [key: string]: Value };
export type ScopeObj = { [key: string]: unknown };

export class Scope {
  parent?: Scope;
  id: number;
  e: Element;
  name?: string;
  isolated?: boolean;
  values: ScopeValues;
  obj!: ScopeObj;
  children: Scope[];

  constructor(id: number, e: Element) {
    this.id = id;
    this.e = e;
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

  //TODO: add name to parent if not conflicting
  linkTo(p: Scope, ref?: Scope): this {
    let i = ref ? p.children.indexOf(ref) : -1;
    i = i < 0 ? p.children.length : i;
    p.children.splice(i, 0, this);
    this.parent = p;
    !this.e.parent && p.e.insertBefore(this.e, ref?.e ?? null);
    return this;
  }

  //TODO: remove name from parent if it points to this
  unlink(): this {
    this.e.unlink();
    const i = this.parent ? this.parent.children.indexOf(this) : -1;
    i >= 0 && this.parent!.children.splice(i, 1);
    delete this.parent;
    return this;
  }

  domText(id: string): Text | undefined {
    const key = k.HTML_TEXT_MARKER1 + id;
    const f = (e: Element): Text | undefined => {
      for (let i = 0; i < e.children.length; i++) {
        const n = e.children[i];
        if (n.type === 'element') {
          const ret = f(n as Element);
          if (ret) {
            return ret;
          }
        } else if (n.type === 'comment' && (n as Comment).value === key) {
          return e.children[i + 1] as Text;
        }
      }
    };
    return f(this.e);
  }

  activate(page: Page): this {
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
      exp: function() { return (key: string) => that.values[key]; }
    });

    this.obj = new Proxy(this.values, {

      get: (target: { [key: string]: Value }, key: string | symbol) => {
        const v = target[key as string];
        if (v) {
          return v.get();
        }
        const isolated = target[k.RT_SCOPE_ISOLATED_KEY];
        const parent = !isolated && target[k.RT_SCOPE_PARENT_KEY];
        if (parent) {
          return parent[key];
        }
        return undefined;
      },

      set: (target: { [key: string]: Value }, key: string | symbol, val: unknown) => {
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

    });

    return this;
  }
}
