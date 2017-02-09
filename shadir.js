const minimist = require('minimist');
const crypto = require('crypto');
const async = require('async');
const diff = require('diff');
const path = require('path');
const _ = require('lodash');
const fs = require('fs');

const queue = async.queue((task, done) => task(done), 4);

const hashFile = (filename, done) => {
  const task = (taskDone) => {
    const hash = crypto.createHash('sha256');
    const input = fs.createReadStream(filename);
    input.on('readable', () => {
      const data = input.read();
      data ? hash.update(data) : taskDone(null, hash.digest('hex'));
    });
  };
  queue.push(task, (err, val) => {
    if (optionVerbose) console.error(filename);
    done(err, val);
  });
};

const shaDiff = (a, b) => {
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

const hashDir = (dirname, entries, values, done) => {
  const zipped = _.zip(values, entries);
  const sorted = _.sortBy(zipped, val => val[1]);
  const content = sorted.map(pair => pair.join(' ') + '\n').join('');
  const shadirFilename = path.join(dirname, '.shadir');
  if (optionSave) {
    fs.writeFileSync(shadirFilename, content);
  } else {
    try {
      const oldContent = fs.readFileSync(shadirFilename, 'utf8');
      if (oldContent != content) {
        console.log(`d ${dirname}`);
        console.log(shaDiff(oldContent, content));
      }
    } catch (e) {
      console.log(`e ${dirname}`);
    }
  }
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  if (optionVerbose) console.error(dirname);
  done(hash);
};

const ignoreFiles = ['.shadir', '.DS_Store'];

const walkDir = () => {
  const recurse = (dirname, done) => {
    const iteratee = (basename, eachDone) => {
      const filename = path.join(dirname, basename);
      fs.statSync(filename).isDirectory() ?
        recurse(filename, value => eachDone(null, value)) :
        hashFile(filename, eachDone);
    };
    const entries = fs.readdirSync(dirname);
    const shaEntries = _.difference(entries, ignoreFiles);
    async.map(shaEntries, iteratee, (err, values) => hashDir(dirname, shaEntries, values, done));
  };
  recurse(dirname, _.noop);
};

const argv = minimist(process.argv.slice(2), {boolean: ['s', 'v']});
if (argv._.length != 1) {
  console.log('usage: shadir [-s] <dirname>');
  process.exit(1);
}
const [dirname] = argv._;
const optionSave = argv.s;
const optionVerbose = argv.v;

walkDir();
