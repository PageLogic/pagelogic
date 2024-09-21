import { Element } from '../html/dom';
import { Page, RT_SCOPE_CHILDREN_KEY, RT_SCOPE_DOM_KEY, RT_SCOPE_ID_KEY, RT_SCOPE_ISOLATED_KEY, RT_SCOPE_NAME_KEY, RT_SCOPE_PARENT_KEY, RT_SCOPE_VALUE_KEY } from './page';
import { ValueProps } from './props';
import { Value } from './value';

export type ScopeValues = { [key: string]: Value };
export type ScopeObj = { [key: string]: unknown };

export abstract class Scope {
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
        const v = page.glob.newValue(page, this, values![key as string]);
        this.values[key as string] = v;
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
    !this.e.parent && this.e.linkTo(p.e, ref?.e);
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

  activate(page: Page): this {
    const that = this;
    const glob = page.glob;

    this.values[RT_SCOPE_ID_KEY] = glob.newValue(page, this, {
      exp: function() { return that.id; }
    });
    this.values[RT_SCOPE_NAME_KEY] = glob.newValue(page, this, {
      exp: function() { return that.name; }
    });
    this.values[RT_SCOPE_DOM_KEY] = glob.newValue(page, this, {
      exp: function() { return that.e; }
    });
    this.values[RT_SCOPE_ISOLATED_KEY] = glob.newValue(page, this, {
      exp: function() { return !!that.isolated; }
    });
    this.values[RT_SCOPE_PARENT_KEY] = glob.newValue(page, this, {
      exp: function() { return that.parent?.obj; }
    });
    this.values[RT_SCOPE_CHILDREN_KEY] = glob.newValue(page, this, {
      exp: function() { return that.children.map(child => child.obj); }
    });
    this.values[RT_SCOPE_VALUE_KEY] = glob.newValue(page, this, {
      exp: function() { return (key: string) => that.values[key]; }
    });

    this.obj = new Proxy(this.values, {

      get: (target: { [key: string]: Value }, key: string | symbol) => {
        const v = target[key as string];
        if (v) {
          return v.get();
        }
        const isolated = target[RT_SCOPE_ISOLATED_KEY];
        const parent = !isolated && target[RT_SCOPE_PARENT_KEY];
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
        const isolated = target[RT_SCOPE_ISOLATED_KEY];
        const parent = isolated ? null : target[RT_SCOPE_PARENT_KEY];
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
