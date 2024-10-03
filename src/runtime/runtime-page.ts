import * as dom from '../html/dom';
import * as k from '../page/consts';
import { Page } from '../page/page';
import { ScopeProps, ValueProps } from '../page/props';
import { Scope } from '../page/scope';
import { Value } from '../page/value';

//TODO: add values to parent scope for named scopes, if they don't conflict
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
    if (name.startsWith(k.RT_ATTR_VALUE_PREFIX)) {
      const key = name.substring(k.RT_ATTR_VALUE_PREFIX.length);
      ret.cb = (scope, v) => {
        //TODO: batch DOM changes
        scope.e.setAttribute(key, `${v != null ? v : ''}`);
        return v;
      };
    } else if (name.startsWith(k.RT_TEXT_VALUE_PREFIX)) {
      const key = name.substring(k.RT_TEXT_VALUE_PREFIX.length);
      const t = scope.getText(key)!;
      ret.cb = (_, v) => {
        t.textContent = `${v != null ? v : ''}`;
        return v;
      };
    }
    return ret;
  }
}
