({
  id: 0,
  values: {
    $name: { fn: function () { return 'page'; } },
    x: { fn: function () { return 1; } },
    y: {
      fn: function () { return z => { return this.y(this.x) + this.y(z) + 1; }; }
    }
  }
})
