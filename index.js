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

var functionStartRegex = /(^function.*\{)/mi;
var functionEndRegex = /\}$/mi;

var PerformanceTest = function () {
  function PerformanceTest(_testLimit, _debug) {
    _classCallCheck(this, PerformanceTest);

    this.debug = _debug || false;
    this.limit = _testLimit || 1;
    this.preTestScripts = [];
    this.testSnippets = [];
    this.testResults = {};
    this.randomPrefix = 'a_' + _randomString2.default.generate('5');
    this.varEnum = {
      label: this.randomPrefix + '_label',
      timeExp: this.randomPrefix + '_timeExp',
      counter: this.randomPrefix + '_counter',
      consoleTimeLabel: '' + this.randomPrefix
    };
    this.resultsRegex = new RegExp(this.varEnum.consoleTimeLabel + '\\:\\s*([0-9\.]*)ms');
  }

  _createClass(PerformanceTest, [{
    key: 'wrapSnippetWithPerformanceCode',
    value: function wrapSnippetWithPerformanceCode(_label, _code) {
      var code = ';\n      console.time("' + this.varEnum.consoleTimeLabel + '");\n      ' + _code + ';\n      console.timeEnd("' + this.varEnum.consoleTimeLabel + '");\n    ;';

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
        var duration = parseFloat(matches[1]);
        if (typeof test.reults === 'undefined') {
          test.results = {};
        }
        if (typeof test.results.execDurationList === 'undefined') {
          test.results.execDurationList = [duration];
        } else {
          test.results.execDurationList.push(duration);
        }
      }
    }
  }, {
    key: 'calculateResults',
    value: function calculateResults() {
      var fastestAverageTime = Number.MAX_SAFE_INTEGER;
      this.testSnippets.forEach(function (_elem) {
        var sum = _elem.results.execDurationList.reduce(function (_acc, _curr) {
          return _acc + _curr;
        }, 0);
        var average = sum / _elem.results.execDurationList.length;
        _elem.results.totalTime = sum;
        _elem.results.averageTime = average;
        if (average < fastestAverageTime) {
          fastestAverageTime = average;
        }
      });

      this.testSnippets.forEach(function (_elem) {
        var percentage = (_elem.results.averageTime / fastestAverageTime).toFixed(2);
        _elem.results.percentage = percentage;
        if (_elem.results.averageTime === fastestAverageTime) {
          _elem.results.result = 'fastest';
        } else {
          _elem.results.result = percentage + ' times slower';
        }
      });
    }
  }, {
    key: 'getResults',
    value: function getResults() {
      return this.testSnippets;
    }
  }, {
    key: 'runTests',
    value: function runTests() {
      var _this = this;

      var code = '';
      code = this.preTestScripts.reduce(function (_acc, _curr) {
        return _acc + _curr + ';';
      }, ';');

      var promissesArray = [];
      this.testSnippets.forEach(function (_elem) {
        var limit = 50;
        var count = 0;
        var testCode = code;
        testCode += _this.wrapSnippetWithPerformanceCode(_elem.label, _elem.snippet);

        while (count++ < limit) {
          promissesArray.push(new Promise(function (_resolve, _reject) {
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
        }
      });

      return Promise.all(promissesArray);
    }
  }, {
    key: 'toString',
    value: function toString() {
      var table = new _cliTable2.default({
        head: ['Label', 'Average exec time(ms)', 'Result']
      });

      this.testSnippets.forEach(function (_elem) {
        table.push([_elem.label, _elem.results.averageTime, _elem.results.result]);
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
