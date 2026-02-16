/**
 * review.test.js — Tests for review command
 *
 * Tests parseSpec, getScoreEmoji, formatDimensionName
 * Zero dependencies, Node.js built-in test runner only.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const { parseSpec, getScoreEmoji, formatDimensionName } = require('../src/cli/review.js');

describe('review command', () => {
  describe('parseSpec', () => {
    it('should extract metadata from example spec', async () => {
      const examplePath = path.join(__dirname, '../examples/payment-api.md');
      const content = await fs.readFile(examplePath, 'utf8');
      const spec = parseSpec(content);

      assert.equal(spec.name, 'Payment Processing API with Stripe Integration');
      assert.equal(spec.status, 'review-required');
      assert.equal(spec.overallConfidence, 0.72);
      assert.equal(spec.created, '2026-02-15T11:00:00Z');
    });

    it('should extract 6 steps from example spec', async () => {
      const examplePath = path.join(__dirname, '../examples/payment-api.md');
      const content = await fs.readFile(examplePath, 'utf8');
      const spec = parseSpec(content);

      assert.equal(spec.steps.length, 6);
    });

    it('should extract correct scores for Step 1', async () => {
      const examplePath = path.join(__dirname, '../examples/payment-api.md');
      const content = await fs.readFile(examplePath, 'utf8');
      const spec = parseSpec(content);

      const step1 = spec.steps[0];
      assert.equal(step1.step, 'Step 1');
      assert.equal(step1.scores.average, 0.88);
      assert.equal(step1.scores.requirement_clarity, 0.95);
      assert.equal(step1.scores.implementation_certainty, 0.95);
      assert.equal(step1.scores.risk_awareness, 0.75);
      assert.equal(step1.scores.dependency_clarity, 0.90);
    });

    it('should extract correct scores for Step 6', async () => {
      const examplePath = path.join(__dirname, '../examples/payment-api.md');
      const content = await fs.readFile(examplePath, 'utf8');
      const spec = parseSpec(content);

      const step6 = spec.steps[5];
      assert.equal(step6.step, 'Step 6');
      assert.equal(step6.scores.average, 0.58);
      assert.equal(step6.scores.requirement_clarity, 0.50);
      assert.equal(step6.scores.implementation_certainty, 0.75);
      assert.equal(step6.scores.risk_awareness, 0.55);
      assert.equal(step6.scores.dependency_clarity, 0.60);
    });

    it('should detect flagged dimensions (score < 0.5)', async () => {
      const examplePath = path.join(__dirname, '../examples/payment-api.md');
      const content = await fs.readFile(examplePath, 'utf8');
      const spec = parseSpec(content);

      // Step 6 has requirement_clarity: 0.50, which is NOT < 0.5
      // So flaggedDimensions should be empty based on the scoring table
      assert.equal(spec.flaggedDimensions.length, 0);
    });

    it('should handle spec with no scoring table', () => {
      const content = `# Spec: Test Spec

**Status:** draft
**Created:** 2026-02-15

## Context
Some context here.
`;

      const spec = parseSpec(content);
      assert.equal(spec.name, 'Test Spec');
      assert.equal(spec.status, 'draft');
      assert.equal(spec.steps.length, 0);
      assert.equal(spec.overallConfidence, null);
    });
  });

  describe('getScoreEmoji', () => {
    it('should return green for score >= 0.8', () => {
      assert.equal(getScoreEmoji(0.8), '🟢');
      assert.equal(getScoreEmoji(0.9), '🟢');
      assert.equal(getScoreEmoji(1.0), '🟢');
    });

    it('should return yellow for score >= 0.5 and < 0.8', () => {
      assert.equal(getScoreEmoji(0.5), '🟡');
      assert.equal(getScoreEmoji(0.6), '🟡');
      assert.equal(getScoreEmoji(0.79), '🟡');
    });

    it('should return red for score < 0.5', () => {
      assert.equal(getScoreEmoji(0.0), '🔴');
      assert.equal(getScoreEmoji(0.3), '🔴');
      assert.equal(getScoreEmoji(0.49), '🔴');
    });
  });

  describe('formatDimensionName', () => {
    it('should convert requirement_clarity to Requirement Clarity', () => {
      assert.equal(formatDimensionName('requirement_clarity'), 'Requirement Clarity');
    });

    it('should convert implementation_certainty to Implementation Certainty', () => {
      assert.equal(formatDimensionName('implementation_certainty'), 'Implementation Certainty');
    });

    it('should convert risk_awareness to Risk Awareness', () => {
      assert.equal(formatDimensionName('risk_awareness'), 'Risk Awareness');
    });

    it('should convert dependency_clarity to Dependency Clarity', () => {
      assert.equal(formatDimensionName('dependency_clarity'), 'Dependency Clarity');
    });
  });
});
