import { ServerElement } from '../html/server-dom';
import { Global } from './global';
import { ScopeProps, ValueProps } from './props';
import { Scope } from './scope';
import { Value } from './value';

export abstract class Page {
  global: Global;
  root!: Scope;

  constructor(global: Global) {
    this.global = global;
    global.makeObj(this);
    this.init();
  }

  unlinkScope(scope: Scope): Scope {
    scope.unlink(this);
    return scope;
  }

  relinkScope(scope: Scope, parent: Scope, ref?: Scope): Scope {
    scope.linkTo(this, parent, ref);
    return scope;
  }

  abstract init(): void;
  abstract newScope(props: ScopeProps, e: ServerElement): Scope;
  abstract newValue(page: Page, scope: Scope, name: string, props: ValueProps): Value;

  // ===========================================================================
  // reactivity
  // ===========================================================================
  cycle = 0;
  refreshLevel = 0;
  pushLevel = 0;

  refresh(scope: Scope, nextCycle = true) {
    this.refreshLevel++;
    try {
      nextCycle && this.cycle++;
      scope.unlinkValues();
      scope.linkValues();
      scope.updateValues();
    } catch (err) {
      console.error('Context.refresh()', err);
    }
    this.refreshLevel--;
  }
}
