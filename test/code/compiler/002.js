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
            return 'a' + this.$print('!');
          }
        }
      }
    }
  ]
});
