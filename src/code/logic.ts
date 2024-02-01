import { Literal } from "acorn";
import { generate } from "escodegen";
import {
  ATTR_VALUE_PREFIX, CLASS_VALUE_PREFIX, DID_VALUE_PREFIX, HANDLE_VALUE_PREFIX,
  ID_DATA_ATTR,
  LOGIC_VALUE_PREFIX, EVENT_VALUE_PREFIX, STYLE_VALUE_PREFIX,
  TEXT_MARKER1_PREFIX, TEXT_MARKER2_PREFIX,
  TEXT_VALUE_PREFIX,
  WILL_VALUE_PREFIX
} from "../runtime/web/context";
import { CodeError, CodeSource } from "./types";
import { Stack, addJSXAttribute, getJSXElementName } from "./utils";
import {
  JSXAttribute,
  JSXClosingElement,
  JSXElement,
  JSXExpressionContainer,
  JSXOpeningElement,
  walker,
} from "./walker";

export class CodeLogic {
  source: CodeSource;
  errors: CodeError[];
  root?: CodeScope;

  constructor(source: CodeSource) {
    this.source = source;
    this.errors = [];
    let count = 0;
    let stack = new Stack<CodeScope>();
    const that = this;
    walker.ancestor(this.source.ast!, {
      // @ts-ignore
      JSXOpeningElement(node: JSXOpeningElement, _, ancestors) {
        const parent = ancestors.length > 1
            ? ancestors[ancestors.length - 2]
            : null;
        if (CodeLogic.needsScope(node)) {
          const scope = new CodeScope(stack.peek() || null, node, parent, count++);
          scope.parent || (that.root = scope);
          addJSXAttribute(node, ID_DATA_ATTR, `${scope.id}`);
          node.selfClosing || stack.push(scope);
        }
      },
      // @ts-ignore
      JSXExpressionContainer(node, _, ancestors) {
        if (ancestors.length > 1) {
          const parent = ancestors[ancestors.length - 2];
          if (parent.type === 'JSXElement') {
            const scope = stack.peek();
            const id = scope?.addTextValue(node);
            node.type = 'JSXText';
            node.value = `<!--${TEXT_MARKER1_PREFIX}${id}-->`
                       + `<!--${TEXT_MARKER2_PREFIX}${id}-->`;
          }
        }
      },
      // @ts-ignore
      JSXClosingElement(node: JSXClosingElement, _, ancestors) {
        const parent = ancestors.length > 1
            ? ancestors[ancestors.length - 2]
            : null;
        const scope = stack.peek();
        if (scope && scope.nodeParent === parent) {
          stack.pop();
        }
      }
    });
  }

  static needsScope(node: JSXOpeningElement): boolean {
    if (
      node.name.type === 'JSXIdentifier' &&
      AUTO_SCOPE_NAMES[node.name.name]
    ) {
      return true;
    }
    for (let attr of node.attributes) {
      if (CodeLogic.isValueAttribute(attr)) {
        return true;
      }
    }
    return false;
  }

  static isValueAttribute(attr: JSXAttribute): boolean {
    return (
      attr.name.name.startsWith(LOGIC_ATTR_PREFIX) ||
      attr.value?.type === 'JSXExpressionContainer'
    );
  }
}

// =============================================================================
// CodeScope
// =============================================================================
const AKA_ATTR = ':aka';
const AUTO_SCOPE_NAMES: { [key: string]: string } = {
  'html': 'page', 'head': 'head', 'body': 'body'
};

export class CodeScope {
  parent: CodeScope | null;
  children: CodeScope[];
  node: JSXOpeningElement;
  nodeParent: JSXElement;
  id: number;
  name?: string;
  values: { [key: string]: CodeValue };
  textCount: number;

  constructor(
    parent: CodeScope | null,
    node: JSXOpeningElement, nodeParent: JSXElement,
    id: number
  ) {
    this.parent = parent;
    this.children = [];
    this.node = node;
    this.nodeParent = nodeParent;
    this.id = id;
    this.values = {};
    this.textCount = 0;
    if (parent) {
      parent.children.push(this);
    }
    if (node.name.type === 'JSXIdentifier') {
      this.name = AUTO_SCOPE_NAMES[node.name.name.toLowerCase()];
    }
    const extracted = new Array<number>();
    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i];
      if (CodeLogic.isValueAttribute(attr)) {
        const attrName = attr.name.name;
        if (attrName === AKA_ATTR && attr.value.type === 'Literal') {
          this.name = attr.value.value as string;
          extracted.push(i);
          continue;
        }
        for (let p of VALUE_PREFIXES) {
          const res = new RegExp(p.in).exec(attrName);
          if (res) {
            if (p.out !== null) {
              const valueName = p.out + attrName.substring(res[1].length);
              this.values[valueName] = new CodeValue(this/*, valueName*/, attr.value);
              extracted.push(i);
            }
            break;
          }
        }
      }
    }
    for (let i = 0; i < extracted.length; i++) {
      node.attributes.splice(extracted[i] - i, 1);
    }
  }

  addTextValue(node: JSXExpressionContainer): number {
    const id = this.textCount++;
    const name = `${TEXT_VALUE_PREFIX}${id}`;
    this.values[name] = new CodeValue(this, node)
    return id;
  }

  toJSON() {
    const ret: any = {
      id: this.id,
      values: this.values,
      children: this.children,
    }
    this.name && (ret.name = this.name);
    return ret;
  }
}

// =============================================================================
// CodeValue
// =============================================================================
const LOGIC_ATTR_PREFIX = ':';
const VALUE_PREFIXES = [
  { in: /^(\:aka)$/, out: null },
  { in: /^(\:class\-)[\w\-]+$/, out: CLASS_VALUE_PREFIX },
  { in: /^(\:style\-)[\w\-]+$/, out: STYLE_VALUE_PREFIX },
  { in: /^(\:on\-)[\w\-]+$/, out: EVENT_VALUE_PREFIX },
  { in: /^(\:handle\-)[\w\-]+$/, out: HANDLE_VALUE_PREFIX },
  { in: /^(\:did\-)[\w\-]+$/, out: DID_VALUE_PREFIX },
  { in: /^(\:will\-)[\w\-]+$/, out: WILL_VALUE_PREFIX },
  { in: /^(\:)[\w\-]+$/, out: LOGIC_VALUE_PREFIX },
  { in: /^()[\w\-]+$/, out: ATTR_VALUE_PREFIX },
]

export class CodeValue {
  scope: CodeScope;
  node: Literal | JSXExpressionContainer;

  constructor(scope: CodeScope, node: Literal | JSXExpressionContainer) {
    this.scope = scope;
    this.node = node;
  }

  toJSON() {
    const ret: any = {
    };
    if (this.node.type === 'Literal') {
      ret.value = this.node.value as string;
    } else {
      ret.code = generate(this.node.expression);
    }
    return ret;
  }
}
