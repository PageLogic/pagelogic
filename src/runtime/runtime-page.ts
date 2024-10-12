import * as dom from '../html/dom';
import { Page } from '../page/page';
import { ScopeProps, ValueProps } from '../page/props';
import { Scope } from '../page/scope';
import { ForeachScope } from '../page/scopes/foreach-scope';
import { Value } from '../page/value';

export class RuntimePage extends Page {

  override init() {
    const props = this.global.pageProps!.root[0];
    const e = this.global.getElement(`${props.dom}`, this.global.doc)!;
    this.root = this.load(props, this.global, e);
    this.refresh(this.root);
  }

  override load(props: ScopeProps, p: Scope, e: dom.Element): Scope {
    const s = this.newScope(props, e)
      .setName(props.name)
      .setValues(props.values)
      .makeObj()
      .linkTo(p);
    if (s instanceof ForeachScope) {
      return s;
    }
    props.children?.forEach(child => {
      const e = this.global.getElement(`${child.dom}`, s.e)!;
      this.load(child, s, e);
    });
    return s;
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
