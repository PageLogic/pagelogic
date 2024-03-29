({
  id: 0,
  values: {
    $name: { fn: function () { return 'page'; } }
  },
  children: [
    {
      id: 1,
      values: {
        $name: { fn: function () { return 'head'; } }
      }
    },
    {
      id: 2,
      values: {
        $name: { fn: function () { return 'body'; } }
      }
    }
  ]
})
