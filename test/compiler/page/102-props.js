({
  root: [
    {
      dom: 0,
      name: 'page',
      values: {
        v: {
          exp: function() { return () => {
            let x = 1;
            return x;
          } }
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
