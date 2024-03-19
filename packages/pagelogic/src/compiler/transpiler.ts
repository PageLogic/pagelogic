import * as acorn from 'acorn';
import * as utils from './utils';
import { Logic } from './logic';
import { Source } from './types';
import { Stack } from './utils';

export function transpile(source: Source) {

  function genValue(key: string, scope: Logic, stack: Stack<Logic>) {
    const ret = utils.object(scope.ref);
    const ref = scope.ref;
    return ret;
  }

  function genValues(scope: Logic, stack: Stack<Logic>) {
    const ret = utils.object(scope.ref);
    const ref = scope.ref;
    for (const key of Reflect.ownKeys(scope.vv) as string[]) {
      ret.properties.push(utils.property(
        key,
        genValue(key, scope, stack), ref)
      );
    }
    return ret;
  }

  function genScope(scope: Logic, stack: Stack<Logic>) {
    const ref = scope.ref;
    const ret = utils.object(ref);
    // ret.properties.push(utils.property('id', utils.literal(scope.id, ref), ref));
    // ret.properties.push(utils.property('values', genValues(scope, stack), ref));
    return ret;
  }

  function genScopes(scope: Logic, stack: Stack<Logic>) {
    const ret = genScope(scope, stack);
    stack.push(scope);
    try {
      scope.cc.forEach(child => genScopes(child, stack));
    } catch (ignored) { /* nop */ }
    stack.pop();
    return ret;
  }

  if (source.logic && source.errors.length < 1) {
    const ast = genScopes(source.logic, new Stack<Logic>());
    source.ast = ast;
  }
}
