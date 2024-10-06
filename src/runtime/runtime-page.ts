import * as dom from '../html/dom';
import { Page } from '../page/page';
import { ScopeProps, ValueProps } from '../page/props';
import { Scope } from '../page/scope';
import { Value } from '../page/value';

export class RuntimePage extends Page {

  override init() {
    const load = (props: ScopeProps, p: Scope) => {
      // const e = (this.glob.doc as ServerDocument).domIdElements[props.dom];
      const e = this.glob.getElement(props.dom);
      const s = this.newScope(props.dom, e)
        .setName(props.name)
        .setValues(this, props.values)
        .makeObj(this)
        .linkTo(this, p);
      props.children?.forEach(child => load(child, s));
      return s;
    };
    this.root = load(this.glob.props!.root[0], this.glob);
    this.refresh(this.root);
  }

  override newScope(id: number, e: dom.Element): Scope {
    return new Scope(id, e);
  }

  override newValue(
    page: Page, scope: Scope, name: string, props: ValueProps
  ): Value {
    const ret = new Value(page, scope, props);
    this.glob.setValueCB(name, ret, scope);
    return ret;
  }
}
