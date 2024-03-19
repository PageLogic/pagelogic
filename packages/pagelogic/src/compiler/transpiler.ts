import * as html from './html';
import * as utils from './utils';
import { Logic } from './logic';
import { Source } from './types';
import { Stack } from './utils';

export function transpile(source: Source) {
  if (source.logic && source.errors.length < 1) {
    const ast = genScopes(source, source.logic, new Stack<Logic>());
    source.ast = ast;
  }
}

function genScopes(source: Source, scope: Logic, stack: Stack<Logic>) {
  const ret = genScope(source, scope, stack);
  stack.push(scope);
  try {
    scope.cc.forEach(child => genScopes(source, child, stack));
  } catch (ignored) { /* nop */ }
  stack.pop();
  return ret;
}

function genScope(source: Source, scope: Logic, stack: Stack<Logic>) {
  const ref = scope.ref;
  const ret = utils.object(ref);
  // ret.properties.push(utils.property(
  //   'id',
  //   utils.literal(scope.id, ref), ref)
  // );
  // ret.properties.push(utils.property(
  //   'values',
  //   genValues(source, scope, stack), ref)
  // );
  return ret;
}

function genValues(source: Source, scope: Logic, stack: Stack<Logic>) {
  const ref = scope.ref;
  const ret = utils.object(ref);
  for (const key of Reflect.ownKeys(scope.vv) as string[]) {
    ret.properties.push(utils.property(
      key,
      genValue(source, scope, stack, key, scope.vv[key]), ref)
    );
  }
  return ret;
}

function genValue(
  source: Source, scope: Logic, stack: Stack<Logic>,
  key: string, val: string | html.Attribute
) {
  const ref = typeof val === 'string' ? scope.ref : (val as html.Attribute);
  const ret = utils.object(ref);
  // ret.properties.push(utils.property(
  //   'fn',
  //   utils.fnExpression(

  //   ), ref)
  // );
  return ret;
}
