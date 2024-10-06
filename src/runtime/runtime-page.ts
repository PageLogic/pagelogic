import * as dom from '../html/dom';
import { Page } from '../page/page';
import { ScopeProps, ScopeType, ValueProps } from '../page/props';
import { Scope } from '../page/scope';
import { ForeachScope } from '../page/scopes/foreach-scope';
import { Value } from '../page/value';

export class RuntimePage extends Page {

  override init() {
    const load = (props: ScopeProps, p: Scope) => {
      const e = this.global.getElement(props.dom);
      const s = this.newScope(props.dom, e, props.type)
        .setName(props.name)
        .setValues(this, props.values)
        .makeObj(this)
        .linkTo(this, p);
      props.children?.forEach(child => load(child, s));
      return s;
    };
    this.root = load(this.global.props!.root[0], this.global);
    this.refresh(this.root);
  }

  override newScope(id: number, e: dom.Element, type?: ScopeType): Scope {
    if (type === 'foreach') {
      return new ForeachScope(id, e, this.global);
    }
    return new Scope(id, e, this.global);
  }

  override newValue(
    page: Page, scope: Scope, name: string, props: ValueProps
  ): Value {
    const ret = new Value(page, scope, props);
    this.global.setValueCB(name, ret, scope);
    return ret;
  }
}
