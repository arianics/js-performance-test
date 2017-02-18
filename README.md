# js-performance-test

An environment for comparing javascript code performance.

iterations carefully.*

## Installation
npm i js-performance-test

## Usage
```
import JsPerformanceTest from 'js-performance-test';

let pt = new JsPerformance(); // new instance of performance test. Optionally pass true for debug mode
let preTest = function() { // shared test setup. Don't use arraw functions for tests
  var obj = {};
};

let test1 = function() { // test 1. Don't use arraw functions for tests
  if (obj.value === void 0);
};

let test2 = function() { // test 2. Don't use arraw functions for tests
  if (typeof obj.value === 'undefined');
}
let test3 = function() { // test 3. Don't use arraw functions for tests
  if (obj.value && obj.value !== null);
}

pt.addPreTestScripts(preTest);
pt.addTestSnippet('void 0', test1);
pt.addTestSnippet('typeof', test2);
pt.addTestSnippet('if prop', test3);

pt.runTests()
.then(() => {
  console.log(pt.toString());
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
┌─────────┬─────────────────┬──────────────┐
│ Label   │ Exec count/3sec │ Result       │
├─────────┼─────────────────┼──────────────┤
│ void 0  │ 18681457        │ fastest      │
├─────────┼─────────────────┼──────────────┤
│ typeof  │ 18644837        │ 0.20% slower │
├─────────┼─────────────────┼──────────────┤
│ if prop │ 18623184        │ 0.31% slower │
└─────────┴─────────────────┴──────────────┘
```
