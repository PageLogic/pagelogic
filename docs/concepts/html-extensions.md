# HTML Extensions

PageLogic supports an extended version of HTML where:

* any element can be assigned a [logic value](html-extensions.md#logic-values), using `:`-prefixed attributes
* [reactive expressions](html-extensions.md#reactive-expressions) can be used in attributes and text, wrapped in `{...}` clauses
* [directives](html-extensions.md#directives), in the form of `<:...>` tags, can be used to modularize code.

Pages using these extensions can be compiled or served using PageLogic [CLI](../reference/cli.md) or the provided [Express middleware](../reference/server.md), producing standard HTML plus page-specific JavaScript code which implements their behaviour.

### Logic Values

Any element can be assigned logic values using `:`-prefixed attributes:

```html
<span :qty={1} :name="Item 1" :double={(x) => x * 2}>
```

These attributes wont appear in output HTML, but will be handled by page-specific JavaScript code.

In this example, `qty` is a number, `name` is a string, and `double` is a function.

### Reactive Expressions

Attribute values and page text can contain reactive expressions wrapped in `{...}` clauses:

```markup
<span class={titleClass}>
    Product {titleValue.toUpperCase()}
</span>
```

These expressions are re-evaluated and re-applied as needed whenever the values they refer to change.

In this example, span's class depends on `titleClass` and span's text depends on `titleValue`.

### Reactivity chains

By referencing other values in their declaration, values can depend on each other:

```
<span :height={3} :width={5} :area={height * width}>
    Area {area}
</span>
```

In this example `height` and `width` are independent values, but `area` depends on them, and span's text depends on `area`.

This means that when `height` and/or `width` change, `area` is updated and, in turn, span's text is updated.

### Visibility Scopes

So far we've only shown values and expressions in a single element. Because it has logic values assigned, that element also has a visibility scope, meaning all its values are visible inside that scope.

Since elements can be nested, so can visibility scopes:

```
<body :articleClass="article-light">
    <article :title="Introduction" class={articleClass}>
        ...
    </article>
</body>
```

In this example, article's `class` can see `articleClass` because it's defined in the body, which is an outer scope. The opposite isn't true: by default, we cannot see article's values from the body.

### Directives

TBD
