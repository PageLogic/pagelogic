({
  root: {
    id: '0',
    values: {
      v: {
        fn: function () {
          return 2;
        }
      },
      f: {
        fn: function () {
          return function (x) {
            return x * this.v;
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
