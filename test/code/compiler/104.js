({
  id: '0',
  name: 'page',
  children: [
    {
      id: '1',
      name: 'head',
      values: {
        y: {
          exp: function () {
            return '';
          }
        }
      }
    },
    {
      id: '2',
      name: 'body',
      values: {
        x: {
          exp: function () {
            return this.$print(this.head.y.z) + '!';
          },
          refs: [function () {
              return this.head.$value('y');
            }]
        }
      }
    }
  ]
});
