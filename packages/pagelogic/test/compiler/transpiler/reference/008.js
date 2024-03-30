({
  id: 0,
  values: {
    $name: { fn: function () { return 'page'; } },
    x: { fn: function () { return 1; } }
  },
  children: [{
    id: 1,
    values: {
      $name: { fn: function () { return 'head'; } },
      x: {
        fn: function () { return this.$parent.x + 1; },
        refs: [function () { return this.$parent.$value('x'); }]
      }
    }
  }]
})
