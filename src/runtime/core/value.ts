import { DATA_KEY } from "./context";
import { Scope } from "./scope";

export interface ValueProps {
  exp: ValueExp;
  refs?: ValueRef[];
}

export type ValueExp = () => any;
export type ValueRef = () => Value;

export class Value {
  key: string;
  props: ValueProps;
  cb?: (v: any) => any;
  protected static uninitialized = Symbol('uninitialized');
  protected scope: Scope;
  protected cycle: number;
  protected v1: any;
  protected v2: any;
  protected src?: Set<Value>;
  protected dst?: Set<Value>;

  constructor(scope: Scope, key: string, props: ValueProps, cb?: (v: any) => any) {
    this.scope = scope;
    this.key = key;
    this.props = props;
    this.cycle = 0;
    this.v1 = Value.uninitialized;
    this.v2 = undefined;
    this.cb = cb;
    if (key === DATA_KEY) {
      const replicator = this.scope.getReplicator();
      this.cb = (v) => replicator.dataValueCB(v);
    }
  }

  link() {
    this.props.refs?.forEach(ref => {
      let that = undefined;
      try {
        that = ref.apply(this.scope.proxy);
        if (that === this) {
          that = this.scope.parent ? ref.apply(this.scope.parent.proxy) : undefined;
        }
      } catch (ignored: any) {}
      if (that) {
        (this.src ?? (this.src = new Set())).add(that);
        (that.dst ?? (that.dst = new Set())).add(this);
      }
    });
  }

  unlink() {
    this.src?.forEach(o => o?.dst?.delete(this));
    delete this.src;
  }

  get() {
    this.update();
    return this.v2;
  }

  set(val: any) {
    const old = this.v1;
    this.v1 = val;
    this.props.exp = function() { return val; }
    if (old == null ? val != null : old !== val) {
      this.cb ? this.v2 = this.cb(val) : this.v2 = val;
      this.propagate();
    }
  }

  private update() {
    if (this.cycle < this.scope.ctx.cycle) {
      this.cycle = this.scope.ctx.cycle;
      const old = this.v1;
      try {
        this.v1 = this.props.exp.apply(this.scope.proxy);
      } catch (ignored: any) {}
      if (old == null ? this.v1 != null : old !== this.v1) {
        this.cb ? this.v2 = this.cb(this.v1) : this.v2 = this.v1;
        this.dst && this.scope.ctx.refreshLevel < 1 && this.propagate();
      }
    }
  }

  private propagate() {
    if (this.scope.ctx.pushLevel < 1) {
      this.scope.ctx.cycle++;
    }
    this.scope.ctx.pushLevel++;
    try {
      this.dst?.forEach(v => v.update());
    } catch (ignored: any) {}
    this.scope.ctx.pushLevel--;
  }

}
