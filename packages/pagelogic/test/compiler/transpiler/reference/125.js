({
  id: 0,
  values: {
    $name: { fn: function () { return 'page'; } },
    x: { fn: function () { return 1; } },
    y: {
      fn: function () { return function (z) { const x = 1; return this.y(x) + this.y(z) + 1; }; }
    }
  }
})
