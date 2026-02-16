#!/usr/bin/env node

const { resolve } = require('path');
const command = process.argv[2];
const args = process.argv.slice(3);

const commands = {
  init: '../src/cli/init',
  list: '../src/cli/list',
  review: '../src/cli/review',
  status: '../src/cli/status',
};

if (!command || command === '--help' || command === '-h') {
  console.log(`
specfirst — Plan-before-build with confidence scoring

Usage:
  specfirst init              Initialize specfirst in current project
  specfirst list              List all specs with scores
  specfirst review <file>     Display scoring summary for a spec
  specfirst status <file> <status>  Update spec status

Options:
  --help, -h    Show this help message
  --version, -v Show version
`);
  process.exit(0);
}

if (command === '--version' || command === '-v') {
  const pkg = require('../package.json');
  console.log(pkg.version);
  process.exit(0);
}

if (!commands[command]) {
  console.error(`Unknown command: ${command}`);
  console.error('Run "specfirst --help" for usage.');
  process.exit(1);
}

const handler = require(resolve(__dirname, commands[command]));
handler(args).catch(err => {
  console.error(err.message);
  process.exit(1);
});
