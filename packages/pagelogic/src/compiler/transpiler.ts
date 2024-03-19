import * as acorn from 'acorn';
import * as es from 'estree';
import * as html from './html';
import * as utils from './utils';
import { Logic } from './logic';
import { Source } from './types';
import { Stack } from './utils';
import { genRefFunctions } from './reference';
import { qualifyReferences } from './qualifier';

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
  // logic attributes
  for (const key of Reflect.ownKeys(scope.vv) as string[]) {
    ret.properties.push(utils.property(
      key, genValue(source, scope, stack, key, scope.vv[key]), ref)
    );
  }
  // logic texts
  scope.tt.forEach((text, index) => {
    const key = 't$' + index;
    ret.properties.push(utils.property(
      key, genValue(source, scope, stack, key, text), ref)
    );
  });
  return ret;
}

/**
 * @see BootValue
 */
function genValue(
  source: Source, scope: Logic, stack: Stack<Logic>,
  key: string, val: html.Attribute | html.Text
) {
  const ref = val;
  // const refs = new Array<string>();
  let exp = typeof val.value === 'string'
    ? utils.literal(val.value, val)
    : val.value as acorn.Expression;
  exp = qualifyReferences(source, scope, stack, key, exp as es.Expression);
  const ret = utils.object(ref);
  ret.properties.push(utils.property(
    'fn', utils.fnExpression(exp, ref), ref)
  );
  if (![
    'FunctionExpression',
    'ArrowFunctionExpression'
  ].includes(exp.type)) {
    // not a function: create dependencies
    const refFunctions = genRefFunctions(
      source, scope, stack, exp as es.Expression
    ) as acorn.Expression[];
    if (refFunctions.length) {
      const arr = utils.array(ref);
      arr.elements.push(...refFunctions);
      ret.properties.push(utils.property('refs', arr, ref));
    }
  }
  return ret;
}
