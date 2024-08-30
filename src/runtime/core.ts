
// =============================================================================
// Context
// =============================================================================

export interface ContextProps {
  root: ScopeProps;
}

export class Context {
  root: Scope;

  constructor(props: ContextProps) {
    this.root = new Scope(props.root);
  }
}

// =============================================================================
// Scope
// =============================================================================

export interface ScopeProps {
  id: string;
  values: { [key: string | symbol]: ValueProps };
  children?: ScopeProps[];
}

export class Scope {
  parent?: Scope;
  children: Scope[];
  values: { [key: string | symbol]: Value };

  constructor(props: ScopeProps, parent?: Scope) {
    this.parent = parent;
    this.children = [];
    this.values = {};
    Reflect.ownKeys(props.values).forEach(name => {
      this.values[name] = new Value(props.values[name], this);
    });
    props.children?.forEach(p => {
      this.children.push(new Scope(p, this));
    });
  }
}

// =============================================================================
// Value
// =============================================================================

export interface ValueProps {
  name?: string;
}

export class Value {
  scope: Scope;

  constructor(props: ValueProps, scope: Scope) {
    this.scope = scope;
    //TODO
  }
}
