({
  root: [
    {
      dom: 0,
      name: 'page',
      values: {
        y: {
          exp: function() { return 2; }
        },
        v: {
          exp: function() { return (y) => y; }
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
