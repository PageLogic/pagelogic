## Work

* [x] source/
  * [x] dom
  * [x] parser
  * [x] preprocessor
* [x] logic/
  * [x] loader
  * [x] qualifier
  * [x] resolver
  * [x] generator
* [x] runtime/ (base)
  * [x] types
  * [x] boot
  * [x] core
* [ ] runtime/ (special attributes)
  * [ ] :class-
  * [ ] :style-
  * [ ] :handle-(dot-reference)
  * [ ] :on-(event)
  * [ ] :did-
  * [ ] :will-
* [ ] runtime/ (directives)
  * [ ] :define
  * [ ] :foreach
  * [ ] :select
* [ ] compiler
* [ ] server
  * [ ] express middleware
  * [ ] express server
* [ ] CLI

## TODO

* [ ] parser: doc sanitization should move current documentElement's content into newly created body tag (except for possible head tag)
* [ ] preprocessor: doc sanitization in parser should move to preprocessor
