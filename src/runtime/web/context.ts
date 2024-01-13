import { Context, ContextProps } from "../core/context";
import { Scope, ScopeProps } from "../core/scope";
import { WebScope } from "./scope";

export const GLOBAL_NAME = 'pagelogic';

export const LOGIC_ATTR_PREFIX = ':';
export const LOGIC_NAME_ATTR = LOGIC_ATTR_PREFIX + 'aka';

export const LOGIC_VALUE_PREFIX = '';
export const CLASS_VALUE_PREFIX = 'class$';
export const STYLE_VALUE_PREFIX = 'style$';
export const EVENT_VALUE_PREFIX = 'on$';
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

  override scopeFactory(parent: Scope | null, props: ScopeProps): Scope {
    return new WebScope(this, parent as WebScope, props);
  }

  // ---------------------------------------------------------------------------
  // events
  // ---------------------------------------------------------------------------

  initEvents() {
    const origAdd = EventTarget.prototype.addEventListener;
    const origRemove = EventTarget.prototype.removeEventListener;

    const lookupScope = (e: any) => {
      if (e.hasAttribute) {
        while (e && !e.hasAttribute(ID_DATA_ATTR)) {
          e = e.parentElement;
        }
        if (e && e.getAttribute) {
          return this.scopes.get(e.getAttribute(ID_DATA_ATTR));
        }
      }
      return null;
    }

    EventTarget.prototype.addEventListener = function(type, callback, options) {
      const scope = lookupScope(this) as WebScope | null;
      scope && scope.addListener(this, type, callback, options);
      origAdd.call(this, type, callback, options);
    }

    EventTarget.prototype.removeEventListener = function(type, callback, options) {
      const scope = lookupScope(this) as WebScope | null;
      scope && scope.removeListener(this, type, callback, options);
      origRemove.call(this, type, callback, options);
    }
  }
}
