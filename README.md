# PageLogic

[![CodeQL](https://github.com/fcapolini/pagelogic/actions/workflows/codeql.yml/badge.svg)](https://github.com/fcapolini/pagelogic/actions/workflows/codeql.yml)
[![Node.js CI](https://github.com/fcapolini/pagelogic/actions/workflows/node.js.yml/badge.svg)](https://github.com/fcapolini/pagelogic/actions/workflows/node.js.yml)

> An HTML-based reactive web framework.

Modern web development is mostly done using some reactive framework, like [React](), [Vue]() or [Angular](). This has many advantages, but they all add plenty of complexity and make the experience more akin to desktop development.

PageLogic aims to restore simplicity while preserving the benefits of modern frameworks. It extends HTML with `<:...>` [directive tags](), `:...` [logic attributes](), and `{...}` [reactive expressions]() to let you write modular, reactive logic directly in HTML.

## Hello world

This is a minimal but complete PageLogic page:

```jsx
<html>
<body>
  <button :count={0}
          :on-click={() => count++}>
    Clicks: {count}
  </button>
</body>
</html>
```

We'll save it as `index.html` in `./www`. We can now install PageLogic and serve it like this:

```bash
npm i -g pagelogic
pagelogic serve www
# address http://127.0.0.1:3000/
```

<!-- > By default the server starts in dev mode, meaning it will automatically detect changes and refresh the browser as needed. -->

Alternatively we can statically compile with `pagelogic build` and use the generated HTML pages. Our example will generate a `index.html` + `index.js` pair of files which, together, implement page behaviour.

## Why PageLogic

* **Zero boilerplate** &mdash; forget all the obscure cerimonies like React's `useState()` etc.: PageLogic handles these details behind the scenes, keeping our code clean.

* **No Virtual DOM** &mdash; PageLogic uses direct DOM reflection, a much lighter and efficient solution.

* **Isomorphic by design** &mdash; with other frameworks, delivering content-ready pages for [SEO]() can be complex: PageLogic's server does it by default.

* **Super lightweight** &mdash; because runtime, compiler and server were designed together, it sports a tiny size of less than 3kB (minified, gzipped) in the browser.

* **Flexible deployment** &mdash; PageLogic pages can be served using its own Node.js server, its Express middleware in the context of your project, or as static precompiled HTML pages.

* **Advanced routing** &mdash; the same set of pages can work as a classic website and as a modern [SPA]() at the same time with simple page annotations.

<!-- * **Incrementally adoptable** &mdash; TBD -->

<!-- * **Simple and fun** &mdash; web development used to be simple and gratifying. JavaScript-oriented frameworks took away much of the fun. PageLogic aims to bring it back 🙂 -->
