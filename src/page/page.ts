import { ServerElement } from '../html/server-dom';
import { Global } from './global';
import { ValueProps } from './props';
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

  abstract init(): void;
  abstract newScope(id: number, e: ServerElement): Scope;
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
      this.unlinkValues(scope);
      this.linkValues(scope);
      this.updateValues(scope);
    } catch (err) {
      console.error('Context.refresh()', err);
    }
    this.refreshLevel--;
  }

  unlinkScope(scope: Scope): Scope {
    this.unlinkValues(scope);
    scope.unlink(this);
    return scope;
  }

  relinkScope(scope: Scope, parent: Scope, ref?: Scope): Scope {
    scope.linkTo(this, parent, ref);
    this.linkValues(scope);
    return scope;
  }

  protected unlinkValues(scope: Scope) {
    this.foreachValue(scope, v => {
      v.src.forEach(o => o.dst.delete(v));
      v.dst.forEach(o => o.src.delete(v));
    });
  }

  protected linkValues(scope: Scope) {
    this.foreachValue(scope, v => {
      const scope = v.scope;
      v.props.deps?.forEach(dep => {
        try {
          const o = dep.apply(scope.obj);
          o.dst.add(v);
          v.src.add(o);
        } catch (ignored) { /* nop */ }
      });
    });
  }

  protected updateValues(scope: Scope) {
    this.foreachValue(scope, v => {
      v.get();
    });
  }

  protected foreachValue(scope: Scope, cb: (v: Value) => void) {
    const values = scope.values;
    (Reflect.ownKeys(values) as string[]).forEach(k => cb(values[k]));
    scope.children.forEach(s => this.foreachValue(s, cb));
  }
}
