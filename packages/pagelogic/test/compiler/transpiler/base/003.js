{
  id: 0,
  values: {
    $name: { fn: function () { return 'page'; } },
    x: { fn: function () { return '1'; } },
    attr$y: { fn: function () { return 1; } },
    t$0: {
      fn: function () { return this.x; },
      refs: [
        function() { return this.$value('x'); }
      ]
    }
  }
}
