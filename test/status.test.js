/**
 * status.test.js — Tests for status command
 *
 * Tests updateStatus, VALID_STATUSES
 * Zero dependencies, Node.js built-in test runner only.
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { updateStatus, VALID_STATUSES } = require('../src/cli/status.js');

const CLI_PATH = path.join(__dirname, '../bin/specfirst.js');

describe('status command', () => {
  describe('updateStatus', () => {
    it('should replace status line correctly', () => {
      const content = `# Spec: Test Spec

**Created:** 2026-02-15
**Status:** draft
**Overall Confidence:** 0.75

## Context
Some content here.
`;

      const updated = updateStatus(content, 'approved');

      assert.ok(updated.includes('**Status:** approved'));
      assert.ok(!updated.includes('**Status:** draft'));
    });

    it('should preserve rest of content when updating status', () => {
      const content = `# Spec: Test Spec

**Created:** 2026-02-15
**Status:** draft
**Overall Confidence:** 0.75

## Context
Some content here.
`;

      const updated = updateStatus(content, 'reviewed');

      assert.ok(updated.includes('# Spec: Test Spec'));
      assert.ok(updated.includes('**Created:** 2026-02-15'));
      assert.ok(updated.includes('**Overall Confidence:** 0.75'));
      assert.ok(updated.includes('## Context'));
      assert.ok(updated.includes('Some content here.'));
    });

    it('should throw when no status field found', () => {
      const content = `# Spec: Test Spec

**Created:** 2026-02-15

## Context
No status field here.
`;

      assert.throws(
        () => updateStatus(content, 'approved'),
        { message: 'Status field not found in spec file' }
      );
    });

    it('should handle status field at different positions', () => {
      const content = `# Spec: Test Spec

**Overall Confidence:** 0.80
**Created:** 2026-02-15
**Status:** implementing

## Context
Status field in middle.
`;

      const updated = updateStatus(content, 'complete');

      assert.ok(updated.includes('**Status:** complete'));
      assert.ok(!updated.includes('**Status:** implementing'));
    });
  });

  describe('VALID_STATUSES', () => {
    it('should contain expected status values', () => {
      assert.ok(Array.isArray(VALID_STATUSES));
      assert.ok(VALID_STATUSES.includes('draft'));
      assert.ok(VALID_STATUSES.includes('reviewed'));
      assert.ok(VALID_STATUSES.includes('approved'));
      assert.ok(VALID_STATUSES.includes('implementing'));
      assert.ok(VALID_STATUSES.includes('complete'));
    });

    it('should have exactly 5 statuses', () => {
      assert.equal(VALID_STATUSES.length, 5);
    });
  });

  describe('integration tests', () => {
    let tempDir;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specfirst-test-'));
      execSync(`node "${CLI_PATH}" init`, { cwd: tempDir, encoding: 'utf8', stdio: 'pipe' });
    });

    afterEach(async () => {
      if (tempDir) {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should accept case-insensitive status input', async () => {
      const specsDir = path.join(tempDir, '.specfirst', 'specs');

      await fs.writeFile(path.join(specsDir, 'test.md'), `# Spec: Test
**Status:** draft
**Created:** 2026-02-15
`, 'utf8');

      // Test uppercase input
      const output1 = execSync(`node "${CLI_PATH}" status test.md APPROVED`, { cwd: tempDir, encoding: 'utf8' });
      assert.ok(output1.includes('draft → approved'));

      // Verify file was updated with lowercase
      const content1 = await fs.readFile(path.join(specsDir, 'test.md'), 'utf8');
      assert.ok(content1.includes('**Status:** approved'));

      // Test mixed case input
      const output2 = execSync(`node "${CLI_PATH}" status test.md ImPlEmEnTiNg`, { cwd: tempDir, encoding: 'utf8' });
      assert.ok(output2.includes('approved → implementing'));
    });

    it('should exit with code 1 when missing arguments', async () => {
      try {
        execSync(`node "${CLI_PATH}" status`, { cwd: tempDir, encoding: 'utf8', stdio: 'pipe' });
        assert.fail('Should have thrown an error');
      } catch (err) {
        assert.equal(err.status, 1);
        const output = err.stderr + err.stdout;
        assert.ok(output.includes('Missing arguments'));
        assert.ok(output.includes('Usage:'));
      }
    });

    it('should exit with code 1 when only file provided (missing status)', async () => {
      const specsDir = path.join(tempDir, '.specfirst', 'specs');

      await fs.writeFile(path.join(specsDir, 'test.md'), `# Spec: Test
**Status:** draft
`, 'utf8');

      try {
        execSync(`node "${CLI_PATH}" status test.md`, { cwd: tempDir, encoding: 'utf8', stdio: 'pipe' });
        assert.fail('Should have thrown an error');
      } catch (err) {
        assert.equal(err.status, 1);
        const output = err.stderr + err.stdout;
        assert.ok(output.includes('Missing arguments'));
      }
    });

    it('should exit with code 1 for invalid status', async () => {
      const specsDir = path.join(tempDir, '.specfirst', 'specs');

      await fs.writeFile(path.join(specsDir, 'test.md'), `# Spec: Test
**Status:** draft
`, 'utf8');

      try {
        execSync(`node "${CLI_PATH}" status test.md invalid-status`, { cwd: tempDir, encoding: 'utf8', stdio: 'pipe' });
        assert.fail('Should have thrown an error');
      } catch (err) {
        assert.equal(err.status, 1);
        const output = err.stderr + err.stdout;
        assert.ok(output.includes('Invalid status'));
        assert.ok(output.includes('Valid statuses:'));
      }
    });
  });
});
