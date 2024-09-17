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
            v: {
              exp: function() { return this.$parent.v + 1; },
              deps: [
                function() { return this.$parent.$value('v'); }
              ]
            },
          },
          children: []
        }
      ]
    }
  ]
})
