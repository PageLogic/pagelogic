({
  id: 0,
  values: {
    $name: { fn: function () { return 'page'; } },
    x: { fn: function () { return 1; } },
    y: {
      fn: function () { return this.x + 1; },
      refs: [function () { return this.$value('x'); }]
    }
  }
})