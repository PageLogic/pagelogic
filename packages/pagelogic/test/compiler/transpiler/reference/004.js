{
  id: 0,
  values: {
    $name: { fn: function () { return 'page'; } }
  },
  children: [
    {
      id: 1,
      values: {
        $name: { fn: function () { return 'head'; } },
        y: {
          fn: function () { return this.page.body.x + 1; },
          refs: [function () { return this.page.body.$value('x'); }]
        }
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
}
