import * as dom from '../source/dom';
import * as acorn from 'acorn';
import * as utils from './utils';
import { PageError, Source } from '../source/parser';
import { ATTR_VALUE_PREFIX, LOGIC_ID_ATTR, LOGIC_TEXT_MARKER1, LOGIC_TEXT_MARKER2, SCOPE_NAME_KEY } from '../runtime/boot';
import { DIRECTIVE_TAG_PREFIX } from '../source/preprocessor';

export const LOGIC_ATTR_NAME_PREFIX = ':';
export const DEFAULT_TAG_SCOPES: { [key: string]: string } = {
  HTML: 'page',
  HEAD: 'head',
  BODY: 'body'
};
export const DEFINE_DIRECTIVE_TAG = DIRECTIVE_TAG_PREFIX + 'DEFINE';
export const FOREACH_DIRECTIVE_TAG = DIRECTIVE_TAG_PREFIX + 'FOREACH';
export const SELECT_DIRECTIVE_TAG = DIRECTIVE_TAG_PREFIX + 'SELECT';
export const DIRECTIVES = [
  DEFINE_DIRECTIVE_TAG, FOREACH_DIRECTIVE_TAG, SELECT_DIRECTIVE_TAG
];
export const DEFINE_TAG_ATTR = 'tag';

export interface Logic {
  source: Source;
  errors: PageError[];
  root: Scope;
  docroot?: string;
  imports?: Source[];
}

export interface Scope {
  type: 'scope',
  id: string;
  tagName: string;
  name: string | null;
  values: { [key: string]: Value };
  texts: Value[];
  parent: Scope | null;
  children: Scope[];
  src: dom.Node;
  define?: string;
}

export interface Value {
  type: 'value',
  key?: string;
  val: string | acorn.Expression;
  refs: acorn.MemberExpression[];
  src: dom.Node;
  isFunction?: boolean;
}

export function load(source: Source, global: Scope | null, docroot?: string): Logic {
  const scopeNameAttrKey = attrName(SCOPE_NAME_KEY);
  const errors = [...source.errors];
  let count = 0;

  function load(e: dom.Element, p: Scope | null): Scope {
    const ret: Scope = {
      type: 'scope',
      id: `${count++}`,
      tagName: e.name,
      name: DEFAULT_TAG_SCOPES[e.name] ?? null,
      values: {},
      texts: [],
      children: [],
      parent: p || null,
      src: e
    };
    e.setAttribute(LOGIC_ID_ATTR, ret.id);
    if (e.name === DEFINE_DIRECTIVE_TAG) {
      e.name = 'TEMPLATE';
      const tag = e.getAttribute(DEFINE_TAG_ATTR);
      if (!tag || !/^\w+(-\w+)+$/.test(tag)) {
        errors.push(new PageError(
          'error', `Missing or invalid "${DEFINE_TAG_ATTR}" attribute`, e.loc
        ));
        return ret;
      }
      e.removeAttribute(DEFINE_DIRECTIVE_TAG);
      ret.define = tag;
    }
    const nameAttr = e.getAttributeNode(scopeNameAttrKey);
    if (nameAttr) {
      if (typeof nameAttr.value === 'string') {
        ret.name = nameAttr.value;
      } else {
        errors.push(new PageError(
          'error', `${SCOPE_NAME_KEY} must be a string`, nameAttr.loc
        ));
      }
      e.delAttributeNode(nameAttr);
    }
    // logic attributes
    for (let i = 0; i < e.attributes.length;) {
      const attr = e.attributes[i];
      if (
        attr.name.startsWith(LOGIC_ATTR_NAME_PREFIX) ||
        typeof attr.value === 'object'
      ) {
        const key = valueName(attr.name);
        const val = fixValueExpression(attr.value as acorn.Expression);
        ret.values[key] = { type: 'value', key: attr.name, val, refs: [], src: attr };
        e.attributes.splice(i, 1);
        continue;
      }
      i++;
    }
    // logic texts & nested scopes
    const f = (p: dom.Element) => {
      for (let i = 0; i < p.children.length; i++) {
        const child = p.children[i];
        if (child.type === 'element') {
          const e = child as dom.Element;
          if (needsScope(e)) {
            const scope = load(e, ret);
            ret.children.push(scope);
          } else {
            f(e);
          }
        } else if (child.type === 'text') {
          const t = child as dom.Text;
          if (typeof t.value === 'object') {
            const id = ret.texts.length;
            ret.texts.push({ type: 'value', val: t.value, refs: [], src: t });
            // prefix a marker comment
            const m1 = new dom.Comment(e.doc, null, LOGIC_TEXT_MARKER1 + id, e.loc);
            p.children.splice(i++, 0, m1);
            // replace with second marker
            const m2 = new dom.Comment(e.doc, null, LOGIC_TEXT_MARKER2, e.loc);
            p.children.splice(i, 1, m2);
          }
        }
      }
    };
    f(e);
    return ret;
  }

  const root = source.errors.length < 1
    ? load(
      source.doc.documentElement!,
      global ? { ...global, children: [] } : null
    )
    : {
      type: 'scope', id: '0', tagName: 'HTML', name: null,
      values: {}, texts: [], children: [], parent: null,
      src: source.doc.documentElement!
    } as Scope;

  return { source, errors, docroot, root };
}

function needsScope(e: dom.Element): boolean {
  if (DIRECTIVES.includes(e.name) || DEFAULT_TAG_SCOPES[e.name]) {
    return true;
  }
  for (const attr of e.attributes) {
    if (
      attr.name.startsWith(LOGIC_ATTR_NAME_PREFIX) ||
      typeof attr.value === 'object'
    ) {
      return true;
    }
  }
  return false;
}

function valueName(attrName: string): string {
  if (attrName.startsWith(LOGIC_ATTR_NAME_PREFIX)) {
    attrName = attrName.substring(LOGIC_ATTR_NAME_PREFIX.length);
    attrName = attrName.replace(/^\w(-)/, '$');
    return attrName;
  }
  return ATTR_VALUE_PREFIX + attrName;
}

function attrName(valueName: string): string {
  if (valueName.startsWith(ATTR_VALUE_PREFIX)) {
    return valueName.substring(ATTR_VALUE_PREFIX.length);
  }
  valueName = valueName.replace(/^\w(\$)/, '-');
  valueName = LOGIC_ATTR_NAME_PREFIX + valueName;
  return valueName;
}

function fixValueExpression(exp: acorn.Expression): acorn.Expression {
  if (exp.type === 'ArrowFunctionExpression') {
    return makeClassicFunction(exp);
  }
  return exp;
}

/**
 * First level functions are forced to classic functions
 * (rather than arrow functions) so they can use `this`
 * in their body as required by PageLogic runtime.
 */
function makeClassicFunction(exp: acorn.ArrowFunctionExpression): acorn.FunctionExpression {
  if (exp.body.type !== 'BlockStatement') {
    exp.body = {
      type: 'BlockStatement',
      body: [{
        type: 'ReturnStatement',
        argument: exp.body,
        ...utils.acornLoc(exp)
      }],
      ...utils.acornLoc(exp)
    };
  }
  const ret = exp as unknown as acorn.FunctionExpression;
  ret.type = 'FunctionExpression';
  ret.expression = false;
  return ret;
}
