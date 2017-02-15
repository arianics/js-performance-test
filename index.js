import {spawn} from 'child_process';
import path from 'path';
import randomString from 'randomString';
import Table from 'cli-table';

let babelNode = path
  .resolve(__dirname, './node_modules', '.bin', 'babel-node');
let functionStartRegex = /(^function.*\{)/mi;
let functionEndRegex = /\}$/mi;

export default class PerformanceTest {
  constructor(_testLimit, _debug) {
    this.debug = _debug || false;
    this.limit = _testLimit || 1;
    this.preTestScripts = [];
    this.testSnippets = [];
    this.testResults = {};
    this.randomPrefix = 'a_' + randomString.generate('5');
    this.varEnum = {
      label: `${this.randomPrefix}_label`,
      timeExp: `${this.randomPrefix}_timeExp`,
      counter: `${this.randomPrefix}_counter`,
      consoleTimeLabel: `${this.randomPrefix}`
    };
    this.resultsRegex = new RegExp(this.varEnum.consoleTimeLabel +
      '\\:\\s*([0-9\.]*)ms');
  }

  static stripFunction(_func) {
    if (typeof _func === 'string') {
      return _func;
    }
    let funcStr = _func.toString();
    return funcStr
      .replace(functionStartRegex, '')
      .replace(functionEndRegex, '');
  }

  wrapSnippetWithPerformanceCode(_label, _code) {
    let code = `;
      console.time("${this.varEnum.consoleTimeLabel}");
      ${_code};
      console.timeEnd("${this.varEnum.consoleTimeLabel}");
    ;`;

    return code;
  };

  addPreTestScripts(_preTestScript) {
    if (typeof _preTestScript !== 'function' &&
    typeof _preTestScript !== 'string') {
      return;
    }

    let preTestScript = PerformanceTest
      .stripFunction(_preTestScript);

    this.preTestScripts.push(preTestScript);
  }

  addTestSnippet(_label, _snippet) {
    if (typeof _snippet !== 'function' &&
    typeof _snippet !== 'string') {
      return;
    }
    let snippet = PerformanceTest
    .stripFunction(_snippet);
    this.testSnippets.push({
      label: _label,
      snippet: snippet
    });
  }

  recordResult(_stdout, _label) {
    let matches = _stdout.trim().match(this.resultsRegex);

    if (matches === null || matches.length < 2) {
      return;
    }

    let test = this.testSnippets.find((_elem) => _elem.label === _label);

    if (test !== null) {
      let duration = parseFloat(matches[1]);
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

  calculateResults() {
    let fastestAverageTime = Number.MAX_SAFE_INTEGER;
    this.testSnippets.forEach((_elem) => {
      let sum = _elem.results.execDurationList
        .reduce((_acc, _curr) => _acc + _curr, 0);
      let average = sum / _elem.results.execDurationList.length;
      _elem.results.totalTime = sum;
      _elem.results.averageTime = average;
      if (average < fastestAverageTime) {
        fastestAverageTime = average;
      }
    });

    this.testSnippets.forEach((_elem) => {
      let percentage = (_elem.results.averageTime / fastestAverageTime)
        .toFixed(2);
      _elem.results.percentage = percentage;
      if (_elem.results.averageTime === fastestAverageTime) {
        _elem.results.result = 'fastest';
      } else {
        _elem.results.result = percentage + ' times slower';
      }
    });
  }

  getResults() {
    return this.testSnippets;
  }

  runTests() {
    let code = '';
    code = this.preTestScripts
    .reduce((_acc, _curr) => {
      return _acc + _curr + ';';
    }, ';');

    let promissesArray = [];
    this.testSnippets
    .forEach((_elem) => {
      let limit = 50;
      let count = 0;
      let testCode = code;
      testCode += this
        .wrapSnippetWithPerformanceCode(_elem.label, _elem.snippet);

      while (count++ < limit) {
        promissesArray.push(new Promise((_resolve, _reject) => {
          let test = spawn(babelNode, [
            '--presets', 'es2015', 'es2016', 'stage-3',
            '-e', testCode
          ]);

          test.stdout.on('data', (data) => {
            if (this.debug) {
              console.log(`stdout: ${data}`);
            }
            this.recordResult(data.toString(), _elem.label);
          });

          test.stderr.on('data', (data) => {
            if (this.debug) {
              console.log(`stderr: ${data}`);
            }
          });

          test.on('close', (code) => {
            if (this.debug) {
              console.log(`child process exited with code ${code}`);
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

  toString() {
    let table = new Table({
      head: ['Label', 'Average exec time(ms)', 'Result']
    });

    this.testSnippets.forEach((_elem) => {
      table.push([
         _elem.label,
         _elem.results.averageTime,
         _elem.results.result
      ]);
    });

    let out = `
===================
Test Results
===================
`;
    out+= table.toString();
    return out;
  }
}
