import { Glob } from './glob';
import { Scope } from './scope';
import { Value } from './value';

export const SRC_LOGIC_ATTR_PREFIX = ':';
export const SRC_SYSTEM_ATTR_PREFIX = '::';
export const SRC_ATTR_NAME_REGEX = /^:{0,2}[a-zA-Z_][a-zA-Z0-9_$-]*$/;

export const SRC_NAME_ATTR = SRC_SYSTEM_ATTR_PREFIX + 'name';

export const RT_ATTR_VALUE_PREFIX = 'attr$';
export const RT_TEXT_VALUE_PREFIX = 't$';
export const RT_SCOPE_PARENT_KEY = '$parent';
export const RT_SCOPE_VALUE_KEY = '$value';
export const RT_SYS_VALUE_PREFIX = '$';

export const HTML_TEXT_MARKER1 = '-t';
export const HTML_TEXT_MARKER2 = '-/t';

export abstract class Page {
  glob: Glob;
  root!: Scope;

  constructor(glob: Glob) {
    this.glob = glob;
    this.init();
  }

  abstract init(): void;

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

  unlinkValues(scope: Scope) {
    this.foreachValue(scope, v => {
      v.src.forEach(o => o.dst.delete(v));
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
