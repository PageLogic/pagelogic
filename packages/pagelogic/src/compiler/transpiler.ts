import * as acorn from 'acorn';
import * as html from './html';
import * as utils from './utils';
import * as walk from 'acorn-walk';
import { Logic } from './logic';
import { Source } from './types';
import { Stack } from './utils';

export function transpile(source: Source) {
  if (source.logic && source.errors.length < 1) {
    const ast = genScope(source, source.logic, new Stack<Logic>());
    source.ast = ast;
  }
}

/**
 * @see BootScope
 */
function genScope(source: Source, scope: Logic, stack: Stack<Logic>) {
  const ref = scope.ref;
  const ret = utils.object(ref);
  ret.properties.push(utils.property(
    'id', utils.literal(scope.id, ref), ref)
  );
  ret.properties.push(utils.property(
    'values', genValues(source, scope, stack), ref)
  );
  if (scope.cc.length) {
    const arr = utils.array(ref);
    ret.properties.push(utils.property('children', arr, ref));
    stack.push(scope);
    try {
      scope.cc.forEach(child => {
        arr.elements.push(genScope(source, child, stack));
      });
    } catch (err) {
      source.addError('error', `unexpected compilation error ${err}`, ref.loc);
    }
    stack.pop();
  }
  return ret;
}

function genValues(source: Source, scope: Logic, stack: Stack<Logic>) {
  const ref = scope.ref;
  const ret = utils.object(ref);
  for (const key of Reflect.ownKeys(scope.vv) as string[]) {
    ret.properties.push(utils.property(
      key, genValue(source, scope, stack, key, scope.vv[key]), ref)
    );
  }
  return ret;
}

/**
 * @see BootValue
 */
function genValue(
  source: Source, scope: Logic, stack: Stack<Logic>,
  key: string, val: html.Attribute
) {
  const ref = val;
  const exp = typeof val.value === 'string'
    ? utils.literal(val.value, val)
    : val.value as acorn.Expression;
  const refs = qualifyReferences(source, scope, stack, key, exp);
  const ret = utils.object(ref);
  ret.properties.push(utils.property(
    'fn', utils.fnExpression(exp, ref), ref)
  );
  if (refs) {
    const arr = utils.array(ref);
    ret.properties.push(utils.property('refs', arr, ref));
  }
  return ret;
}

// https://astexplorer.net
function qualifyReferences(
  source: Source, scope: Logic, stack: Stack<Logic>,
  key: string, exp: acorn.Expression
): string[] | null {
  if (exp.type === 'Literal') {
    return null;
  }
  const ret: string[] = [];
  walk.fullAncestor(exp, (node, state, ancestors, type) => {
    if (type === 'Identifier') {
      const id = node as acorn.Identifier;
      console.log('walk', 'Identifier', id.name);
    }
  });
  return ret.length > 0 ? ret : null;
}
