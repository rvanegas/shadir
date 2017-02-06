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
    async.map(entries, iteratee, (err, values) => walkDone(values.join('')));
  };
  const walkdirFunc = (name, done) => walk(name, (values) => dirFunc(name, values, done));
  walkdirFunc(dirname, walkdirDone);
};

const queue = async.queue((task, done) => task(done), 4);

const handleFile = (filename, done) => {
  const task = (taskDone) => {
    const hash = crypto.createHash('sha256');
    const input = fs.createReadStream(filename);
    input.on('readable', () => {
      const data = input.read();
      if (data) {
        hash.update(data);
      }
      else {
        const sha = hash.digest('hex');
        const log = `${sha} ${filename}\n`;
        taskDone(null, log);
      }
    });
  };
  queue.push(task, done);
};

const handleDir = (filename, shas, done) => {
  const log = `${filename}\n${shas}`;
  done(null, log);
};

const argv = minimist(process.argv.slice(2));
if (argv._.length != 2) {
  console.log('usage: <orig> <mirror>');
  process.exit(1);
}

const [origDir, mirrorDir] = argv._;

walkdir(origDir, handleFile, handleDir, (err, shas) => {
  console.log('done orig');
  console.log(shas);
});
