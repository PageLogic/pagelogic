window.pagelogic.init({
  id: 0,
  name: 'page',
  children: [
    {
      id: 1,
      name: 'head'
    },
    {
      id: 2,
      name: 'body',
      values: {
        data: {
          exp: function () {
            return {
              title: 'outer',
              object: { subtitle: 'inner' }
            };
          }
        }
      },
      children: [{
          id: 3,
          values: {
            data: {
              exp: function () {
                return this.$outer.data.object;
              },
              refs: [function () {
                  return this.$outer.$value('data');
                }]
            },
            text$0: {
              exp: function () {
                return this.data.subtitle;
              },
              refs: [function () {
                  return this.$value('data');
                }]
            }
          }
        }]
    }
  ]
});
