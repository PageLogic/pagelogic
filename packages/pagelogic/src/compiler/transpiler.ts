import * as acorn from 'acorn';
import * as es from 'estree';
import * as html from './html';
import * as utils from './utils';
import { Logic } from './logic';
import { Source } from './types';
import { genRefFunctions } from './reference';
import { qualifyReferences } from './qualifier';

export function transpile(source: Source) {
  if (source.logic && source.errors.length < 1) {
    const ast = genScope(source, source.logic);
    source.ast = ast;
  }
}

/**
 * @see BootScope
 */
function genScope(source: Source, scope: Logic) {
  const ref = scope.ref;
  const ret = utils.object(ref);
  ret.properties.push(utils.property(
    'id', utils.literal(scope.id, ref), ref)
  );
  ret.properties.push(utils.property(
    'values', genValues(source, scope), ref)
  );
  if (scope.cc.length) {
    const arr = utils.array(ref);
    ret.properties.push(utils.property('children', arr, ref));
    try {
      scope.cc.forEach(child => {
        arr.elements.push(genScope(source, child));
      });
    } catch (err) {
      source.addError('error', `unexpected compilation error ${err}`, ref.loc);
    }
  }
  return ret;
}

function genValues(source: Source, scope: Logic) {
  const ref = scope.ref;
  const ret = utils.object(ref);
  // logic attributes
  for (const key of Reflect.ownKeys(scope.vv) as string[]) {
    ret.properties.push(utils.property(
      key, genValue(source, scope, key, scope.vv[key]), ref)
    );
  }
  // logic texts
  scope.tt.forEach((text, index) => {
    const key = 't$' + index;
    ret.properties.push(utils.property(
      key, genValue(source, scope, key, text), ref)
    );
  });
  return ret;
}

/**
 * @see BootValue
 */
function genValue(
  source: Source, scope: Logic,
  key: string, val: html.Attribute | html.Text
) {
  const ref = val;
  // const refs = new Array<string>();
  let exp = typeof val.value === 'string'
    ? utils.literal(val.value, val)
    : val.value as acorn.Expression;
  exp = qualifyReferences(source, scope, key, exp as es.Expression);
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
      source, scope, exp as es.Expression
    ) as acorn.Expression[];
    if (refFunctions.length) {
      const arr = utils.array(ref);
      arr.elements.push(...refFunctions);
      ret.properties.push(utils.property('refs', arr, ref));
    }
  }
  return ret;
}
