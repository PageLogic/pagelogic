
// =============================================================================
// Context
// =============================================================================

export class Context {
  cycle = 0;
  refreshLevel = 0;
  pushLevel = 0;
  nextId = 0;

  refresh(scope: Scope, nextCycle = true) {
    this.refreshLevel++;
    try {
      nextCycle && this.cycle++;
      this.unlinkValues(scope);
      this.linkValues(scope);
      this.updateValues(scope);
    } catch (err) {
      console.error('Context.refresh()', err);
    }
    this.refreshLevel--;
  }

  private unlinkValues(scope: Scope) {
    this.foreachValue(scope, v => {
      v.src.forEach(o => o.dst.delete(v));
    });
  }

  private linkValues(scope: Scope) {
    this.foreachValue(scope, v => {
      v.refs?.forEach(ref => {
        let o: Value | undefined;
        try {
          o = ref.apply(scope);
          if (o === v) {
            o = scope.$parent ? ref.apply(scope.$parent) : undefined;
          }
        } catch (ignored) { /* nop */ }
        if (o) {
          v.src.add(o);
          o.dst.add(v);
        }
      });
    });
  }

  private updateValues(scope: Scope) {
    this.foreachValue(scope, v => {
      v.get();
    });
  }

  private foreachValue(scope: Scope, cb: (v: Value) => void) {
    const obj = scope.$object;
    for (const key in obj) {
      const val = key.startsWith('$') ? null : obj[key];
      val instanceof Value && cb(val);
    }
  }
}

// =============================================================================
// Scope
// =============================================================================

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/with#creating_dynamic_namespaces_using_the_with_statement_and_a_proxy
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create

export type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string | symbol]: any,
};

export interface Scope extends Props {
  $id: number;
  $context: Context;
  $props: Props;
  $object: Props;
  $scope: Scope;
  $parent: Scope | null;
  $children: Scope[];
  $isolate: boolean;
  $value: (key: string) => Value | undefined;
}

export function newScope(
  ctx: Context, props: Props,
  parent: Scope | null, proto: object | null,
  isolate = false
): Scope {
  const obj = { ...props };
  Object.setPrototypeOf(obj, proto);

  const ret = new Proxy(obj, {

    get: (target: Props, key: string | symbol) => {
      if (Reflect.has(target, key)) {
        const v = target[key];
        if (v instanceof Value) {
          return v.get();
        }
        return v;
      } else if (target.$parent && !target.$isolate) {
        return (target.$parent as Scope)[key];
      }
      return undefined;
    },

    set: (target: Props, key: string | symbol, val: unknown) => {
      if (Reflect.has(target, key)) {
        const v = target[key];
        if (v instanceof Value) {
          v.set(val);
          return true;
        }
        return false;
      } else if (target.$parent && !target.$isolate) {
        try {
          (target.$parent as Scope)[key] = val;
          return true;
        } catch (err) {
          return false;
        }
      }
      return false;
    },

  }) as Scope;

  for (const key in obj) {
    const val = obj[key];
    if (val instanceof Value) {
      val.scope = ret;
    }
  }

  obj.$id = ctx.nextId++;
  obj.$context = ctx;
  obj.$props = props;
  obj.$object = obj;
  obj.$scope = ret;
  obj.$parent = parent;
  obj.$children = [];
  obj.$isolate = isolate;

  obj.$value = (key: string) => {
    let scope: Scope | null = ret;
    let value: unknown = undefined;
    while (scope && !value) {
      value = scope.$object[key];
      scope = scope.$parent;
    }
    return value instanceof Value ? value : undefined;
  };

  if (parent) {
    parent.$children.push(ret);
  }

  return ret;
}

// =============================================================================
// Value
// =============================================================================

export type ValueFunction = (this: Scope) => unknown;
export type RefFunction = (this: Scope) => Value | undefined;

const uninit = Symbol('uninit');

export class Value {
  fn: ValueFunction;
  refs?: RefFunction[];
  cb: (v: unknown) => unknown;
  v1: unknown = uninit;
  v2: unknown;
  cycle = 0;
  src = new Set<Value>();
  dst = new Set<Value>();
  scope!: Scope;

  constructor(fn: ValueFunction, refs?: RefFunction[], cb?: (v: unknown) => unknown) {
    this.fn = fn;
    this.refs = refs;
    this.cb = cb || ((v: unknown) => v);
  }

  get() {
    this.update();
    return this.v2;
  }

  set(val: unknown) {
    const old = this.v1;
    this.v1 = val;
    this.fn = function() { return val; };
    if (old == null ? val != null : val !== old) {
      this.v2 = this.cb(val);
      this.propagate();
    }
  }

  update() {
    if (this.cycle < this.scope.$context.cycle) {
      this.cycle = this.scope.$context.cycle;
      const old = this.v1;
      try {
        this.v1 = this.fn.apply(this.scope);
      } catch (err) {
        console.error(err);
      }
      if (old == null ? this.v1 != null : this.v1 !== old) {
        this.v2 = this.cb(this.v1);
        this.dst && this.scope.$context.refreshLevel < 1 && this.propagate();
      }
    }
  }

  propagate() {
    const ctx = this.scope.$context;
    if (ctx.pushLevel < 1) {
      ctx.cycle++;
    }
    ctx.pushLevel++;
    try {
      this.dst?.forEach(v => v.update());
    } catch (ignored) { /* nop */ }
    ctx.pushLevel--;
  }
}
