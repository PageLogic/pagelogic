import { ValueProps } from './props';
import { Scope } from './scope';

export abstract class Value {
  scope: Scope;
  props: ValueProps;
  src: Set<Value>;
  dst: Set<Value>;

  constructor(scope: Scope, props: ValueProps) {
    this.scope = scope;
    this.props = props;
    this.src = new Set();
    this.dst = new Set();
  }

  get(): unknown {
    //TODO
    return null;
  }

}
