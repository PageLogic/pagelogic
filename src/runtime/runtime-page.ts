import * as dom from '../html/dom';
import { Page } from '../page/page';
import { ScopeProps, ValueProps } from '../page/props';
import { Scope } from '../page/scope';
import { ForeachScope } from '../page/scopes/foreach-scope';
import { Value } from '../page/value';

export class RuntimePage extends Page {

  override init() {
    const load = (props: ScopeProps, p: Scope) => {
      const e = this.global.getElement(props.dom);
      const s = this.newScope(props, e)
        .setName(props.name)
        .setValues(props.values)
        .makeObj()
        .linkTo(p);
      props.children?.forEach(child => load(child, s));
      return s;
    };
    this.root = load(this.global.pageProps!.root[0], this.global);
    this.refresh(this.root);
  }

  override newScope(props: ScopeProps, e: dom.Element): Scope {
    if (props.type === 'foreach') {
      return new ForeachScope(this, props, e, this.global);
    }
    return new Scope(this, props, e, this.global);
  }

  override newValue(
    page: Page, scope: Scope, name: string, props: ValueProps
  ): Value {
    const ret = new Value(page, scope, props);
    this.global.setValueCB(name, ret, scope);
    return ret;
  }
}
