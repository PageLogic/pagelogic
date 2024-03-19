import * as html from './html';
import { Source } from './types';

export const LOGIC_ATTR_MARKER = ':';
export const LOGIC_VALUE_MARKER = '$';
export const DOM_ID_ATTR = 'data-pagelogic';

export const SCOPE_NAME_ATTR = '::name';

export const ATTR_VALUE_PREFIX = 'attr$';

const AUTO_NAMES: { [key: string]: string } = {
  'HTML': 'page',
  'HEAD': 'head',
  'BODY': 'body'
};

export interface Logic {
  id: number;
  ref: html.Element;
  // values
  vv: { [key: string]: html.Attribute };
  // texts
  tt: html.Text[];
  // children
  cc: Logic[];
}

export function parseLogic(source: Source) {
  let nextId = 0;

  function valueName(attrName: string) {
    let ret = attrName;
    if (!ret.startsWith(LOGIC_ATTR_MARKER)) {
      ret = ATTR_VALUE_PREFIX + ret;
    } else {
      ret = ret.substring(1).replace(':', '$');
    }
    return ret;
  }

  function needsScope(dom: html.Element) {
    const vv: { [key: string]: html.Attribute } = {};
    if (AUTO_NAMES[dom.name]) {
      vv[valueName(SCOPE_NAME_ATTR)] = new html.Attribute(
        dom.doc, dom, SCOPE_NAME_ATTR, AUTO_NAMES[dom.name], dom.loc
      );
    }
    dom.attributes.forEach(a => {
      if (
        a.name.startsWith(LOGIC_ATTR_MARKER) ||
        typeof a.value !== 'string'
      ) {
        vv[valueName(a.name)] = a;
      }
    });
    return Reflect.ownKeys(vv).length ? vv : null;
  }

  function scan(dom: html.Element, scope?: Logic): Logic | undefined {
    const vv = needsScope(dom);
    if (!scope || vv) {
      const s = {
        id: nextId++,
        ref: dom,
        vv: vv ?? {},
        tt: [],
        cc: [],
      };
      dom.setAttribute(DOM_ID_ATTR, `${s.id}`);
      scope && scope.cc.push(s);
      scope = s;
    }
    dom.children.forEach(n => {
      if (n.type === 'element') {
        scan(n as html.Element, scope);
      } else if (
        n.type === 'text' &&
        typeof (n as html.Text).value !== 'string'
      ) {
        scope?.tt.push(n as html.Text);
      }
    });
    return scope;
  }

  if (source.doc && source.errors.length < 1) {
    source.logic = scan(source.doc!.documentElement!);
  }
}
