const minimist = require('minimist');
const crypto = require('crypto');
const async = require('async');
const path = require('path');
const fs = require('fs');

const walkdir = (dirname, fn, walkdirDone) => {
  const entries = fs.readdirSync(dirname);
  async.each(entries, (basename, eachDone) => {
    const filename = path.join(dirname, basename);
    fs.statSync(filename).isDirectory() ?
      walkdir(filename, fn, eachDone) :
      fn(filename, eachDone);
  }, (err) => {
    walkdirDone()
  });
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
  }, Math.random() * 10000);
//   const content = fs.readFileSync(filename);
//   const sha = crypto.createHash('sha256').update(content).digest('hex');
};

walkdir(origDir, printLine, () => console.log('done orig'));
walkdir(mirrorDir, printLine, () => console.log('done mirror'));
