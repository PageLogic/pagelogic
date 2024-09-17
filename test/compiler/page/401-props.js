({
  root: [
    {
      dom: 0,
      name: 'page',
      values: {
        x: { exp: function() { return 1; } }
      },
      children: [
        {
          dom: 1,
          name: 'head',
          values: {
            y: { exp: function() { return 2; } }
          },
          children: []
        },
        {
          dom: 2,
          name: 'body',
          values: {
            z: { exp: function() { return 3; } },
            v: {
              exp: function() { return this.x + this.head.y + this.z; },
              deps: [
                function() { return this.$value('x'); },
                function() { return this.head.$value('y'); },
                function() { return this.$value('z'); },
              ]
            }
          },
          children: []
        }
      ]
    }
  ]
})
