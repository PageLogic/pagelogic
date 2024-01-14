// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/with#creating_dynamic_namespaces_using_the_with_statement_and_a_proxy

export const SCOPE_KEY = '$scope';
export const VALUE_KEY = '$value';
export const ANON_PREFIX = '$v$';
export const UNINITED = Symbol('uninited');

/**
 * Root of a reactive context.
 */
export class Context {
  global: Scope;

  cycle: number;
  refreshLevel: number;
  pushLevel: number;

  constructor() {
    this.global = new Scope(this, globalThis);
    this.cycle = 0;
    this.refreshLevel = this.pushLevel = 0;
  }

  refresh(scope?: Scope) {
    if (!scope && !(scope = this.global)) {
      return this;
    }
    this.refreshLevel++;
    try {
      this.cycle++;
      scope.unlinkValues();
      scope.linkValues();
      scope.updateValues();
    } catch (err: any) {
      console.error('Context.refresh()', err);
    }
    this.refreshLevel--;
    return this;
  }
}

/**
 * Visibility scope in a reactive context.
 */
export class Scope {
  context: Context;
  parent?: Scope;
  children: Scope[];
  values: Map<string, Value>;
  object: any;
  proxy: any;

  constructor(context: Context, proto?: any) {
    this.context = context;
    this.children = [];
    this.values = new Map();
    this.object = Object.create(proto || null);
    this.proxy = Scope.initProxy(this.object);
    this.object[SCOPE_KEY] = this;
    this.object[VALUE_KEY] = (key: string) => this.lookupValue(key);
  }

  link(parent: Scope, name?: string): this {
    this.unlink();
    this.parent = parent;
    parent.children.push(this);
    if (name) {
      parent.object[name] = this.proxy;
    }
    return this;
  }

  unlink(recursively = false) {
    if (!this.parent) {
      return;
    }
    this.unlinkValues();
    const i = this.parent.children.indexOf(this);
    i >= 0 && this.parent.children.splice(i, 1);
    this.parent = undefined;
    if (recursively) {
      while (this.children.length > 0) {
        this.children[this.children.length - 1].unlink();
      }
    }
  }

  unlinkValues() {
    this.values.forEach(v => v.unlink());
    this.children.forEach(s => s.unlinkValues());
  }

  linkValues() {
    this.values.forEach(v => v.link());
    this.children.forEach(s => s.linkValues());
  }

  updateValues() {
    this.values.forEach((_, k) => this.proxy[k]);
    this.children.forEach(s => s.updateValues());
  }

  lookupValue(key: string): Value | undefined {
    let scope: Scope | undefined = this;
    let value = undefined;
    while (scope && !value) {
      value = scope.values.get(key);
      scope = scope.parent;
    }
    return value instanceof Value ? value : undefined;
  }

  static lookupProperty(target: any, prop: string) {
    let ret = target[prop];
    if (ret === undefined) {
      for (let scope = target[SCOPE_KEY]; scope; scope = scope.parent) {
        if ((ret = scope.object[prop]) !== undefined) {
          break;
        }
      }
    }
    return ret;
  }

  static initProxy(object: any): any {
    return new Proxy(object, {
      get: (target: any, prop: string, receiver?: any) => {
        let ret = Scope.lookupProperty(target, prop);
        if (ret instanceof Value) {
          ret = ret.get();
        }
        return ret;
      },
    });
  }
}

type ValueExp = () => any;
type ValueRef = () => Value | undefined;

/**
 * Value in a scope in a reactive context.
 */
export class Value {
  context: Context;
  scope: Scope;

  exp: ValueExp;
  ref?: ValueRef[];
  cb?: (v: any) => any;

  src?: Set<Value>;
  dst?: Set<Value>;

  cycle: number;
  v1: any;
  v2: any;

  constructor(context: Context, scope: Scope, exp: ValueExp, key?: string, ref?: ValueRef[]) {
    this.context = context;
    this.scope = scope;
    this.exp = exp;
    this.ref = ref;
    this.cycle = 0;
    this.v1 = UNINITED;
    key && (scope.object[key] = this);
    key || (key = ANON_PREFIX + scope.values.size);
    scope.values.set(key, this);
  }

  link() {
    this.ref?.forEach(ref => {
      let that = undefined;
      try {
        // that = runExp(this.scope.proxy, ref);
        that = ref();
        if (that === this) {
          that = this.scope.parent
              // ? runExp(this.scope.parent.proxy, ref)
              ? ref()
              : undefined;
        }
      } catch (ignored: any) {}
      if (that) {
        (this.src ?? (this.src = new Set())).add(that);
        (that.dst ?? (that.dst = new Set())).add(this);
      }
    });
  }

  unlink() {
    this.src?.forEach(o => o?.dst?.delete(this));
    delete this.src;
  }

  get(): any {
    this.cycle === this.context.cycle || this.update();
    return this.v2;
  }

  set(v: any) {
    const old = this.v1;
    this.v1 = v;
    this.exp = () => v;
    if (old == null ? v != null : old !== v) {
      this.cb ? this.v2 = this.cb(v) : this.v2 = v;
      this.propagate();
    }
  }

  private update() {
    this.cycle = this.context.cycle;
    const old = this.v1;
    try {
      // this.v1 = runExp(this.scope.proxy, this.exp);
      this.v1 = this.exp();
    } catch (error: any) {
      console.error(error);
    }
    if (old == null ? this.v1 != null : old !== this.v1) {
      this.cb ? this.v2 = this.cb(this.v1) : this.v2 = this.v1;
      this.dst && this.context.refreshLevel < 1 && this.propagate();
    }
  }

  private propagate() {
    const { context } = this;
    if (context.pushLevel < 1) {
      context.cycle++;
    }
    context.pushLevel++;
    try {
      this.dst?.forEach(v => v.get());
    } catch (ignored: any) {}
    context.pushLevel--;
  }
}

// function runExp(obj: any, exp: () => any): any {
//   // @ts-ignore
//   with (obj) {
//     return exp();
//   }
// }
