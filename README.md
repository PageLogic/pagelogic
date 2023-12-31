# PageLogic

[![CodeQL](https://github.com/fcapolini/pagelogic/actions/workflows/codeql.yml/badge.svg)](https://github.com/fcapolini/pagelogic/actions/workflows/codeql.yml)
[![Node.js CI](https://github.com/fcapolini/pagelogic/actions/workflows/node.js.yml/badge.svg)](https://github.com/fcapolini/pagelogic/actions/workflows/node.js.yml)

> An HTML-based reactive web framework.

Modern web development is mostly done using some reactive framework, like [React](), [Vue]() or [Angular](). This has many advantages, but they all add plenty of complexity and make the experience more akin to desktop development.

PageLogic aims to restore simplicity while preserving the benefits of modern frameworks. It extends HTML with `<:...>` [directive tags](), `:...` [logic attributes](), and `{...}` [reactive expressions]() to let you write modular, reactive logic directly in HTML.

## Hello world

This is a minimal but complete PageLogic app:

```jsx
<html>
<body :count={0}
      :on-click={() => count++}>
  Clicks: {count}
</body>
</html>
```

We'll save it as `index.pl.html` in `./www`. We can now install PageLogic and serve it like this:

```bash
npm i -g pagelogic
pagelogic serve ./www
```

> By default the server starts in dev mode, meaning it will automatically detect changes and refresh the browser as needed.

With `pagelogic build` we can statically compile pages and use them as standard HTML pages. For example `index.pl.html` will generate `index.html` and `index.js` which, together, implement page behaviour.

## Why PageLogic

* **Zero boilerplate** &mdash; forget all the obscure cerimonies like `useState()` etc. PageLogic handles these details behind the scenes, keeping our code clean.

* **No Virtual DOM** &mdash; PageLogic uses direct DOM reflection, a much lighter and efficient solution.

* **Isomorphic by design** &mdash; while making other frameworks deliver content-ready pages for [SEO]() can be complex, PageLogic does it by default.

* **Super lightweight** &mdash; because its runtime, compiler and server were designed and optimized together, it sports a tiny size of ~2.5kB (minified, gzipped) in the client.

<!-- * **Incrementally adoptable** &mdash; TBD -->

<!-- * **Simple and fun** &mdash; web development used to be simple and gratifying. JavaScript-oriented frameworks took away much of the fun. PageLogic aims to bring it back 🙂 -->
