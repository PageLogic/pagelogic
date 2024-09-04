
// =============================================================================
// Context
// =============================================================================

export interface ContextProps {
  root: ScopeProps;
}

export class Context {
  root: Scope;
  cycle = 0;
  refreshLevel = 0;
  pushLevel = 0;

  constructor(props: ContextProps) {
    this.root = new Scope(props.root, this);
  }
}

// =============================================================================
// Scope
// =============================================================================

export interface ScopeProps {
  id: string;
  name?: string;
  values: { [key: string | symbol]: ValueProps };
  children?: ScopeProps[];
}

export class Scope {
  id: string;
  name?: string;
  values: { [key: string | symbol]: Value };
  ctx: Context;
  parent?: Scope;
  children: Scope[];

  constructor(props: ScopeProps, ctx: Context, parent?: Scope) {
    this.id = props.id;
    this.name = props.name;
    this.values = {};
    this.ctx = ctx;
    this.parent = parent;
    this.children = [];
    // values
    if (props.name) {
      this.values[props.name] = new Value({ val: this }, ctx, parent ?? this);
    }
    Reflect.ownKeys(props.values).forEach(k => {
      this.values[k] = new Value(props.values[k], ctx, this);
    });
    // children
    props.children?.forEach(p => {
      this.children.push(new Scope(p, ctx, this));
    });
  }

  dispose() {
    //TODO
  }

  linkValues() {
    Reflect.ownKeys(this.values).forEach(k => {
      const v = this.values[k];
      v.ref?.forEach(ref => {
        let o: Value | undefined;
        try {
          o = ref.apply(this);
          //TODO
          // if (o === v) {
          //   o = this[SCOPE_PARENT_KEY]
          //     ? ref.apply(scope[SCOPE_PARENT_KEY])
          //     : undefined;
          // }
        } catch (_) { /* nop */ }
        if (o) {
          v.src.add(o);
          o.dst.add(v);
        }
      });
    });
  }

  unlinkValues() {
    Reflect.ownKeys(this.values).forEach(k => {
      const v = this.values[k];
      v.src.forEach(o => o.dst.delete(v));
    });
  }

  refreshValues() {
    Reflect.ownKeys(this.values).forEach(k => {
      this.values[k].get();
    });
  }
}

// =============================================================================
// Value
// =============================================================================

export type ValueExp = (this: Scope) => unknown;
export type ValueRef = (this: Scope) => Value | undefined;
export type ValueCB = (scope: Scope, v: unknown) => unknown;

export interface ValueProps {
  val?: unknown;
  exp?: ValueExp;
  ref?: ValueRef[];
  cb?: ValueCB;
}

const uninited = Symbol('uninited');

export class Value {
  ctx: Context;
  scope: Scope;
  cycle: number;
  exp?: () => unknown;
  ref?: ValueRef[];
  val?: unknown;
  cb?: ValueCB;
  src = new Set<Value>();
  dst = new Set<Value>();

  constructor(props: ValueProps, ctx: Context, scope: Scope) {
    this.ctx = ctx;
    this.scope = scope;
    this.cycle = -1;
    this.exp = props.exp;
    this.ref = props.ref;
    this.val = props.val;
    this.cb = props.cb;
  }

  set(v: unknown) {
    delete this.exp;
    //TODO: unlink from sources
    delete this.ref;
    if (this.val == null ? v != null : v !== this.val) {
      this.val = (this.cb ? this.cb(this.scope, v) : v);
      if (this.dst.size) {
        this.propagate();
      }
    }
  }

  get(): unknown {
    if (this.cycle !== this.ctx.cycle) {
      this.update();
    }
    return this.val;
  }

  protected update() {
    const old = this.cycle < 0 ? uninited : this.val;
    this.cycle = this.ctx.cycle;
    if (this.exp) {
      try {
        this.val = this.exp.apply(this.scope);
      } catch (err) {
        //TODO: better logging
        console.error(err);
      }
    }
    if (old == null ? this.val != null : this.val !== old) {
      if (this.cb) {
        this.val = this.cb(this.scope, this.val);
      }
      if (this.dst.size && this.ctx.refreshLevel < 1) {
        this.propagate();
      }
    }
  }

  protected propagate() {
    if (this.ctx.pushLevel < 1) {
      this.ctx.cycle++;
    }
    this.ctx.pushLevel++;
    try {
      this.dst?.forEach(v => v.get());
    } catch (_) { /* nop */ }
    this.ctx.pushLevel--;
  }
}
