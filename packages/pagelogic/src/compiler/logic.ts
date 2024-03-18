import * as acorn from 'acorn';
import * as html from './html';
import { Source } from './types';

export const LOGIC_ATTR_PREFIX = ':';
export const SCOPE_ATTR_PREFIX = LOGIC_ATTR_PREFIX + 'scope-';
export const CLASS_ATTR_PREFIX = LOGIC_ATTR_PREFIX + 'class-';
export const STYLE_ATTR_PREFIX = LOGIC_ATTR_PREFIX + 'style-';
export const HANDLE_ATTR_PREFIX = LOGIC_ATTR_PREFIX + 'handle-';
export const SCOPE_NAME_ATTR = SCOPE_ATTR_PREFIX + 'name';
export const ON_ATTR_PREFIX = LOGIC_ATTR_PREFIX + 'on-';

export const DOM_SCOPE_ID_ATTR = 'data-pagelogic';
const AUTO_NAMES: { [key: string]: string } = {
  'HTML': 'page',
  'HEAD': 'head',
  'BODY': 'body'
};

export interface Logic {
  id: number;
  // values
  vv: { [key: string]: string | html.Attribute };
  // texts
  tt: html.Text[];
  // children
  cc: Logic[];
  // generated code
  ast?: acorn.ObjectExpression;
}

export function parseLogic(source: Source) {
  let nextId = 0;

  function needsScope(dom: html.Element) {
    const vv: { [key: string]: string | html.Attribute } = {};
    if (AUTO_NAMES[dom.name]) {
      vv[SCOPE_NAME_ATTR] = AUTO_NAMES[dom.name];
    }
    dom.attributes.forEach(a => {
      if (
        a.name.startsWith(LOGIC_ATTR_PREFIX) ||
        typeof a.value !== 'string'
      ) {
        vv[a.name] = a;
      }
    });
    return Reflect.ownKeys(vv).length ? vv : null;
  }

  function scan(dom: html.Element, scope?: Logic): Logic | undefined {
    const vv = needsScope(dom);
    if (!scope || vv) {
      const s = {
        id: nextId++,
        vv: vv ?? {},
        tt: [],
        cc: [],
      };
      dom.setAttribute(DOM_SCOPE_ID_ATTR, `${s.id}`);
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
