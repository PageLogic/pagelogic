({
  root: [
    {
      dom: 0,
      name: 'page',
      values: {
        v: {
          exp: function() { return 'a'; }
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
          values: {
            t$0: {
              exp: function() { return this.v; },
              deps: [
                function() { return this.$value('v'); }
              ]
            },
          },
          children: []
        }
      ]
    }
  ]
})
