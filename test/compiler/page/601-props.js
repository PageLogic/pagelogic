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
            dummy: {
              exp: function() { return this.console.log('hi'); },
            },
          },
          children: []
        }
      ]
    }
  ]
})
