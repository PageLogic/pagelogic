import estraverse from 'estraverse';
import { CompilerPage } from '../compiler-page';
import { Path, Stack } from '../util';
import { getProperty, getPropertyName } from './estree-utils';
import {
  ArrayExpression, FunctionExpression, Literal, Node,
  MemberExpression, ObjectExpression
} from 'estree';
import { RT_SCOPE_PARENT_KEY } from '../../page/page';
import { PageError } from '../../html/parser';

interface Target {
  obj: ObjectExpression;
  type: 'scope' | 'value';
}

/**
 * Resolves a value dependencies and adds dependency functions to it.
 * See page/props.ts -> ValueDep
 * @param page 
 */
export function resolveValueDependencies(page: CompilerPage) {
  if (page.errors.length > 0) {
    return;
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

  function getParentScope(obj: ObjectExpression): ObjectExpression | null {
    const scopeId = (getProperty(obj, 'dom') as Literal).value as number;
    const parentId = page.scopes[scopeId].p?.id;
    return parentId != null ? page.objects[parentId] as ObjectExpression : null;
  }

  function resolveName(
    obj: ObjectExpression | null, name: string
  ): Target | null {
    while (obj) {
      // 1. system values
      switch (name) {
      case RT_SCOPE_PARENT_KEY:
        obj = getParentScope(obj);
        continue;
      }
      // 2. values
      const values = getProperty(obj, 'values') as ObjectExpression;
      const value = values ? getProperty(values, name) : null;
      if (value) {
        return {
          obj: value as ObjectExpression,
          type: 'value'
        };
      }
      // 3. named sub scopes
      const children = getProperty(obj, 'children') as ArrayExpression;
      for (const child of children?.elements ?? []) {
        const p = getProperty(child as ObjectExpression, 'name');
        if ((p as Literal)?.value === name) {
          return {
            obj: child as ObjectExpression,
            type: 'scope'
          };
        }
      }
      // 4. ascend
      const isolated = getProperty(obj, 'isolated');
      if (isolated) {
        return null;
      }
      obj = getParentScope(obj);
    }
    return null;
  }

  function limitPath(
    stack: Stack<ObjectExpression>,
    name: string,
    path: Path
  ) {
    let target: Target = {
      obj: stack.peek()!,
      type: 'scope'
    };
    let i = 1;
    for (; i < path.length; i++) {
      const t = resolveName(target.obj, path[i]);
      if (t?.type === 'scope') {
        target = t;
      } else if (t?.type === 'value') {
        break;
      } else {
        // page.errors.push(new PageError(
        //   'error',
        //   `invalid reference: ${path.toString()}`,

        // ));
      }
    }
    while (i < path.length) {
      path.pop();
    }
  }

  function resolveValueExpression(
    stack: Stack<ObjectExpression>,
    name: string,
    exp: FunctionExpression
  ) {
    // 1. collect dependencies
    const paths = new Array<Path>();
    estraverse.traverse(exp as Node, {
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
    // 2. refine dependencies
    // 2.1 limit paths
    paths.forEach(path => limitPath(stack, name, path));
    // 2.2 remove redundancies
    //TODO
    // 3. add dependency functions
    //TODO
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

  const props = page.ast as ObjectExpression;
  const rootScopes = getProperty(props, 'root') as ArrayExpression;
  const rootScope = rootScopes.elements[0] as ObjectExpression;
  resolveScope(new Stack(rootScope));
}
