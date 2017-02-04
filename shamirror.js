const minimist = require('minimist');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const walkdir = (dirname, fn) => {
  fs.readdirSync(dirname).forEach(basename => {
    if (basename == '.DS_Store') return;
    const filename = path.join(dirname, basename);
    fs.statSync(filename).isDirectory() ? walkdir(filename, fn) : fn(filename);
  });
};

walkdir('.', filename => {
  const content = fs.readFileSync(filename);
  const sha = crypto.createHash('sha256').update(content).digest('hex');
});

const argv = minimist(process.argv.slice(2));
if (argv._.length != 2) {
  console.log('usage: <orig> <mirror>');
  process.exit(1);
}
