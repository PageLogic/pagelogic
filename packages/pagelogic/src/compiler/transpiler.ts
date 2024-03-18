import * as acorn from 'acorn';
import * as utils from './utils';
import { Logic } from './logic';
import { Source } from './types';
import { Stack } from './utils';

export function transpile(source: Source) {
  function genScopeObject(scope: Logic, stack: Stack<Logic>) {
    const ret = utils.object(scope.ref);
    return ret;
  }

  function scanScopes(scope: Logic, stack: Stack<Logic>) {
    const ret = genScopeObject(scope, stack);
    stack.push(scope);
    try {
      scope.cc.forEach(child => scanScopes(child, stack));
    } catch (ignored) { /* nop */ }
    stack.pop();
    return ret;
  }

  if (source.logic && source.errors.length < 1) {
    const ast = scanScopes(source.logic, new Stack<Logic>());
    source.ast = ast;
  }
}
