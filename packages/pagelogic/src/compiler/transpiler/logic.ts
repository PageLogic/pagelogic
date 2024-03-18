import { Source } from '../types';
import * as html from '../parser/html';

export const DOM_SCOPE_ID_ATTR = 'data-pl-id';
const AUTO_NAMES: { [key: string]: string } = {
  'HTML': 'page',
  'HEAD': 'head',
  'BODY': 'body'
};

export interface Logic {
  id: number;
  children: Logic[];
}

export function parseLogic(source: Source) {
  let nextId = 0;

  function needsScope(dom: html.Element) {
    if (AUTO_NAMES[dom.name]) {
      return true;
    }
    return false;
  }

  function scan(dom: html.Element, scope?: Logic): Logic | undefined {
    if (!scope || needsScope(dom)) {
      const s = {
        id: nextId++,
        children: [],
      };
      dom.setAttribute(DOM_SCOPE_ID_ATTR, `${s.id}`);
      scope && scope.children.push(s);
      scope = s;
    }
    dom.children.forEach(n => {
      if (n.type === 'element') {
        scan(n as html.Element, scope);
      } else if (n.type === 'text') {
        //TODO
      }
    });
    return scope;
  }

  if (source.errors.length < 1) {
    source.logic = scan(source.doc!.documentElement!);
  }
}
