import { ServerElement } from '../html/server-dom';
import { Global } from './global';
import { ValueProps } from './props';
import { Scope } from './scope';
import { Value } from './value';

export abstract class Page {
  glob: Global;
  root!: Scope;

  constructor(glob: Global) {
    this.glob = glob;
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
    scope.unlink();
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
        let o: Value | undefined;
        try {
          o = dep.apply(scope.obj);
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
    const values = scope.values;
    (Reflect.ownKeys(values) as string[]).forEach(k => cb(values[k]));
    scope.children.forEach(s => this.foreachValue(s, cb));
  }
}
