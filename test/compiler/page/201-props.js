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
            v: {
              exp: function() { return 'hi'; }
            },
            t$0: {
              exp: function() { return this.v; },
              deps: [
                function() { return this.$value('v'); }
              ]
            }
          },
          children: []
        }
      ]
    }
  ]
})
