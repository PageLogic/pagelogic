import { Scope, ScopeProps } from "./scope";

export const DATA_KEY = 'data';

export const RESERVED_PASSIVE_PREFIX = '$';
export const SCOPE_KEY = '$scope';
export const OUTER_KEY = '$outer';
// export const PRINT_KEY = '$print';
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

  load(props: ScopeProps) {
    this.root = this.loadScope(null, props);
    return this;
  }

  refresh(scope?: Scope, nextCycle = true) {
    this.refreshLevel++;
    try {
      nextCycle && this.cycle++;
      scope || (scope = this.root);
      scope?.unlinkValues();
      scope?.linkValues();
      scope?.updateValues();
    } catch (err: any) {
      console.error('Context.refresh()', err);
    }
    this.refreshLevel--;
    return this;
  }

  protected loadScope(parent: Scope | null, props: ScopeProps): Scope {
    const ret = new Scope(this, parent, props);
    this.scopes.set(props.id, ret);
    props.children?.forEach(p => this.loadScope(ret, p));
    return ret;
  }

}
