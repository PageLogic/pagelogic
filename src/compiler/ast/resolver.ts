import estraverse from 'estraverse';
import { CompilerPage } from '../compiler-page';
import { Stack } from '../util';
import { esLoc, getProperty, getPropertyName, memberExpression, Path, PathItem } from './estree-utils';
import {
  ArrayExpression, Expression, FunctionExpression, Literal, Node,
  MemberExpression, ObjectExpression, SimpleCallExpression
} from 'estree';
import { RT_SCOPE_PARENT_KEY, RT_SCOPE_VALUE_KEY } from '../../page/page';
import { PageError } from '../../html/parser';
import { astLiteral } from './acorn-utils';
import { generate } from 'escodegen';

interface Target {
  obj: ObjectExpression;
  type: 'scope' | 'value';
}

/**
 * Resolves value dependencies and adds dependency functions to them.
 * See page/props.ts -> ValueDep
 * @param page 
 */
export function resolveValueDependencies(page: CompilerPage): void {
  if (page.errors.length > 0) {
    return;
  }

  function makePath(exp: MemberExpression) {
    const p = new Path();
    function f(e: MemberExpression) {
      if (e.object.type === 'MemberExpression') {
        f(e.object);
      } else if (e.object.type === 'ThisExpression') {
        p.push({ name: 'this', node: e });
      }
      const name = getPropertyName(e);
      p.length && p.push({ name: name ?? '', node: e });
    }
    f(exp);
    return p.length > 1 && p[0].name === 'this' ? p : null;
  }

  function getParentScope(obj: ObjectExpression): ObjectExpression | null {
    const scopeId = (getProperty(obj, 'dom') as Literal).value as number;
    const scope = page.scopes[scopeId];
    const parent = scope.p;
    const parentId = parent?.id;
    const ret = parentId != null && parentId >= 0
      ? page.objects[parentId] as ObjectExpression
      : null;
    return ret;
  }

  function resolveName(
    obj: ObjectExpression | null, item: PathItem
  ): Target | null {
    while (obj) {
      // 1. system values
      switch (item.name) {
      case RT_SCOPE_PARENT_KEY:
        obj = getParentScope(obj);
        if (obj) {
          return { obj, type: 'scope' }
        }
        return null;
      }
      // 2. values
      const values = getProperty(obj, 'values') as ObjectExpression;
      const value = values ? getProperty(values, item.name) : null;
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

  function refinePath(
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
        while (path.length > (i + 1)) {
          path.pop();
        }
        page.errors.push(new PageError(
          'error',
          `invalid reference: ${path.toString()}`,
          path[i].node.loc
        ));
        break;
      }
    }
    while ((i + 1) < path.length) {
      path.pop();
    }
  }

  function removeSpuriousPaths(paths: Path[]) {
    for (let i = 0; i < paths.length;) {
      if (paths[i].length < 2) {
        paths.splice(i, 1);
        continue;
      }
      i++;
    }
  }

  function makeValueDep(path: Path): FunctionExpression {
    const name = path.pop()!.name;
    path.shift(); // remove initial 'this' item
    path.push({ name: RT_SCOPE_VALUE_KEY, node: {} as Node });
    let callee: Expression = { type: 'ThisExpression' }
    path.forEach(item => {
      callee = {
        type: 'MemberExpression',
        object: callee,
        property: { type: 'Identifier', name: item.name },
        computed: false,
        optional: false
      }
    });
    const ret: FunctionExpression = {
      type: 'FunctionExpression',
      params: [],
      body: {
        type: 'BlockStatement',
        body: [
          {
            type: 'ReturnStatement',
            argument: {
              type: 'CallExpression',
              callee: callee,
              arguments: [{ type: 'Literal', value: name }],
              optional: false
            }
          }
        ]
      },
      generator: false,
      async: false
    }
    console.log('makeValueDep', generate(ret));//tempdebug
    return ret;
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
        for (const other of paths) {
          if (path.startsWith(other)) {
            for (let i = other.length; i < path.length; i++) {
              other.push(path[i]);
            }
            return;
          }
        }
        paths.push(path);
      }
    });
    // 2. refine dependencies
    removeSpuriousPaths(paths);
    paths.forEach(path => refinePath(stack, name, path));
    removeSpuriousPaths(paths);
    // 3. remove duplicates
    const map = new Map<string, Path>();
    paths.forEach(path => map.set(path.toString(), path));
    // 4. add dependency functions
    map.forEach(path => {
      const valueDep = makeValueDep(path);
      //TODO
    });
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
