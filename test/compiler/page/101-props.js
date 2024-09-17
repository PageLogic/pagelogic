({
  root: [
    {
      dom: 0,
      name: 'page',
      values: {
        x: {
          exp: function() { return 1; }
        },
        v: {
          exp: function() { return this.x + 1; },
          deps: [
            function() { return this.$value('x'); }
          ]
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
