/**
 * list.test.js — Tests for list command
 *
 * Tests parseSpecMetadata, getConfidenceEmoji
 * Zero dependencies, Node.js built-in test runner only.
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { parseSpecMetadata, getConfidenceEmoji } = require('../src/cli/list.js');

const CLI_PATH = path.join(__dirname, '../bin/specfirst.js');

describe('list command', () => {
  describe('parseSpecMetadata', () => {
    it('should extract metadata from spec content', () => {
      const content = `# Spec: Payment API

**Created:** 2026-02-15T10:00:00Z
**Status:** draft
**Overall Confidence:** 0.75 🟡

## Context
Some context here.
`;

      const metadata = parseSpecMetadata(content, 'payment-api.md');

      assert.equal(metadata.name, 'Payment API');
      assert.equal(metadata.status, 'draft');
      assert.equal(metadata.confidence, 0.75);
      assert.equal(metadata.created, '2026-02-15T10:00:00Z');
      assert.equal(metadata.filename, 'payment-api.md');
    });

    it('should use filename as fallback for name', () => {
      const content = `**Status:** draft`;

      const metadata = parseSpecMetadata(content, 'my-spec.md');

      assert.equal(metadata.name, 'my-spec');
      assert.equal(metadata.filename, 'my-spec.md');
    });

    it('should handle missing confidence', () => {
      const content = `# Spec: Test Spec

**Status:** draft
**Created:** 2026-02-15
`;

      const metadata = parseSpecMetadata(content, 'test.md');

      assert.equal(metadata.name, 'Test Spec');
      assert.equal(metadata.confidence, null);
    });

    it('should handle missing created date', () => {
      const content = `# Spec: Test Spec

**Status:** draft
**Overall Confidence:** 0.80
`;

      const metadata = parseSpecMetadata(content, 'test.md');

      assert.equal(metadata.name, 'Test Spec');
      assert.equal(metadata.created, null);
    });
  });

  describe('getConfidenceEmoji', () => {
    it('should return white circle for null score', () => {
      assert.equal(getConfidenceEmoji(null), '⚪');
    });

    it('should return green for score >= 0.8', () => {
      assert.equal(getConfidenceEmoji(0.8), '🟢');
      assert.equal(getConfidenceEmoji(0.9), '🟢');
      assert.equal(getConfidenceEmoji(1.0), '🟢');
    });

    it('should return yellow for score >= 0.5 and < 0.8', () => {
      assert.equal(getConfidenceEmoji(0.5), '🟡');
      assert.equal(getConfidenceEmoji(0.6), '🟡');
      assert.equal(getConfidenceEmoji(0.79), '🟡');
    });

    it('should return red for score < 0.5', () => {
      assert.equal(getConfidenceEmoji(0.0), '🔴');
      assert.equal(getConfidenceEmoji(0.3), '🔴');
      assert.equal(getConfidenceEmoji(0.49), '🔴');
    });
  });

  describe('integration tests', () => {
    let tempDir;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specfirst-test-'));
      // Initialize specfirst in temp directory
      execSync(`node "${CLI_PATH}" init`, { cwd: tempDir, encoding: 'utf8', stdio: 'pipe' });
    });

    afterEach(async () => {
      if (tempDir) {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should handle empty specs directory', async () => {
      const output = execSync(`node "${CLI_PATH}" list`, { cwd: tempDir, encoding: 'utf8' });

      assert.ok(output.includes('No specs found'));
      assert.ok(output.includes('Create your first spec'));
    });

    it('should fail without .specfirst/ directory', async () => {
      const uninitializedDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specfirst-uninit-'));

      try {
        execSync(`node "${CLI_PATH}" list`, { cwd: uninitializedDir, encoding: 'utf8', stdio: 'pipe' });
        assert.fail('Should have thrown an error');
      } catch (err) {
        assert.equal(err.status, 1);
        const output = err.stderr + err.stdout;
        assert.ok(output.includes('.specfirst/specs/ not found'));
      } finally {
        await fs.rm(uninitializedDir, { recursive: true, force: true });
      }
    });

    it('should sort by date (newest first)', async () => {
      const specsDir = path.join(tempDir, '.specfirst', 'specs');

      // Create specs with different dates
      await fs.writeFile(path.join(specsDir, 'old-spec.md'), `# Spec: Old Spec
**Created:** 2026-01-01T10:00:00Z
**Status:** draft
**Overall Confidence:** 0.75
`, 'utf8');

      await fs.writeFile(path.join(specsDir, 'new-spec.md'), `# Spec: New Spec
**Created:** 2026-02-15T10:00:00Z
**Status:** draft
**Overall Confidence:** 0.80
`, 'utf8');

      const output = execSync(`node "${CLI_PATH}" list`, { cwd: tempDir, encoding: 'utf8' });

      // New spec should appear before old spec
      const newSpecIndex = output.indexOf('new-spec.md');
      const oldSpecIndex = output.indexOf('old-spec.md');

      assert.ok(newSpecIndex > 0, 'Should find new-spec.md');
      assert.ok(oldSpecIndex > 0, 'Should find old-spec.md');
      assert.ok(newSpecIndex < oldSpecIndex, 'new-spec.md should appear before old-spec.md');
    });

    it('should filter non-.md files', async () => {
      const specsDir = path.join(tempDir, '.specfirst', 'specs');

      // Create .md and non-.md files
      await fs.writeFile(path.join(specsDir, 'valid-spec.md'), `# Spec: Valid
**Status:** draft
`, 'utf8');

      await fs.writeFile(path.join(specsDir, 'not-a-spec.txt'), 'This should be ignored', 'utf8');
      await fs.writeFile(path.join(specsDir, 'README'), 'This should also be ignored', 'utf8');

      const output = execSync(`node "${CLI_PATH}" list`, { cwd: tempDir, encoding: 'utf8' });

      assert.ok(output.includes('valid-spec.md'));
      assert.ok(!output.includes('not-a-spec.txt'));
      assert.ok(!output.includes('README'));
      assert.ok(output.includes('Total: 1 spec'));
    });
  });
});
