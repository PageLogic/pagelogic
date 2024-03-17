import { assert } from 'chai';
import { Context, Value, newScope } from '../../src/runtime/core';

describe('runtime: core', () => {

  it('should access values via proxy', () => {
    const scope = newScope(new Context(), {
      x: new Value(() => 1),
      y: 2
    }, null, null);
    scope.$context.refresh(scope);

    assert.equal(scope.x, 1);
    assert.equal(scope.y, 2);
    assert.notEqual(scope.x, scope.$object.x);
    assert.instanceOf(scope.$object.x, Value);
    assert.typeOf(scope.x, 'number');
    assert.equal(scope.y, scope.$object.y);
  });

  it('should support scope inheritance', () => {
    const ctx = new Context();
    const scope0 = newScope(ctx, {
      x: new Value(() => 1),
      y: new Value(() => 2),
    }, null, null);
    const scope1 = newScope(ctx, {
      z: 3
    }, null, scope0.$object);
    ctx.refresh(scope0);

    assert.equal(scope1.x, 1);
    assert.equal(scope1.y, 2);
    assert.notEqual(scope1.x, scope1.$object.x);
    assert.instanceOf(scope1.$object.x, Value);
    assert.typeOf(scope1.x, 'number');
    assert.equal(scope1.y, 2);

    assert.equal(scope1.z, 3);
    assert.isFalse(Reflect.ownKeys(scope1.$object).includes('y'));
    scope1.y = 4;
    assert.isFalse(Reflect.ownKeys(scope1.$object).includes('y'));
    assert.equal(scope1.y, 4);
    assert.equal(scope0.y, 4);
  });

  it('should access other values', () => {
    const scope = newScope(new Context(), {
      // @ts-expect-error this has any type
      x: new Value(function() { return this.y + 1; }),
      y: 2
    }, null, null);
    scope.$context.refresh(scope);

    assert.equal(scope.x, 3);
  });

  it('should support scope nesting', () => {
    const ctx = new Context();
    const scope0 = newScope(ctx, {
      y: 2
    }, null, null);
    const scope1 = newScope(ctx, {
      // @ts-expect-error this has any type
      x: new Value(function() { return this.y + 1;})
    }, scope0, null);
    ctx.refresh(scope0);

    assert.equal(scope1.x, 3);
  });

  it('should evaluate in the right scope', () => {
    const ctx = new Context();
    const scope0 = newScope(ctx, {
      x: 10,
      // @ts-expect-error this has any type
      y: new Value(function() { return this.x + 1; })
    }, null, null);
    const scope1 = newScope(ctx, {
      x: 20
    }, scope0, null);
    ctx.refresh(scope0);

    assert.equal(scope1.y, 11);
  });

  it('should activate callbacks on refresh()', () => {
    let value = 0;
    let count = 0;
    const scope = newScope(new Context(), {
      x: new Value(function() {
        // @ts-expect-error this has any type
        return this.y + 1;
      }, undefined, (v) => {
        value = v as number;
        count++;
        return (v as number) * 2;
      }),
      y: 2
    }, null, null);
    scope.$context.refresh(scope);

    assert.equal(value, 3);
    assert.equal(count, 1);
    assert.equal(scope.x, 6);
    assert.equal(value, 3);
    assert.equal(count, 1);
  });

  it('should activate callbacks on set()', () => {
    let value = 0;
    let count = 0;
    const scope = newScope(new Context(), {
      x: new Value(function() {
        // @ts-expect-error this has any type
        return this.y + 1;
      }, undefined, (v) => {
        value = v as number;
        count++;
        return (v as number) * 2;
      }),
      y: 2
    }, null, null);
    scope.$context.refresh(scope);

    assert.equal(value, 3);
    assert.equal(count, 1);
    scope.x = 10;
    assert.equal(scope.x, 20);
    assert.equal(value, 10);
    assert.equal(count, 2);
  });

  it('should propagate changes', () => {
    const scope = newScope(new Context(), {
      x: new Value(function() { return 1; }),
      y: new Value(function() {
        // @ts-expect-error this has any type
        return this.x * 2;
      }, [function() {
        // @ts-expect-error this has any type
        return this.$value('x');
      }]),
    }, null, null);
    scope.$context.refresh(scope);

    assert.equal(scope.x, 1);
    assert.equal(scope.y, 2);
    scope.x = 3;
    assert.equal(scope.x, 3);
    assert.equal(scope.y, 6);
  });

  it('should activate callbacks on propagation', () => {
    let value: unknown = 0;
    let count = 0;
    const scope = newScope(new Context(), {
      x: new Value(function() { return 1; }),
      y: new Value(function() {
        // @ts-expect-error this has any type
        return this.x * 2;
      }, [function() {
        // @ts-expect-error this has any type
        return this.$value('x');
      }], (v: unknown) => {
        value = v;
        count++;
        return v;
      }),
    }, null, null);
    scope.$context.refresh(scope);

    assert.equal(scope.x, 1);
    assert.equal(scope.y, 2);
    assert.equal(count, 1);
    assert.equal(value, 2);
    scope.x = 3;
    assert.equal(count, 2);
    assert.equal(value, 6);
    assert.equal(scope.x, 3);
    assert.equal(scope.y, 6);
  });

  it('should support scope methods (function expressions)', () => {
    const ctx = new Context();
    const scope0 = newScope(ctx, {
      x: 10,
      y: new Value(function() { return (() => {
        // @ts-expect-error this has any type
        return this.x;
      }); })
    }, null, null);
    const scope1 = newScope(ctx, {
      x: 20,
      z1: new Value(function() {
        // @ts-expect-error this has any type
        return this.y();
      }),
      z2: new Value(function() {
        // @ts-expect-error this has any type
        return this.x;
      })
    }, scope0, null);
    ctx.refresh(scope0);

    // @ts-expect-error scope0.y is of type unknown
    assert.equal(scope0.y(), 10);
    assert.equal(scope1.z1, 10);
    assert.equal(scope1.z2, 20);
  });

  it('should prevent isolates access', () => {
    const ctx = new Context();
    const scope0 = newScope(ctx, {
      x: 10,
    }, null, null);
    const scope1 = newScope(ctx, {
      y: 20,
    }, scope0, null, true);
    ctx.refresh(scope0);

    assert.notExists(scope1.x);
    assert.equal(scope1.y, 20);
  });

});
