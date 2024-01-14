// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/with#creating_dynamic_namespaces_using_the_with_statement_and_a_proxy

const SCOPE_KEY = '$scope';
const UNINITED = Symbol('uninited');

/**
 * Root of a reactive context.
 */
export class Context {
  global: Scope;
  root?: Scope;

  cycle: number;
  refreshLevel: number;
  pushLevel: number;

  constructor() {
    this.global = new Scope(this, globalThis);
    this.cycle = 0;
    this.refreshLevel = 0;
    this.pushLevel = 0;
  }

  refresh(scope?: Scope) {

  }
}

/**
 * Visibility scope in a reactive context.
 */
export class Scope {
  context: Context;
  parent?: Scope;
  children: Scope[];
  object: any;
  proxy: any;

  constructor(context: Context, proto?: any) {
    this.context = context;
    this.children = [];
    this.object = Object.create(proto || null);
    this.proxy = Scope.initProxy(this.object);
    this.object[SCOPE_KEY] = this;
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

  unlink() {
    if (!this.parent) {
      return;
    }
  }

  static initProxy(object: any): any {
    function lookup(target: any, prop: string) {
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
    return new Proxy(object, {
      get: (target: any, prop: string, receiver?: any) => {
        let ret = lookup(target, prop);
        if (ret instanceof Value) {
          ret = ret.get();
        }
        return ret;
      },
    });
  }
}

/**
 * Value in a scope in a reactive context.
 */
export class Value {
  context: Context;
  scope: Scope;

  exp: () => any;
  ref?: string[];
  src?: Set<Value>;
  dst?: Set<Value>;
  cb?: (v: any) => any;

  cycle: number;
  v1: any;
  v2: any;

  constructor(context: Context, scope: Scope, exp: () => any, ref?: string[]) {
    this.context = context;
    this.scope = scope;
    this.exp = exp;
    this.ref = ref;
    this.cycle = 0;
    this.v1 = UNINITED;
  }

  get(): any {
    if (this.cycle !== this.context.cycle) {
      this.refresh();
    }
    return this.v2;
  }

  set(v: any) {

  }

  refresh() {
    this.cycle = this.context.cycle;
    const old = this.v1;
    try {
      runExp(this.scope.proxy, this.exp);
    } catch (ignored: any) {}
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
      this.dst?.forEach(v => v.refresh());
    } catch (ignored: any) {}
    context.pushLevel--;
  }
}

function runExp(obj: any, exp: () => any): any {
  // @ts-ignore
  with (obj) {
    return exp();
  }
}
