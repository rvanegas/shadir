const minimist = require('minimist');
const crypto = require('crypto');
const async = require('async');
const path = require('path');
const fs = require('fs');

const walkdir = (dirname, fileFunc, dirFunc, walkdirDone) => {
  const walk = (dirname, walkDone) => {
    const entries = fs.readdirSync(dirname);
    const iteratee = (basename, eachDone) => {
      const filename = path.join(dirname, basename);
      fs.statSync(filename).isDirectory() ?
        walkdirFunc(filename, eachDone) :
        fileFunc(filename, eachDone);
    };
    async.each(entries, iteratee, walkDone);
  };
  const walkdirFunc = (name, done) => walk(name, () => dirFunc(name, done));
  walkdirFunc(dirname, walkdirDone);
};

const argv = minimist(process.argv.slice(2));
if (argv._.length != 2) {
  console.log('usage: <orig> <mirror>');
  process.exit(1);
}

const [origDir, mirrorDir] = argv._;

const printLine = (filename, done) => {
  setTimeout(() => {
    console.log(filename);
    done();
  }, Math.random() * 1000);
//   const content = fs.readFileSync(filename);
//   const sha = crypto.createHash('sha256').update(content).digest('hex');
};

walkdir(origDir, printLine, printLine, () => console.log('done orig'));
walkdir(mirrorDir, printLine, printLine, () => console.log('done mirror'));
