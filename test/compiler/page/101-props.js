({
  root: [
    {
      dom: 0,
      name: 'page',
      values: {
        x: {
          exp: function() { return 1; }
        },
        y: {
          exp: function() { return this.x + 1; }
        },
      },
      children: [
        {
          dom: 1,
          name: 'head',
          children: []
        },
        {
          dom: 2,
          name: 'body',
          children: []
        }
      ]
    }
  ]
})
