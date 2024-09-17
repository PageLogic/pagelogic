import { ArrayExpression, FunctionExpression, MemberExpression, ObjectExpression, Property } from 'acorn';
import { CompilerPage } from '../compiler-page';
import { getProperty } from './acorn-utils';
import { Path, Stack } from '../util';
import { simple } from 'acorn-walk';

export function resolveValueDependencies(page: CompilerPage): CompilerPage {
  if (page.errors.length > 0) {
    return page;
  }

  function getPropertyName(e: MemberExpression): string | undefined {
    const p = e.property;
    if (p.type === 'Identifier') {
      return p.name;
    }
    if (p.type === 'Literal' && typeof p.value === 'string') {
      return p.value;
    }
    return undefined;
  }

  function makePath(exp: MemberExpression) {
    const p = new Path();
    function f(e: MemberExpression) {
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
    stack: Stack<ObjectExpression>,
    name: string,
    exp: FunctionExpression
  ) {
    const paths = new Array<Path>();
    simple(exp, {
      MemberExpression(exp) {
        const path = makePath(exp);
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
    // for (const p of paths) {
    //   console.log(p.join('.'));//tempdebug
    // }
  }

  function resolveScope(stack: Stack<ObjectExpression>) {
    const scope = stack.peek()!;
    const values = getProperty(scope, 'values') as ObjectExpression;
    values?.properties.forEach(p => {
      if (p.type === 'Property' && p.key.type === 'Identifier') {
        const value = p.value as ObjectExpression;
        const exp = getProperty(value, 'exp') as FunctionExpression;
        resolveValueExpression(stack, p.key.name, exp);
      }
    });
    const children = getProperty(scope, 'children') as ArrayExpression;
    children?.elements.forEach(e => {
      resolveScope(new Stack(...stack, e as ObjectExpression));
    });
  }

  const rootScopes = getProperty(page.ast, 'root') as ArrayExpression;
  const rootScope = rootScopes.elements[0] as ObjectExpression;
  resolveScope(new Stack(rootScope));
  return page;
}
