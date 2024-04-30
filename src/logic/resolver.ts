import estraverse from 'estraverse';
import * as acorn from 'acorn';
import * as es from 'estree';
import { PageError } from '../source/parser';
import { Logic, Scope, Value } from './loader';
import { esIdentifier } from './utils';

export interface ExpressionReference {

}

export function resolve(logic: Logic): Logic {
  if (logic.errors.length > 0) {
    return logic;
  }

  function lookupKey(scope: Scope, key: string, ascend: boolean): Scope | Value | null {
    const value = scope.values[key];
    if (value) {
      return value;
    }
    for (const child of scope.children) {
      if (child.name === key) {
        return child;
      }
    }
    if (ascend && scope.parent) {
      return lookupKey(scope.parent, key, true);
    }
    return null;
  }

  function lookupPath(scope: Scope, path: string[]): Array<Scope | Value>{
    const ret = new Array<Scope | Value>();
    for (let i = 0; i < path.length; i++) {
      const item = lookupKey(scope, path[i], i === 0);
      if (!item) {
        break;
      }
      ret.push(item);
      if (item.type === 'value') {
        break;
      }
      scope = item;
    }
    return ret;
  }

  function getReference(
    stack: es.Node[]
  ): { path: string[], exp: es.MemberExpression | null } {
    const path: string[] = [];
    let exp: es.MemberExpression | null = null;
    for (let i = stack.length - 1; i >= 0; i--) {
      const node = stack[i];
      if (node.type !== 'MemberExpression') {
        break;
      }
      if (node.property.type === 'Literal') {
        if (typeof node.property.value !== 'string') {
          break;
        }
        const key = node.property.value;
        node.property = esIdentifier(key, node.property);
        node.computed = false;
      }
      if (node.property.type !== 'Identifier') {
        break;
      }
      path.push(node.property.name);
      exp = node;
    }
    return { path, exp };
  }

  function resolveValue(scope: Scope, value: Value) {
    if (typeof value.val !== 'object') {
      return;
    }
    const stack: es.Node[] = [];
    estraverse.traverse(value.val as es.Expression, {
      enter: (node: es.Node) => {
        stack.push(node);
        if (
          node.type === 'MemberExpression' &&
          node.object.type === 'ThisExpression' &&
          node.property.type === 'Identifier'
        ) {
          const { path, exp } = getReference(stack);
          const chain = lookupPath(scope, path);
          if (chain.length < 1 || chain[chain.length - 1].type !== 'value') {
            logic.errors.push(new PageError(
              'error', `Reference not found: ${path.join('.')}`, value.src.loc
            ));
            return;
          }
          let ref: es.MemberExpression | null = exp;
          for (let i = 0; i < (path.length - chain.length); i++) {
            ref = ref?.object.type === 'MemberExpression' ? ref.object : null;
          }
          ref && value.refs.push(ref as acorn.MemberExpression);
        }
      },

      leave: () => {
        stack.pop();
      }
    });
  }

  function resolveScope(scope: Scope) {
    (Reflect.ownKeys(scope.values) as string[]).forEach(key => {
      resolveValue(scope, scope.values[key]);
    });
    scope.texts.forEach(value => {
      resolveValue(scope, value);
    });
    scope.children.forEach(child => {
      resolveScope(child);
    });
  }
  resolveScope(logic.root);

  return logic;
}
