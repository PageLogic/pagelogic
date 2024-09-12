import { Expression, Identifier, ObjectExpression, Property } from 'acorn';
import * as walk from 'acorn-walk';
import { Scope } from '../../page/scope';
import { CompilerPage } from '../compiler-page';
import { getProperty } from './utils';

export function qualifyPageIdentifiers(page: CompilerPage): CompilerPage {
  for (let i in page.scopes) {
    const scope = page.scopes[i];
    const object = page.objects[i];
    const values = getProperty(object, 'values') as ObjectExpression;
    if (values) {
      values.properties.forEach(p => {
        const property = p as Property;
        const id = property.key as Identifier;
      });
      // qualifyScopeIdentifiers(values as ObjectExpression, scope);
    }
  }
  return page;
}

function qualifyScopeIdentifiers(values: ObjectExpression, scope: Scope) {
  values.properties.forEach(property => {

  });
}
