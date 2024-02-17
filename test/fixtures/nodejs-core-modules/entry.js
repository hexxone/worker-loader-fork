const Worker = require('./worker');

const test = new Worker();

if(test != null) {
   test.postMessage("Test Ok.");
}
