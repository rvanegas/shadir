const minimist = require('minimist');

const argv = minimist(process.argv.slice(2));
if (argv._.length != 2) {
  console.log('usage: <orig> <mirror>');
  process.exit(1);
}
