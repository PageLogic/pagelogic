import { Context, ContextProps } from "../core/context";
import { Scope, ScopeProps } from "../core/scope";
import { WebScope } from "./scope";

export const LOGIC_ATTR_PREFIX = ':';
export const LOGIC_NAME_ATTR = LOGIC_ATTR_PREFIX + 'aka';

export const LOGIC_VALUE_PREFIX = '';
export const CLASS_VALUE_PREFIX = 'class$';
export const STYLE_VALUE_PREFIX = 'style$';
export const ON_VALUE_PREFIX = 'on$';
export const HANDLE_VALUE_PREFIX = 'handle$';
export const DID_VALUE_PREFIX = 'did$';
export const WILL_VALUE_PREFIX = 'will$';
export const ATTR_VALUE_PREFIX = 'attr$';
export const TEXT_VALUE_PREFIX = 'text$';

export const ID_DATA_ATTR = 'data-id';
export const TEXT_MARKER1_PREFIX = '-t';
export const TEXT_MARKER2_PREFIX = '-/';

export interface WebContextProps extends ContextProps {
}

export class WebContext extends Context {
  win: Window;
  doc: Document;

  constructor(win: Window, doc: Document, props: WebContextProps) {
    super(props);
    this.win = win;
    this.doc = doc;
  }

  protected override loadScope(parent: Scope | null, props: ScopeProps): Scope {
    const ret = new WebScope(this, parent as WebScope, props);
    this.scopes.set(props.id, ret);
    props.children?.forEach(p => this.loadScope(ret, p));
    return ret;
  }

}
