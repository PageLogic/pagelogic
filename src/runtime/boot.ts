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

export const ELEMENT_NODE = 1;
export const TEXT_NODE = 3;
export const COMMENT_NODE = 8;
export const DOCUMENT_NODE = 9;

export interface Context {
  cycle: number;
  root: Scope;
}

export interface Descriptor {
  root: Scope;
}

export interface Scope {
  id: string;
  values: { [key: string]: Value | string };
  name?: string;
  isolate?: boolean;
  parent?: Scope;
  children?: Scope[];
  define?: string;
}

export interface Value {
  fn: core.ValueFunction;
  refs?: core.RefFunction[];
}

export async function boot(
  win: Window, doc: Document, descr: Descriptor, cleanup: boolean
): Promise<core.Scope> {
  const ctx = new core.Context();
  const eMap = new Map<string, Element>();

  doc.querySelectorAll(`[${LOGIC_ID_ATTR}]`).forEach(e => {
    eMap.set(e.getAttribute(LOGIC_ID_ATTR)!, e);
  });

  function collectScopeTexts(e: Element, ret: Node[]) {
    const nn = Array.from(e.childNodes);
    for (let i = 0; i < (nn.length - 1); i++) {
      const n = nn[i];
      if (
        n.nodeType === ELEMENT_NODE &&
        !(n as Element).hasAttribute(LOGIC_ID_ATTR)
      ) {
        collectScopeTexts(n as Element, ret);
        continue;
      }
      if (
        n.nodeType !== COMMENT_NODE ||
        !(n.nodeValue?.startsWith(LOGIC_TEXT_MARKER1))
      ) {
        continue;
      }
      cleanup && n.remove();
      const n2 = nn[i + 1];
      if (n2.nodeType === TEXT_NODE) {
        ret.push(n2);
        continue;
      }
      const t = e.insertBefore(doc.createTextNode(''), n2);
      cleanup && n2.remove();
      ret.push(t);
    }
    return ret;
  }

  function load(p: core.Scope | null, scope: Scope): core.Scope | undefined {
    const e = eMap.get(scope.id)!;
    const props: core.Props = {
      $name: scope.name,
    };

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
        } else if (key.startsWith(TEXT_VALUE_PREFIX)) {
          const id = parseInt(key.substring(TEXT_VALUE_PREFIX.length));
          cb = (scope, v) => {
            scope.$object.$texts[id].nodeValue = v ? `${v}` : '';
            return v;
          };
        }
        props[key] = new core.Value(val.fn, val.refs, cb);
      }
    });

    if (scope.define) {
      const d = new core.Definition(ctx, scope.define, props, e);
    } else {
      const s = core.newScope(ctx, props, p, null);
      s.$object.$dom = e;
      s.$object.$texts = collectScopeTexts(e, []);
      if (scope.name) {
        //TODO
      }
      scope.children?.forEach(child => load(s, child));
      return s;
    }
  }
  const root = load(null, descr.root)!;

  cleanup && eMap.forEach((e) => e.removeAttribute(LOGIC_ID_ATTR));

  ctx.refresh(root);
  return root;
}
