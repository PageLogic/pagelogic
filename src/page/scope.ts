import { Element } from '../html/dom';
import { Glob } from './glob';
import { Page, RT_SCOPE_ISOLATED_KEY, RT_SCOPE_NAME_KEY, RT_SCOPE_PARENT_KEY, RT_SCOPE_VALUE_KEY } from './page';
import { Value } from './value';

export const DOM_ID_ATTR = 'data-lid';

export abstract class Scope {
  parent?: Scope;
  id: number;
  e: Element;
  name?: string;
  isolated?: boolean;
  values: { [key: string]: Value };
  proxy!: { [key: string]: unknown };
  children: Scope[];

  constructor(id: number, e: Element) {
    this.id = id;
    this.e = e;
    this.values = {};
    this.children = [];
  }

  linkTo(p: Scope, ref?: Scope): this {
    let i = ref ? p.children.indexOf(ref) : -1;
    i = i < 0 ? p.children.length : i;
    p.children.splice(i, 0, this);
    this.parent = p;
    !this.e.parent && this.e.linkTo(p.e, ref?.e);
    return this;
  }

  unlink(): this {
    this.e.unlink();
    const i = this.parent ? this.parent.children.indexOf(this) : -1;
    i >= 0 && this.parent!.children.splice(i, 1);
    delete this.parent;
    return this;
  }

  activate(glob: Glob, page: Page) {
    const that = this;

    this.values[RT_SCOPE_NAME_KEY] = glob.newValue(page, this, {
      exp: function() { return that.name; }
    });
    this.values[RT_SCOPE_ISOLATED_KEY] = glob.newValue(page, this, {
      exp: function() { return that.isolated; }
    });
    this.values[RT_SCOPE_PARENT_KEY] = glob.newValue(page, this, {
      exp: function() { return that.parent?.proxy; }
    });
    this.values[RT_SCOPE_VALUE_KEY] = glob.newValue(page, this, {
      exp: function() { return (key: string) => that.values[key]; }
    });

    return new Proxy(this.values, {

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

      //TODO: set()

    });
  }
}
