# js-performance-test

An environment for comparing javascript code performance.


*WARNING: Each test spawns a new node process. Choose the number of test
iterations carefully.*

## Installation
npm i js-performance-test

## Usage
```
import JsPerformanceTest from 'js-performance-test';

let pt = new JsPerformanceTest(20); // new instance of performance test and define number of test iterations
let preTest = () => { // test setup
  let Immutable = require('immutable');

  let arr = [];
  let i = 0;

  while (i < 1000) {
    arr.push(i++);
  }
};

let test1 = () => { // test snippet 1
  arr.concat([]);
};

let test2 = () => { // test snippet 2
  Immutable.List(arr);
};

pt.addPreTestScripts(preTest); // add test setup script
pt.addTestSnippet('js new array ref', test1); // add first test
pt.addTestSnippet('immutable list', test2); // add second test

pt.runTests() // run tests
.then(() => {
  pt.calculateResults(); // process the results
  console.log(pt.toString()); // print the results

  // alternatively you can get the results and process it yourself
  let testRusults = pt.getResults();
})
.catch(() => {
  // something went wrong
});

```

### Sample output 

```
===================
Test Results
===================
┌──────────────────┬───────────────────────┬────────────────────┐
│ Label            │ Average exec time(ms) │ Result             │
├──────────────────┼───────────────────────┼────────────────────┤
│ js new array ref │ 0.059                 │ fastest            │
├──────────────────┼───────────────────────┼────────────────────┤
│ immutable list   │ 5.411                 │ 91.71 times slower │
└──────────────────┴───────────────────────┴────────────────────┘
```
