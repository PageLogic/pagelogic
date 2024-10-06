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
          children: [
            {
              dom: 3,
              type: 'foreach',
              values: {
                item: {
                  exp: function() { return ['a', 'b', 'c']; }
                }
              },
              children: [
                {
                  dom: 4,
                  values: {
                    t$0: {
                      exp: function() { return this.item; }
                    }
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
})
