({
  id: 0,
  values: {
    $name: { fn: function () { return 'page'; } },
    y: {
      fn: function () { return this.page.head.body.x + 1; },
      refs: [function () { return this.page.head.body.$value('x'); }]
    }
  },
  children: [
    {
      id: 1,
      values: {
        $name: { fn: function () { return 'head'; } }
      }
    },
    {
      id: 2,
      values: {
        $name: { fn: function () { return 'body'; } },
        x: { fn: function () { return 1; } }
      }
    }
  ]
})