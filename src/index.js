import {spawn} from 'child_process';
import randomString from 'randomString';
import Table from 'cli-table';

let functionStartRegex = /(^function.*\{)/i;
let functionEndRegex = /\}$/i;

export default class PerformanceTest {
  constructor(_debug) {
    this.debug = _debug || false;
    this.preTestScripts = [];
    this.testSnippets = [];
    this.testResults = {};
    this.randomPrefix = 'a_' + randomString.generate('5');
    this.resultsRegex = new RegExp(this.randomPrefix +
      '::([0-9]*)::' + this.randomPrefix);
    this.mostExec = 0;
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

  wrapSnippetWithPerformanceCode(_label, _code, _preTest) {
    let code = `;
      var expTime = Date.now() + 3000;
      var count = 0;
      while (Date.now() < expTime) {
        (function () {
          ${_preTest};
          ${_code};
        }());
        count++;
      }
      console.log("${this.randomPrefix}::" + count + "::${this.randomPrefix}");
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
      let execCount = parseInt(matches[1]);

      test.execCount = execCount;
      if (execCount > this.mostExec) {
        this.mostExec = execCount;
      }
    }
  }

  runTests() {
    let promisesArray = [];
    let preTest = this.preTestScripts
    .reduce((_acc, _curr) => {
      return _acc + _curr + ';';
    }, ';');

    this.testSnippets
    .forEach((_elem) => {
      let testCode = this
        .wrapSnippetWithPerformanceCode(_elem.label, _elem.snippet, preTest);

      if (this.debug) {
        console.log(_elem.label, '\n', testCode);
      }
      promisesArray.push(new Promise((_resolve, _reject) => {
        let test = spawn('node', [
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
    });

    return Promise.all(promisesArray);
  }

  toString() {
    let table = new Table({
      head: ['Label', 'Exec count/3sec', 'Result']
    });

    let parseResult = (_execCount) => {
      if (_execCount === this.mostExec) {
        return 'fastest';
      }
      return ((this.mostExec - _execCount) / this.mostExec * 100).toFixed(2) +
        '% slower';
    };

    this.testSnippets.forEach((_elem) => {
      let res = parseResult(_elem.execCount);
      table.push([
         _elem.label,
         _elem.execCount,
         res
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
