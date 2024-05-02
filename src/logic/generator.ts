import * as acorn from 'acorn';
import * as runtime from '../runtime/boot';
import * as loader from './loader';
import { array, call, fnExpression, identifier, literal, object, property } from './utils';

export function generator(logic: loader.Logic): acorn.ObjectExpression {
  if (logic.errors.length > 0) {
    return object(logic.source.doc.documentElement!);
  }

  // ===========================================================================
  // processing
  // ===========================================================================

  function processValue(value: loader.Value) {
    const src = value.src;
    const obj = object(value.src);
    const exp = typeof value.val === 'string' ? literal(value.val, src): value.val;
    obj.properties.push(property('fn', fnExpression(exp, src), src));
    value.val = obj;
    if (exp.type === 'FunctionExpression' || !value.refs.length) {
      return;
    }
    const refs = array(src);
    obj.properties.push(property('refs', refs, src));
    value.refs.forEach(e => {
      const exp = JSON.parse(JSON.stringify(e)) as acorn.MemberExpression;
      const id = exp.property as acorn.Identifier;
      exp.property = identifier(runtime.SCOPE_VALUE_KEY, src);
      const fn = fnExpression(call(exp, [literal(id.name, src)], src), src);
      refs.elements.push(fn);
    });
  }

  function processScopeValues(scope: loader.Scope) {
    (Reflect.ownKeys(scope.values) as string[]).forEach(key => {
      processValue(scope.values[key]);
    });
    scope.texts.forEach(value => {
      processValue(value);
    });
    scope.children.forEach(child => {
      processScopeValues(child);
    });
  }
  processScopeValues(logic.root);

  // ===========================================================================
  // generation
  // ===========================================================================

  function genValue(key: string, value: loader.Value): acorn.Property {
    return property(key, value.val as acorn.Expression, value.src);
  }

  function genScope(scope: loader.Scope): acorn.ObjectExpression {
    const src = scope.src;
    const ret = object(src);
    ret.properties.push(property('id', literal(scope.id, src), src));
    const values = object(src);
    (Reflect.ownKeys(scope.values) as string[]).forEach(key => {
      values.properties.push(genValue(key, scope.values[key]));
    });
    let textCount = 0;
    scope.texts.forEach(value => values.properties.push(genValue(
      `${runtime.TEXT_VALUE_PREFIX}${textCount++}`, value
    )));
    ret.properties.push(property('values', values, src));
    if (scope.name) {
      ret.properties.push(property('name', literal(scope.name, src), src));
    }
    if (scope.children.length) {
      const children = array(src);
      scope.children.forEach(child => {
        children.elements.push(genScope(child));
      });
      ret.properties.push(property('children', children, src));
    }
    return ret;
  }
  const obj = genScope(logic.root);

  return obj;
}
