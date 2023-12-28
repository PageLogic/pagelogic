({
  id: '0',
  name: 'page',
  children: [
    {
      id: '1',
      name: 'head'
    },
    {
      id: '2',
      name: 'body',
      values: {
        x: {
          exp: function () {
            return this.y + '!';
          },
          refs: [function () {
              return this.$value('y');
            }]
        },
        y: {
          exp: function () {
            return '';
          }
        }
      }
    }
  ]
});
