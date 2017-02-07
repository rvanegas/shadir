const minimist = require('minimist');
const crypto = require('crypto');
const async = require('async');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

const ignoreFiles = ['.shadir', '.DS_Store'];

const walkdir = (dirname, fileFunc, dirFunc, walkdirDone) => {
  const walk = (dirname, walkDone) => {
    const entries = _.difference(fs.readdirSync(dirname), ignoreFiles);
    const iteratee = (basename, eachDone) => {
      const filename = path.join(dirname, basename);
      fs.statSync(filename).isDirectory() ?
        walk(filename, value => eachDone(null, value)) :
        fileFunc(filename, eachDone);
    };
    async.map(entries, iteratee, (err, values) => dirFunc(dirname, entries, values, walkDone));
  };
  walk(dirname, value => walkdirDone(null, value));
};

const queue = async.queue((task, done) => task(done), 4);

const handleFile = (filename, done) => {
  const task = (taskDone) => {
    const hash = crypto.createHash('sha256');
    const input = fs.createReadStream(filename);
    input.on('readable', () => {
      const data = input.read();
      data ? hash.update(data) : taskDone(null, hash.digest('hex'));
    });
  };
  queue.push(task, done);
};

const handleDir = (dirname, entries, values, done) => {
  const zipped = _.zip(values, entries);
  const sorted = _.sortBy(zipped, val => val[1]);
  const content = sorted.map(pair => pair.join(' ') + '\n').join('');
  const shadirFilename = path.join(dirname, '.shadir');
  fs.writeFileSync(shadirFilename, content);
  handleFile(shadirFilename, (err, value) => done(value));
};

const argv = minimist(process.argv.slice(2), {boolean: ['s']});
if (argv._.length != 1) {
  console.log('usage: shadir [-s] <dir>', argv);
  process.exit(1);
}

const [origDir, mirrorDir] = argv._;

walkdir(origDir, handleFile, handleDir, (err) => {
  console.log('done orig');
});
