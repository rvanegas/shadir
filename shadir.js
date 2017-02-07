const minimist = require('minimist');
const crypto = require('crypto');
const async = require('async');
const diff = require('diff');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

const ignoreFiles = ['.shadir', '.DS_Store'];

const walkdir = (dirname, fileFunc, dirFunc) => {
  const recurse = (dirname, done) => {
    const entries = _.difference(fs.readdirSync(dirname), ignoreFiles);
    const iteratee = (basename, eachDone) => {
      const filename = path.join(dirname, basename);
      fs.statSync(filename).isDirectory() ?
        recurse(filename, value => eachDone(null, value)) :
        fileFunc(filename, eachDone);
    };
    async.map(entries, iteratee, (err, values) => dirFunc(dirname, entries, values, done));
  };
  recurse(dirname, _.noop);
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
  if (saveOption) {
    fs.writeFileSync(shadirFilename, content);
  } else {
    const oldContent = fs.readFileSync(shadirFilename, 'utf8');
    if (oldContent != content) {
      console.log(`d ${dirname}`);
      console.log(shadiff(oldContent, content));
    }
  }
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  done(hash);
};

const shadiff = (a, b) => {
  const changes = diff.diffLines(a, b);
  const changedLines = changes.filter(line => line.added || line.removed);
  const diffLines = changedLines.map(change => {
    const lines = change.value.split('\n');
    const trimmed = lines.slice(0, lines.length - 1);
    const prefixed = trimmed.map(line => `${change.added ? '+' : change.removed ? '-' : '?'} ${line}`);
    return prefixed.join('\n');
  });
  return diffLines.join('\n');
};

const argv = minimist(process.argv.slice(2), {boolean: ['s']});
if (argv._.length != 1) {
  console.log('usage: shadir [-s] <dir>', argv);
  process.exit(1);
}

const [dir] = argv._;
const saveOption = argv.s;
walkdir(dir, handleFile, handleDir);
