({
  root: [
    {
      dom: 0,
      name: 'page',
      values: {
        x: { exp: function() { return 1; } },
        v: { exp: function() { return 2; } }
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
          values: {
            v: {
              exp: function() { return this.x + this.$parent.v; },
              deps: [
                function() { return this.$value('x'); },
                function() { return this.$parent.$value('v'); },
              ]
            }
          },
          children: []
        }
      ]
    }
  ]
})
