import * as core from './core';

export const LOGIC_ID_ATTR = 'data-pl';
export const LOGIC_TEXT_MARKER1 = '-t';
export const LOGIC_TEXT_MARKER2 = '-/t';

export const LOGIC_VALUE_PREFIX = '';
export const ATTR_VALUE_PREFIX = 'attr$';
export const TEXT_VALUE_PREFIX = 'text$';
export const SCOPE_PARENT_KEY = '$parent';
export const SCOPE_NAME_KEY = '$name';
export const SCOPE_VALUE_KEY = '$value';

export interface Context {
  cycle: number;
  root: Scope;
}

export interface Scope {
  id: string;
  values: { [key: string]: Value | string };
  name?: string;
  isolate?: boolean;
  parent?: Scope;
  children?: Scope[];
}

export interface Value {
  fn: core.ValueFunction;
  refs?: core.RefFunction[];
}

export async function boot(win: Window, doc: Document, descr: Scope): Promise<core.Scope> {
  const ctx = new core.Context();
  const eMap = new Map<string, Element>();
  doc.querySelectorAll(`[${LOGIC_ID_ATTR}]`).forEach(e => {
    eMap.set(e.getAttribute(LOGIC_ID_ATTR)!, e);
  });

  function load(p: core.Scope | null, scope: Scope): core.Scope {
    const e = eMap.get(scope.id)!;
    const props: core.Props = {};
    Object.entries(scope.values).forEach((obj) => {
      const key: string = obj[0];
      const val: Value | string = obj[1];
      if (typeof val === 'string') {
        props[key] = val;
      } else {
        let cb: core.ValueCallback | undefined;
        if (key.startsWith(ATTR_VALUE_PREFIX)) {
          const attrName = key.substring(ATTR_VALUE_PREFIX.length);
          cb = (scope, v) => {
            if (v != null) {
              scope.$dom.setAttribute(attrName, v ? `${v}` : '');
            } else {
              scope.$dom.removeAttribute(attrName);
            }
            return v;
          };
        }
        props[key] = new core.Value(val.fn, val.refs, cb);
      }
    });
    const s = core.newScope(ctx, props, p, null);
    if (scope.name) {
      //TODO
    }
    s.$object.$dom = e;
    scope.children?.forEach(child => load(s, child));
    return s;
  }

  const root = load(null, descr);
  ctx.refresh(root);
  return root;
}
