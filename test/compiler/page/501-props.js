({
  root: [
    {
      dom: 0,
      name: 'page',
      children: [
        {
          dom: 1,
          name: 'head',
          children: []
        },
        {
          dom: 2,
          name: 'body',
          values: {
            n: {
              exp: function() { return 0; },
            },
            ev$click: {
              exp: function() { return () => this.n++ },
            },
          },
          children: []
        }
      ]
    }
  ]
})
