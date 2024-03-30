import * as rt from '../runtime/boot';
import * as html from './html';
import { Source } from './types';

const AUTO_NAMES: { [key: string]: string } = {
  'HTML': 'page',
  'HEAD': 'head',
  'BODY': 'body'
};

export class Logic {
  parent: Logic | null;
  id: number;
  ref: html.Element;
  // values
  vv: { [key: string]: html.Attribute };
  // texts
  tt: html.Text[];
  // children
  cc: Logic[];

  constructor(
    parent: Logic | null,
    id: number,
    ref: html.Element,
    vv: { [key: string]: html.Attribute } | null
  ) {
    this.parent = parent;
    this.id = id;
    this.ref = ref;
    this.vv = vv || {};
    this.tt = [];
    this.cc = [];
  }

  toJSON() {
    return {
      id: this.id,
      ref: this.ref,
      vv: this.vv,
      tt: this.tt,
      cc: this.cc
    };
  }
}

export function parseLogic(source: Source) {
  let nextId = 0;

  function valueName(attrName: string) {
    let ret = attrName;
    if (!ret.startsWith(rt.LOGIC_ATTR_MARKER)) {
      ret = rt.ATTR_VALUE_PREFIX + ret;
    } else {
      ret = ret.substring(1).replace(':', '$');
    }
    return ret;
  }

  function needsScope(dom: html.Element) {
    const vv: { [key: string]: html.Attribute } = {};
    if (AUTO_NAMES[dom.name] && !dom.getAttributeNode(rt.SCOPE_NAME_ATTR)) {
      vv[valueName(rt.SCOPE_NAME_ATTR)] = new html.Attribute(
        dom.doc, dom, rt.SCOPE_NAME_ATTR, AUTO_NAMES[dom.name], dom.loc
      );
    }
    dom.attributes.forEach(a => {
      if (
        a.name.startsWith(rt.LOGIC_ATTR_MARKER) ||
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
      const s = new Logic(scope || null, nextId++, dom, vv);
      dom.setAttribute(rt.DOM_ID_ATTR, `${s.id}`);
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
