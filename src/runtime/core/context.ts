import { Scope, ScopeProps } from "./scope";

export const DATA_KEY = 'data';

export const RESERVED_PASSIVE_PREFIX = '$';
export const NAME_KEY = '$name';
export const SCOPE_KEY = '$scope';
export const OUTER_KEY = '$outer';
export const PRINT_KEY = '$print';
export const VALUE_KEY = '$value';

export interface ContextProps {
}

export class Context {
  props: ContextProps;
  scopes: Map<string, Scope>;
  cycle: number;
  refreshLevel: number;
  pushLevel: number;
  root?: Scope;

  constructor(props: ContextProps) {
    this.props = props;
    this.scopes = new Map();
    this.cycle = 0;
    this.refreshLevel = this.pushLevel = 0;
  }

  load(props: ScopeProps): this {
    this.root = this.loadScope(null, props);
    return this;
  }

  refresh(scope?: Scope, nextCycle = true): this {
    this.refreshLevel++;
    try {
      nextCycle && this.cycle++;
      scope || (scope = this.root);
      scope?.unlinkValues();
      scope?.linkValues();
      scope?.updateValues();
    } catch (err) {
      console.error('Context.refresh()', err);
    }
    this.refreshLevel--;
    return this;
  }

  loadScope(parent: Scope | null, props: ScopeProps): Scope {
    const ret = this.scopeFactory(parent, props);
    this.scopes.set(props.id, ret);
    props.children && ret.loadChildren(props.children);
    return ret;
  }

  scopeFactory(parent: Scope | null, props: ScopeProps): Scope {
    return new Scope(this, parent, props);
  }
}
