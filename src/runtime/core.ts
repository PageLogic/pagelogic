
// =============================================================================
// Context
// =============================================================================

import { SCOPE_PARENT_KEY } from './boot';

export class Context {
  cycle = 0;
  refreshLevel = 0;
  pushLevel = 0;
  nextId = 0;
  definitions = new Map<string, Definition>();

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

  unlinkValues(scope: Scope) {
    this.foreachValue(scope, v => {
      v.src.forEach(o => o.dst.delete(v));
    });
  }

  protected linkValues(scope: Scope) {
    this.foreachValue(scope, v => {
      const scope = v.scope;
      v.refs?.forEach(ref => {
        let o: Value | undefined;
        try {
          o = ref.apply(scope);
          if (o === v) {
            o = scope[SCOPE_PARENT_KEY]
              ? ref.apply(scope[SCOPE_PARENT_KEY])
              : undefined;
          }
        } catch (ignored) { /* nop */ }
        if (o) {
          v.src.add(o);
          o.dst.add(v);
        }
      });
    });
  }

  protected updateValues(scope: Scope) {
    this.foreachValue(scope, v => {
      v.get();
    });
  }

  protected foreachValue(scope: Scope, cb: (v: Value) => void) {
    scope.$values.forEach(cb);
    scope.$children.forEach(s => this.foreachValue(s, cb));
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
  $dispose: () => void;
}

export function newScope(
  ctx: Context, props: Props,
  parent: Scope | null, proto: object | null,
  isolate = false,
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
      values.set(key, val);
      val.scope = ret;
    }
  }

  (obj as Scope).$id = ctx.nextId++;
  (obj as Scope).$context = ctx;
  (obj as Scope).$props = props;
  (obj as Scope).$object = obj;
  (obj as Scope).$scope = ret;
  (obj as Scope).$values = values;
  (obj as Scope).$name = props.$name;
  (obj as Scope)[SCOPE_PARENT_KEY] = parent;
  if (parent && props.$name) {
    // parent.$object[props.$name] = ret;
    const v = new Value(() => ret);
    v.scope = parent;
    parent.$values.set(props.$name, v);
    parent.$object[props.$name] = v;
  }
  (obj as Scope).$children = [];
  (obj as Scope).$isolate = isolate;

  (obj as Scope).$value = (key: string) => {
    let scope: Scope | null = ret;
    let value: unknown = undefined;
    while (scope && !value) {
      value = scope.$object[key];
      scope = scope[SCOPE_PARENT_KEY];
    }
    return value instanceof Value ? value : undefined;
  };

  (obj as Scope).$dispose = () => {
    ctx.unlinkValues(ret);
    if (parent) {
      const i = parent.$children.indexOf(ret);
      parent.$children.splice(i, 1);
      if (props.$name && parent.$object[props.$name] === ret) {
        delete parent.$object[props.$name];
        parent.$values.delete(props.$name);
      }
    }
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
export type ValueCallback = (scope: Scope, v: unknown) => unknown;

const uninit = Symbol('uninit');

export class Value {
  scope!: Scope;
  fn: ValueFunction;
  refs?: RefFunction[];
  cb: ValueCallback;
  v1: unknown = uninit;
  v2: unknown;
  cycle = 0;
  src = new Set<Value>();
  dst = new Set<Value>();

  constructor(
    fn: ValueFunction,
    refs?: RefFunction[],
    cb?: ValueCallback
  ) {
    this.fn = fn;
    this.refs = refs;
    this.cb = cb || ((_: Scope, v: unknown) => v);
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
      this.v2 = this.cb(this.scope, val);
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
        this.v2 = this.cb(this.scope, this.v1);
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
// Definition
// =============================================================================

export class Definition {
  props: Props;
  e: Element;

  constructor(ctx: Context, name: string, props: Props, e: Element) {
    this.props = props;
    this.e = e;
    ctx.definitions.set(name, this);
  }
}
