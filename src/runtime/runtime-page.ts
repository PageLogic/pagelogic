import { Page } from '../page/page';
import { ScopeProps } from '../page/props';
import { Scope } from '../page/scope';

//TODO: add values to parent scope for named scopes, if they don't conflict
export class RuntimePage extends Page {

  override init() {
    const load = (props: ScopeProps, p: Scope) => {
      // const e = this.glob.doc.domIdElements[props.dom];
      return p;
    };
    this.root = load(this.glob.props!.root[0], this.glob);
  }
}
