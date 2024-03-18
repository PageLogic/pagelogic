import * as acorn from 'acorn';
import { Logic } from './logic';
import { Source } from './types';
import { Stack } from './utils';

export function transpile(source: Source) {
  function generate(scope: Logic, stack: Stack<Logic>) {

  }

  function scan(scope: Logic, stack: Stack<Logic>) {
    generate(scope, stack);
    stack.push(scope);
    try {
      scope.cc.forEach(child => scan(child, stack));
    } catch (ignored) { /* nop */ }
    stack.pop();
  }

  if (source.logic && source.errors.length < 1) {
    scan(source.logic, new Stack<Logic>());
  }
}
