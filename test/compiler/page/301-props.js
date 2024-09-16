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
          name: 'app',
          values: {
            $name: { exp: function() { return 'app'; } }
          },
          children: []
        }
      ]
    }
  ]
})
