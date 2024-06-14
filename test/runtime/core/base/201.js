({
  root: {
    id: '0',
    values: {
      f: {
        fn: function () {
          return function (x) {
            return x * 2;
          };
        }
      }
    },
    name: 'page',
    children: [
      {
        id: '1',
        values: {},
        name: 'head'
      },
      {
        id: '2',
        values: {
          text$0: {
            fn: function () {
              return this.f(3);
            }
          }
        },
        name: 'body'
      }
    ]
  }
});
