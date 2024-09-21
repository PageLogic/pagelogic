import { Element } from '../html/dom';
import { Page, RT_ATTR_VALUE_PREFIX } from '../page/page';
import { ScopeProps, ValueProps } from '../page/props';
import { Scope } from '../page/scope';
import { Value } from '../page/value';
import { ServerScope } from '../server/server-scope';
import { ServerValue } from '../server/server-value';

//TODO: add values to parent scope for named scopes, if they don't conflict
export class RuntimePage extends Page {

  override init() {
    const load = (props: ScopeProps, p: Scope) => {
      const e = this.glob.doc.domIdElements[props.dom];
      const s = this.newScope(props.dom, e)
        .setName(props.name)
        .setValues(this, props.values)
        .activate(this)
        .linkTo(p);
      props.children?.forEach(child => load(child, s));
      return s;
    };
    this.root = load(this.glob.props!.root[0], this.glob);
    this.refresh(this.root);
  }

  override newScope(id: number, e: Element): Scope {
    return new ServerScope(id, e);
  }

  override newValue(
    page: Page, scope: Scope, name: string, props: ValueProps
  ): Value {
    const ret = new ServerValue(page, scope, props);
    if (name.startsWith(RT_ATTR_VALUE_PREFIX)) {
      const key = name.substring(RT_ATTR_VALUE_PREFIX.length);
      ret.cb = (scope, v) => {
        //TODO: batch DOM changes
        scope.e.setAttribute(key, `${v}`);
        return v;
      };
    }
    return ret;
  }
}
