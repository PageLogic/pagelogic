({
  root: [
    {
      dom: 0,
      name: 'page',
      values: {
        x: {
          exp: function() { return 2; }
        },
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
