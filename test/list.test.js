/**
 * list.test.js — Tests for list command
 *
 * Tests parseSpecMetadata, getConfidenceEmoji
 * Zero dependencies, Node.js built-in test runner only.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseSpecMetadata, getConfidenceEmoji } = require('../src/cli/list.js');

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
});
