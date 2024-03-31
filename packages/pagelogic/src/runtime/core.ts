
// =============================================================================
// Context
// =============================================================================

import { BootFactory, DATA_KEY, LISTFOR_KEY, SCOPE_PARENT_KEY } from './boot';

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
    scope.$values.forEach(v => {
      v.src.forEach(o => o.dst.delete(v));
    });
  }

  private linkValues(scope: Scope) {
    scope.$values.forEach(v => {
      v.refs?.forEach(ref => {
        let o: Value | undefined;
        try {
          o = ref.apply(scope);
          if (o === v) {
            o = scope[SCOPE_PARENT_KEY] ? ref.apply(scope[SCOPE_PARENT_KEY]) : undefined;
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
    scope.$values.forEach(v => {
      v.get();
    });
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
  $values: Map<string, Value>;
  $name?: string;
  $parent: Scope | null;
  $children: Scope[];
  $isolate: boolean;
  $value: (key: string) => Value | undefined;
  $replicator: (data: unknown, parent: Scope) => Scope;
  $cloneOf: Scope | undefined;
  $clones: Scope[] | undefined;
}

export function newScope(
  ctx: Context, props: Props,
  parent: Scope | null, proto: object | null,
  isolate = false,
  cloneOf?: Scope
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
      } else if (target[SCOPE_PARENT_KEY] && !target.$isolate) {
        return (target[SCOPE_PARENT_KEY] as Scope)[key];
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
      } else if (target[SCOPE_PARENT_KEY] && !target.$isolate) {
        try {
          (target[SCOPE_PARENT_KEY] as Scope)[key] = val;
          return true;
        } catch (err) {
          return false;
        }
      }
      return false;
    },

  }) as Scope;

  const values = new Map<string, Value>();
  for (const key in obj) {
    const val = obj[key];
    if (val instanceof Value) {
      //TODO: this should be done by BootFactory.setValueScope()
      val.scope = ret;
      values.set(key, val);
    }
  }

  obj.$id = ctx.nextId++;
  obj.$context = ctx;
  obj.$props = props;
  obj.$object = obj;
  obj.$scope = ret;
  obj.$values = values;
  obj[SCOPE_PARENT_KEY] = parent;
  obj.$children = [];
  obj.$isolate = isolate;
  obj.$cloneOf = cloneOf;

  obj.$value = (key: string) => {
    let scope: Scope | null = ret;
    let value: unknown = undefined;
    while (scope && !value) {
      value = scope.$object[key];
      scope = scope[SCOPE_PARENT_KEY];
    }
    return value instanceof Value ? value : undefined;
  };

  obj.$replicator = (data: unknown, parent: Scope) => {
    const pp: Props = {};
    for (const k of (Reflect.ownKeys(props) as string[])) {
      const v = props[k];
      pp[k] = v instanceof Value ? new Value(v.fn, v.refs, v.cb) : v;
    }
    //TODO: id
    pp[DATA_KEY] = data;
    const clone = newScope(ctx, pp, parent, proto, isolate, ret);
    obj.$clones ? obj.$clones.push(clone) : (obj.$clones = [clone]);
    return clone;
  };

  if (parent) {
    parent.$children.push(ret);
    props.$name && (parent.$object[props.$name] = ret);
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

  constructor(
    fn: ValueFunction,
    refs?: RefFunction[],
    cb?: (v: unknown) => unknown
  ) {
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

// =============================================================================
// Factory
// =============================================================================

export class CoreFactory implements BootFactory {
  newContext(): Context {
    return new Context();
  }
  newScope(ctx: Context, props: Props, parent: Scope | null, proto: object | null, isolate: boolean): Scope {
    return newScope(ctx, props, parent, proto, isolate);
  }
  newValue(key: string, fn: ValueFunction, refs?: RefFunction[] | undefined): Value {
    return new Value(fn, refs);
  }
  setValueScope(key: string, value: Value, scope: Scope) {
    if (key === LISTFOR_KEY) {
      value.cb = (v: unknown) => {
        scope.$parent && scope.$replicator(v, scope.$parent);
      };
    }
  }
}
