import { Context, DATA_KEY, OUTER_KEY, PRINT_KEY, SCOPE_KEY, VALUE_KEY } from "./context";
import { Value, ValueProps } from "./value";

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
  object: any;
  handler: any;
  proxy: any;
  values: Map<string, Value>;
  replicator?: Replicator;

  constructor(ctx: Context, parent: Scope | null, props: ScopeProps, cloneIndex?: number) {
    this.ctx = ctx;
    this.parent = parent;
    this.props = props;
    this.id = props.id + (cloneIndex != null ? `.${cloneIndex}` : '');
    this.isClone = (cloneIndex != null);
    this.children = [];
    this.object = {};
    this.handler = this.initHandler();
    this.proxy = new Proxy(this.object, this.handler);
    this.values = this.initValues();
    if (parent) {
      parent.children.push(this);
    }
    if (props.name && !this.isClone) {
      (parent ? parent : this).object[props.name] = this.proxy;
    }
    this.object[SCOPE_KEY] = this;
    this.object[OUTER_KEY] = () => parent?.proxy;
    this.object[PRINT_KEY] = (v: any) => v != null ? `${v}` : '';
    this.object[VALUE_KEY] = (key: string) => {
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
    this.values.forEach(v => this.proxy[v.key]);
    this.children.forEach(s => s.updateValues());
  }

  get(key: string | symbol): any {
    return this.proxy[key];
  }

  set(key: string | symbol, val: any) {
    this.proxy[key] = val;
  }

  call(key: string | symbol, args: any[]): any {
  }

  getReplicator(): Replicator {
    !this.replicator && (this.replicator = new Replicator(this));
    return this.replicator;
  }

  protected lookup(target: any, prop: string) {
    let ret = target[prop];
    if (ret === undefined) {
      for (
        let scope = target.$scope;
        scope;
        scope = scope.props.isolate ? null : scope.parent
      ) {
        if ((ret = scope.object[prop]) !== undefined) {
          break;
        }
      }
    }
    return ret;
  }

  protected initHandler(): ProxyHandler<any> {
    return {
      get: (target: any, prop: string, receiver?: any) => {
        let ret = this.lookup(target, prop);
        if (ret instanceof Value) {
          ret = ret.get();
        }
        return ret;
      },

      set: (target: any, prop: string, val: any, receiver?: any) => {
        const i = this.lookup(target, prop);
        if (i instanceof Value) {
          i.set(val);
          return true;
        }
        return false;
      },

      apply: (target: any, thisArg: any, argumentsList: any[]) => {
        return target.apply(this.proxy, argumentsList);
      }
    };
  }

  protected initValues(): Map<string, Value> {
    const ret = new Map();
    if (this.props.values) {
      for (let key of Reflect.ownKeys(this.props.values)) {
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

  dataValueCB(v: any): any {
    // return Array.isArray(v) && !this.scope.isClone ? this.replicate(v) : v;
    if (Array.isArray(v) && !this.scope.isClone) {
      return this.replicate(v);
    }
    if (this.clones?.length) {
      this.removeClones(0);
    }
    return v;
  }

  replicate(vv: any[]): any {
    !this.clones && (this.clones = []);
    // data window (offset/length)
    let offset = 0, length = vv.length;
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
