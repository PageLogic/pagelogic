import { Literal } from "acorn";
import { CodeSource } from "./types";
import { JSXAttribute, JSXElement, JSXExpressionContainer, JSXIdentifier, JSXOpeningElement, walker } from "./walker";
import {
  ATTR_VALUE_PREFIX, CLASS_VALUE_PREFIX, DID_VALUE_PREFIX, HANDLE_VALUE_PREFIX,
  LOGIC_VALUE_PREFIX, ON_VALUE_PREFIX, STYLE_VALUE_PREFIX, TEXT_VALUE_PREFIX,
  WILL_VALUE_PREFIX
} from "../runtime/web/context";

export class CodeLogic {
  source: CodeSource;
  root?: CodeScope;

  constructor(source: CodeSource) {
    this.source = source;
    let count = 0;
    let currScope: CodeScope | null = null;
    const that = this;
    walker.ancestor(this.source.ast!, {
      // @ts-ignore
      JSXOpeningElement(node, _, ancestors) {
        if (CodeLogic.needsScope(node)) {
          currScope = new CodeScope(currScope, node, count++);
          currScope.parent || (that.root = currScope);
          node.selfClosing && (currScope = currScope.parent);
        }
      },
      // @ts-ignore
      JSXExpressionContainer(node, _, ancestors) {
        if (ancestors.length > 1) {
          const parent = ancestors[ancestors.length - 2];
          if (parent.type === 'JSXElement') {
            currScope?.addTextValue(node);
          }
        }
      },
      // @ts-ignore
      JSXClosingElement(node, _, ancestors) {
        if (node === currScope?.node) {
          currScope = currScope!.parent;
        }
      }
    });
  }

  static needsScope(node: JSXOpeningElement): boolean {
    if (AUTO_SCOPE_NAMES[node.name.name]) {
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
      attr.value.type === 'JSXExpressionContainer'
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
  id: number;
  name?: string;
  values: CodeValue[];
  textCount: number;

  constructor(parent: CodeScope | null, node: JSXOpeningElement, id: number) {
    this.parent = parent;
    this.children = [];
    this.node = node;
    this.id = id;
    this.values = [];
    this.textCount = 0;
    if (parent) {
      parent.children.push(this);
    }
    for (let attr of node.attributes) {
      if (CodeLogic.isValueAttribute(attr)) {
        const attrName = attr.name.name;
        if (attrName === AKA_ATTR && attr.value.type === 'Literal') {
          this.name = attr.value.value as string;
          continue;
        }
        for (let p of VALUE_PREFIXES) {
          const res = new RegExp(p.in).exec(attrName);
          if (res) {
            if (p.out !== null) {
              const valueName = p.out + attrName.substring(res[1].length);
              this.values.push(new CodeValue(this, valueName, attr.value));
            }
            break;
          }
        }
      }
    }
  }

  addTextValue(node: JSXExpressionContainer) {
    const name = `${TEXT_VALUE_PREFIX}${this.textCount++}`;
    this.values.push(new CodeValue(this, name, node))
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
  { in: /^(\:on\-)[\w\-]+$/, out: ON_VALUE_PREFIX },
  { in: /^(\:handle\-)[\w\-]+$/, out: HANDLE_VALUE_PREFIX },
  { in: /^(\:did\-)[\w\-]+$/, out: DID_VALUE_PREFIX },
  { in: /^(\:will\-)[\w\-]+$/, out: WILL_VALUE_PREFIX },
  { in: /^(\:)[\w\-]+$/, out: LOGIC_VALUE_PREFIX },
  { in: /^[\w\-]+$/, out: ATTR_VALUE_PREFIX },
]

export class CodeValue {
  scope: CodeScope;
  name: string;
  node: Literal | JSXExpressionContainer;

  constructor(scope: CodeScope, name: string, node: Literal | JSXExpressionContainer) {
    this.scope = scope;
    this.name = name;
    this.node = node;
  }

  toJSON() {
    const ret: any = {
      name: this.name
    };
    if (this.node.type === 'Literal') {
      ret.name = this.node.value as string;
    }
    return ret;
  }
}
