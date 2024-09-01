
// =============================================================================
// Context
// =============================================================================

export interface ContextProps {
  root: ScopeProps;
}

export class Context {
  root: Scope;
  cycle: number;

  constructor(props: ContextProps) {
    this.root = new Scope(props.root, this);
    this.cycle = 0;
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
}

// =============================================================================
// Value
// =============================================================================

export type ValueExp = () => unknown;
export type ValueRef = () => Value | undefined;

export interface ValueProps {
  key?: string;
  val?: unknown;
  exp?: ValueExp;
  ref?: ValueRef[];
}

export class Value {
  ctx: Context;
  scope: Scope;
  cycle: number;
  key?: string;
  exp?: () => unknown;
  val?: unknown;

  constructor(props: ValueProps, ctx: Context, scope: Scope) {
    this.ctx = ctx;
    this.scope = scope;
    this.cycle = 0;
    this.key = props.key;
    this.exp = props.exp;
    this.val = props.val;
  }

  get(): unknown {
    if (this.exp && this.cycle !== this.ctx.cycle) {
      //TODO
    }
    return this.val;
  }
}
