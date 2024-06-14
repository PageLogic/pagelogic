({
  root: {
    id: '0',
    values: {},
    name: 'page',
    children: [
      {
        id: '1',
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
        name: 'head'
      },
      {
        id: '2',
        values: {
          x: {
            fn: function () {
              return 3;
            }
          },
          text$0: {
            fn: function () {
              return this.head.f(this.x);
            },
            refs: [
              function () {
                return this.$value('x');
              }
            ]
          }
        },
        name: 'body'
      }
    ]
  }
});
