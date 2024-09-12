({
  root: [
    {
      dom: 0,
      name: 'page',
      values: {
        title: {
          exp: function() { return 'Title'; }
        }
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
