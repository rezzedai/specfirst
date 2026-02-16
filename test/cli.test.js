/**
 * cli.test.js — Tests for CLI interface
 *
 * Tests help output, version output, and unknown command handling
 * Zero dependencies, Node.js built-in test runner only.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('child_process');
const path = require('path');

const CLI_PATH = path.join(__dirname, '../bin/specfirst.js');

describe('CLI interface', () => {
  describe('help output', () => {
    it('should display help when --help flag is used', () => {
      const output = execSync(`node "${CLI_PATH}" --help`, { encoding: 'utf8' });

      assert.ok(output.includes('Usage:'));
      assert.ok(output.includes('specfirst init'));
      assert.ok(output.includes('specfirst review'));
      assert.ok(output.includes('specfirst list'));
      assert.ok(output.includes('specfirst status'));
    });

    it('should display help when -h flag is used', () => {
      const output = execSync(`node "${CLI_PATH}" -h`, { encoding: 'utf8' });

      assert.ok(output.includes('Usage:'));
      assert.ok(output.includes('specfirst init'));
    });

    it('should display help when no command is provided', () => {
      const output = execSync(`node "${CLI_PATH}"`, { encoding: 'utf8' });

      assert.ok(output.includes('Usage:'));
      assert.ok(output.includes('Options:'));
    });
  });

  describe('version output', () => {
    it('should display version when --version flag is used', () => {
      const output = execSync(`node "${CLI_PATH}" --version`, { encoding: 'utf8' });

      // Should contain a version number (e.g., 0.1.0)
      assert.match(output, /\d+\.\d+\.\d+/);
    });

    it('should display version when -v flag is used', () => {
      const output = execSync(`node "${CLI_PATH}" -v`, { encoding: 'utf8' });

      assert.match(output, /\d+\.\d+\.\d+/);
    });
  });

  describe('unknown command handling', () => {
    it('should exit with code 1 for unknown command', () => {
      try {
        execSync(`node "${CLI_PATH}" unknown-command`, { encoding: 'utf8', stdio: 'pipe' });
        assert.fail('Should have thrown an error');
      } catch (err) {
        assert.equal(err.status, 1);
        assert.ok(err.stderr.includes('Unknown command') || err.stdout.includes('Unknown command'));
      }
    });

    it('should suggest help for unknown command', () => {
      try {
        execSync(`node "${CLI_PATH}" notarealcommand`, { encoding: 'utf8', stdio: 'pipe' });
        assert.fail('Should have thrown an error');
      } catch (err) {
        const output = err.stderr + err.stdout;
        assert.ok(output.includes('help') || output.includes('--help'));
      }
    });
  });
});
