
Special attributes:

* `$data` - set by `$list` and `$nest` for each clone
* `$listFor` - clones the element in the same parent
* `$nestFor` - clones the element in an inner part of the DOM
* `$nestIn` - specifies where to nest (directly in the element if unspecified) using xpath

If `$listFor`/`$nestFor` reference `$data`, they get the possibly refined value of it, in case `$data` is defined/refined in the element itself.
