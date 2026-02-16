/**
 * status.test.js — Tests for status command
 *
 * Tests updateStatus, VALID_STATUSES
 * Zero dependencies, Node.js built-in test runner only.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { updateStatus, VALID_STATUSES } = require('../src/cli/status.js');

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
});
