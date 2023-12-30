# PageLogic

> An HTML-based reactive web framework.

Modern web development is mostly done using some reactive framework, like [React](), [Vue]() or [Angular](). This has many advantages, but they all add plenty of complexity and make the experience more akin to desktop development.

PageLogic aims to restore simplicity while preserving the benefits of modern frameworks. It extends HTML with `<:...>` [directive tags](), `:...` [logic attributes](), and `{...}` [reactive expressions]() that let you write modular, reactive logic directly in HTML.

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

* **Zero boilerplate** &mdash; forget all the obscure cerimonies like `useState()` etc. It's not "modern API" stuff, it's just forcing implementation details on you.

* **No Virtual DOM** &mdash; starting out with markup templates, they had to add it to make them perform reasonably. But it's heavy and still not as fast as direct DOM reflection.

* **Isomorphic by design** &mdash; making React, Vue or Angular projects deliver content-ready pages for [SEO]() can be complex, as they were originally designed just for the client.

* **Super lightweight** &mdash; thanks to a design where runtime, compiler and server were designed and optimized together, it sports a tiny ~2.5kB (minified, gzipped) size in the client.

<!-- * **Incrementally adoptable** &mdash; TBD -->

* **Simple and fun** &mdash; web development used to be simple and gratifying. JavaScript-oriented frameworks took away most of the fun, and PageLogic aims to bring it back 🙂
