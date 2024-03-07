import { Context, DATA_KEY, DID_VALUE_PREFIX, NAME_KEY, OUTER_KEY, PRINT_KEY, SCOPE_KEY, VALUE_KEY, WILL_VALUE_PREFIX } from './context';
import { Value, ValueProps } from './value';

export interface ScopeProps {
  id: string;
  name?: string;
  isolate?: boolean;
  values?: { [key: string]: ValueProps },
  children?: ScopeProps[];
}

export class Scope {
  ctx: Context;
  parent: Scope | null;
  props: ScopeProps;
  id: string;
  isClone: boolean;
  children: Scope[];
  object: { [key: string]: unknown };
  proxy: { [key: string]: unknown };
  values: Map<string, Value>;
  replicator?: Replicator;
  inited = false;

  constructor(ctx: Context, parent: Scope | null, props: ScopeProps, cloneIndex?: number) {
    this.ctx = ctx;
    this.parent = parent;
    this.props = props;
    this.id = props.id + (cloneIndex != null ? `.${cloneIndex}` : '');
    this.isClone = (cloneIndex != null);
    this.children = [];
    this.object = Object.create(null);
    this.proxy = new Proxy(this.object, this.initHandler());
    this.values = this.initValues();
    if (parent) {
      parent.children.push(this);
    }
    if (props.name && !this.isClone) {
      (parent ? parent : this).object[props.name] = this.proxy;
    }
    this.object[SCOPE_KEY] = this;
    this.object[NAME_KEY] = props.name;
    this.object[OUTER_KEY] = (() => parent?.proxy)();
    this.object[PRINT_KEY] = (v: unknown) => v != null ? `${v}` : '';
    this.object[VALUE_KEY] = (key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      let scope: Scope | null = this;
      let value = undefined;
      while (scope && !value) {
        value = scope.values.get(key);
        scope = scope.parent;
      }
      return value instanceof Value ? value : undefined;
    };
  }

  clone(cloneIndex: number): Scope {
    return new Scope(this.ctx, this.parent, this.props, cloneIndex);
  }

  dispose() {
    if (this.inited) {
      this.callDelegate(WILL_VALUE_PREFIX + 'dispose');
    }
    this.unlinkValues();
    while (this.children.length > 0) {
      this.children.pop()!.dispose();
    }
    if (this.parent) {
      const i = this.parent.children.indexOf(this);
      i >= 0 && this.parent.children.splice(i, 1);
      if (!this.isClone && this.props.name) {
        this.parent.values.get(this.props.name)?.unlink();
        this.parent.values.delete(this.props.name);
        delete this.parent.object[this.props.name];
      }
    }
    if (this.inited) {
      this.callDelegate(DID_VALUE_PREFIX + 'dispose');
    }
    this.inited = false;
  }

  unlinkValues() {
    this.values.forEach(v => v.unlink());
    this.children.forEach(s => s.unlinkValues());
  }

  linkValues() {
    this.values.forEach(v => v.link());
    this.children.forEach(s => s.linkValues());
  }

  updateValues() {
    if (!this.inited) {
      this.callDelegate(WILL_VALUE_PREFIX + 'init');
    }
    this.values.forEach(v => this.proxy[v.key]);
    this.children.forEach(s => s.updateValues());
    if (!this.inited) {
      this.callDelegate(DID_VALUE_PREFIX + 'init');
    }
    this.inited = true;
  }

  getReplicator(): Replicator {
    this.replicator || (this.replicator = new Replicator(this));
    return this.replicator;
  }

  loadChildren(props: ScopeProps[]) {
    props.forEach(p => this.ctx.loadScope(this, p));
  }

  protected callDelegate(name: string) {
    const d = this.proxy[name];
    d && (d as () => void)();
  }

  protected lookup(target: never, prop: string) {
    let ret = target[prop];
    if (ret === undefined) {
      for (
        let scope: Scope | null = target['$scope'] as Scope;
        scope;
        scope = scope.props.isolate ? null : scope.parent
      ) {
        if ((ret = scope.object[prop] as never) !== undefined) {
          break;
        }
      }
    }
    return ret;
  }

  protected initHandler(): ProxyHandler<{ [key: string]: unknown }> {
    return {
      get: (target: never, prop: string) => {
        let ret: never = this.lookup(target, prop);
        if (ret as object instanceof Value) {
          ret = (ret as Value).get() as never;
        }
        return ret;
      },

      set: (target: never, prop: string, val: never) => {
        const i = this.lookup(target, prop);
        if (i as object instanceof Value) {
          (i as Value).set(val);
          return true;
        }
        return false;
      },

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apply: (target: any, thisArg: never, argumentsList: never[]) => {
        return target.apply(this.proxy, argumentsList);
      }
    };
  }

  protected initValues(): Map<string, Value> {
    const ret = new Map();
    if (this.props.values) {
      for (const key of Reflect.ownKeys(this.props.values)) {
        if (typeof key === 'string') {
          const value = new Value(this, key, this.props.values[key]);
          this.object[key] = value;
          ret.set(key, value);
        }
      }
    }
    return ret;
  }

}

// =============================================================================
// Replicator
// =============================================================================

/**
 * Handles Scope replication.
 */
class Replicator {
  scope: Scope;
  clones?: Scope[];

  constructor(scope: Scope) {
    this.scope = scope;
  }

  dataValueCB(v: never): never | null {
    // return Array.isArray(v) && !this.scope.isClone ? this.replicate(v) : v;
    if (Array.isArray(v) && !this.scope.isClone) {
      return this.replicate(v);
    }
    if (this.clones?.length) {
      this.removeClones(0);
    }
    return v;
  }

  replicate(vv: never[]): never | null {
    !this.clones && (this.clones = []);
    // data window (offset/length)
    const offset = 0, length = vv.length;
    // add/update clones
    let ci = 0, di = offset;
    for (; di < (offset + length - 1); ci++, di++) {
      if (ci < this.clones.length) {
        // update existing clone
        this.clones[ci].proxy[DATA_KEY] = vv[di];
      } else {
        // create new clone
        const clone = this.scope.clone(ci);
        this.clones.push(clone);
        const v = vv[di];
        clone.values.get(DATA_KEY)!.props.exp = function() { return v; };
        this.scope.ctx.refresh(clone, false);
      }
    }
    // remove excess clones
    this.removeClones(length - 1);
    // patch scope data
    return length > 0 ? vv[offset + length - 1] : null;
  }

  removeClones(maxCount: number) {
    if (this.clones) {
      while (this.clones.length > maxCount) {
        this.clones.pop()!.dispose();
      }
    }
  }

}
