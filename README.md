
PageLogic augments stardard HTML with embedded reactive logic, making it ideal for expressing presentation logic.

```html
<html>
<body>
  <button :count=${0}
          :on-click=${count++}>
    Count: ${count}
  </button>
</body>
</html>
```

Source pages are compiled into HTML + custom JavaScript files. They can be deployed as they are and don't require any external dependency.

```bash
pagelogic build www dist
ls -l dist
#...
```

## HTML extensions

* Elements can be assigned reactive values using `:`-prefixed attributes
* Attributes and texts can contain reactive logic in `${...}` expressions
* Custom elements (aka Components) can be declared with the `<:define>` directive
