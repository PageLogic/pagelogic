* [ ] add support for HTML comments
  * in parser.ts `<!--` and `-->` outside of tags should become `{/*-` and `*/}`
* [ ] add support for non-selfclosing empty HTML tags

---

* [esbuild - Getting Started](https://esbuild.github.io/getting-started/)

---

## Bugs

### misnamed `<head>` tag

```html
<!DOCTYPE html>
<html>
  <html>
    <meta name="color-scheme" content="light dark"/>
  </html>
  <body>
    { 1 + 2 }
  </body>
</html>
```

gives a runtime error: js code does have an entry for scope 1 but the misnamed tag doesn't have a `data-id` attribute so element lookup fails
