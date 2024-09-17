import estraverse from 'estraverse';
import * as es from 'estree';
import { CompilerPage } from '../compiler-page';
import { Path, Stack } from '../util';
import { getProperty } from './estree-utils';

export function resolveValueDependencies(page: CompilerPage): CompilerPage {
  if (page.errors.length > 0) {
    return page;
  }

  function getPropertyName(e: es.MemberExpression): string | undefined {
    const p = e.property;
    if (p.type === 'Identifier') {
      return p.name;
    }
    if (p.type === 'Literal' && typeof p.value === 'string') {
      return p.value;
    }
    return undefined;
  }

  function makePath(exp: es.MemberExpression) {
    const p = new Path();
    function f(e: es.MemberExpression) {
      if (e.object.type === 'MemberExpression') {
        f(e.object);
      } else if (e.object.type === 'ThisExpression') {
        p.push('this');
      }
      const name = getPropertyName(e);
      p.length && p.push(name ?? '');
    }
    f(exp);
    return p.length > 1 && p[0] === 'this' ? p : null;
  }

  function resolveValueExpression(
    stack: Stack<es.ObjectExpression>,
    name: string,
    exp: es.FunctionExpression
  ) {
    const paths = new Array<Path>();
    estraverse.traverse(exp as es.Node, {
      enter(node) {
        if (node.type !== 'MemberExpression') {
          return;
        }
        const path = makePath(node);
        if (!path) {
          return;
        }
        for (const start of paths) {
          if (path.startsWith(start)) {
            for (let i = start.length; i < path.length; i++) {
              start.push(path[i]);
            }
            return;
          }
        }
        paths.push(path);
      }
    });
  }

  function resolveScope(stack: Stack<es.ObjectExpression>) {
    const scope = stack.peek()!;
    const values = getProperty(scope, 'values') as es.ObjectExpression;
    values?.properties.forEach(p => {
      if (p.type === 'Property' && p.key.type === 'Identifier') {
        const value = p.value as es.ObjectExpression;
        const exp = getProperty(value, 'exp') as es.FunctionExpression;
        resolveValueExpression(stack, p.key.name, exp);
      }
    });
    const children = getProperty(scope, 'children') as es.ArrayExpression;
    children?.elements.forEach(e => {
      resolveScope(new Stack(...stack, e as es.ObjectExpression));
    });
  }

  const props = page.ast as es.ObjectExpression;
  const rootScopes = getProperty(props, 'root') as es.ArrayExpression;
  const rootScope = rootScopes.elements[0] as es.ObjectExpression;
  resolveScope(new Stack(rootScope));
  return page;
}
