'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _child_process = require('child_process');

var _randomString = require('randomString');

var _randomString2 = _interopRequireDefault(_randomString);

var _cliTable = require('cli-table');

var _cliTable2 = _interopRequireDefault(_cliTable);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var functionStartRegex = /(^function.*\{)/i;
var functionEndRegex = /\}$/i;

var PerformanceTest = function () {
  function PerformanceTest(_debug) {
    _classCallCheck(this, PerformanceTest);

    this.debug = _debug || false;
    this.preTestScripts = [];
    this.testSnippets = [];
    this.testResults = {};
    this.randomPrefix = 'a_' + _randomString2.default.generate('5');
    this.resultsRegex = new RegExp(this.randomPrefix + '::([0-9]*)::' + this.randomPrefix);
    this.mostExec = 0;
  }

  _createClass(PerformanceTest, [{
    key: 'wrapSnippetWithPerformanceCode',
    value: function wrapSnippetWithPerformanceCode(_label, _code, _preTest) {
      var code = ';\n      var expTime = Date.now() + 3000;\n      var count = 0;\n      while (Date.now() < expTime) {\n        (function () {\n          ' + _preTest + ';\n          ' + _code + ';\n        }());\n        count++;\n      }\n      console.log("' + this.randomPrefix + '::" + count + "::' + this.randomPrefix + '");\n    ;';

      return code;
    }
  }, {
    key: 'addPreTestScripts',
    value: function addPreTestScripts(_preTestScript) {
      if (typeof _preTestScript !== 'function' && typeof _preTestScript !== 'string') {
        return;
      }

      var preTestScript = PerformanceTest.stripFunction(_preTestScript);

      this.preTestScripts.push(preTestScript);
    }
  }, {
    key: 'addTestSnippet',
    value: function addTestSnippet(_label, _snippet) {
      if (typeof _snippet !== 'function' && typeof _snippet !== 'string') {
        return;
      }
      var snippet = PerformanceTest.stripFunction(_snippet);
      this.testSnippets.push({
        label: _label,
        snippet: snippet
      });
    }
  }, {
    key: 'recordResult',
    value: function recordResult(_stdout, _label) {
      var matches = _stdout.trim().match(this.resultsRegex);

      if (matches === null || matches.length < 2) {
        return;
      }

      var test = this.testSnippets.find(function (_elem) {
        return _elem.label === _label;
      });

      if (test !== null) {
        var execCount = parseInt(matches[1]);

        test.execCount = execCount;
        if (execCount > this.mostExec) {
          this.mostExec = execCount;
        }
      }
    }
  }, {
    key: 'runTests',
    value: function runTests() {
      var _this = this;

      var promisesArray = [];
      var preTest = this.preTestScripts.reduce(function (_acc, _curr) {
        return _acc + _curr + ';';
      }, ';');

      this.testSnippets.forEach(function (_elem) {
        var testCode = _this.wrapSnippetWithPerformanceCode(_elem.label, _elem.snippet, preTest);

        if (_this.debug) {
          console.log(_elem.label, '\n', testCode);
        }
        promisesArray.push(new Promise(function (_resolve, _reject) {
          var test = (0, _child_process.spawn)('node', ['-e', testCode]);

          test.stdout.on('data', function (data) {
            if (_this.debug) {
              console.log('stdout: ' + data);
            }
            _this.recordResult(data.toString(), _elem.label);
          });

          test.stderr.on('data', function (data) {
            if (_this.debug) {
              console.log('stderr: ' + data);
            }
          });

          test.on('close', function (code) {
            if (_this.debug) {
              console.log('child process exited with code ' + code);
            }
            if (code === 0) {
              _resolve();
            } else {
              _reject();
            }
          });
        }));
      });

      return Promise.all(promisesArray);
    }
  }, {
    key: 'toString',
    value: function toString() {
      var _this2 = this;

      var table = new _cliTable2.default({
        head: ['Label', 'Exec count/3sec', 'Result']
      });

      var parseResult = function parseResult(_execCount) {
        if (_execCount === _this2.mostExec) {
          return 'fastest';
        }
        return ((_this2.mostExec - _execCount) / _this2.mostExec * 100).toFixed(2) + '% slower';
      };

      this.testSnippets.forEach(function (_elem) {
        var res = parseResult(_elem.execCount);
        table.push([_elem.label, _elem.execCount, res]);
      });

      var out = '\n===================\nTest Results\n===================\n';
      out += table.toString();
      return out;
    }
  }], [{
    key: 'stripFunction',
    value: function stripFunction(_func) {
      if (typeof _func === 'string') {
        return _func;
      }
      var funcStr = _func.toString();
      return funcStr.replace(functionStartRegex, '').replace(functionEndRegex, '');
    }
  }]);

  return PerformanceTest;
}();

exports.default = PerformanceTest;
