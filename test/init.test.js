/**
 * init.test.js — Tests for init command
 *
 * Tests project initialization: directory creation, config generation, Claude Code detection
 * Zero dependencies, Node.js built-in test runner only.
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const CLI_PATH = path.join(__dirname, '../bin/specfirst.js');

describe('init command', () => {
  let tempDir;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specfirst-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('initialization', () => {
    it('should create .specfirst/ directory', async () => {
      execSync(`node "${CLI_PATH}" init`, { cwd: tempDir, encoding: 'utf8' });

      const specfirstDir = path.join(tempDir, '.specfirst');
      const stats = await fs.stat(specfirstDir);
      assert.ok(stats.isDirectory());
    });

    it('should create config.yaml with default content', async () => {
      execSync(`node "${CLI_PATH}" init`, { cwd: tempDir, encoding: 'utf8' });

      const configPath = path.join(tempDir, '.specfirst', 'config.yaml');
      const content = await fs.readFile(configPath, 'utf8');

      // Check for key sections
      assert.ok(content.includes('# specfirst configuration'));
      assert.ok(content.includes('thresholds:'));
      assert.ok(content.includes('proceed: 0.8'));
      assert.ok(content.includes('review: 0.5'));
      assert.ok(content.includes('weights:'));
      assert.ok(content.includes('auto_scope:'));
      assert.ok(content.includes('output:'));
    });

    it('should create specs/ subdirectory', async () => {
      execSync(`node "${CLI_PATH}" init`, { cwd: tempDir, encoding: 'utf8' });

      const specsDir = path.join(tempDir, '.specfirst', 'specs');
      const stats = await fs.stat(specsDir);
      assert.ok(stats.isDirectory());
    });

    it('should refuse re-initialization (exits code 1)', async () => {
      // First initialization should succeed
      execSync(`node "${CLI_PATH}" init`, { cwd: tempDir, encoding: 'utf8' });

      // Second initialization should fail
      try {
        execSync(`node "${CLI_PATH}" init`, { cwd: tempDir, encoding: 'utf8', stdio: 'pipe' });
        assert.fail('Should have thrown an error on re-initialization');
      } catch (err) {
        assert.equal(err.status, 1);
        const output = err.stderr + err.stdout;
        assert.ok(output.includes('.specfirst/ already exists'));
      }
    });
  });

  describe('Claude Code detection', () => {
    it('should detect Claude Code project (has .claude/skills/)', async () => {
      // Create .claude/skills/ directory to simulate Claude Code project
      const claudeSkillsDir = path.join(tempDir, '.claude', 'skills');
      await fs.mkdir(claudeSkillsDir, { recursive: true });

      const output = execSync(`node "${CLI_PATH}" init`, { cwd: tempDir, encoding: 'utf8' });

      assert.ok(output.includes('Claude Code project detected'));
      assert.ok(output.includes('copy the skill file'));
    });

    it('should skip Claude Code detection silently', async () => {
      // No .claude/skills/ directory - not a Claude Code project
      const output = execSync(`node "${CLI_PATH}" init`, { cwd: tempDir, encoding: 'utf8' });

      assert.ok(!output.includes('Claude Code project detected'));
      // Should still succeed
      assert.ok(output.includes('initialized successfully'));
    });
  });

  describe('config validation', () => {
    it('should create valid YAML config with all required sections', async () => {
      execSync(`node "${CLI_PATH}" init`, { cwd: tempDir, encoding: 'utf8' });

      const configPath = path.join(tempDir, '.specfirst', 'config.yaml');
      const content = await fs.readFile(configPath, 'utf8');

      // Check thresholds
      assert.ok(content.includes('thresholds:'));
      assert.ok(content.includes('proceed:'));
      assert.ok(content.includes('review:'));

      // Check weights
      assert.ok(content.includes('weights:'));
      assert.ok(content.includes('requirement_clarity:'));
      assert.ok(content.includes('implementation_certainty:'));
      assert.ok(content.includes('risk_awareness:'));
      assert.ok(content.includes('dependency_clarity:'));

      // Check auto_scope
      assert.ok(content.includes('auto_scope:'));
      assert.ok(content.includes('enabled:'));

      // Check output
      assert.ok(content.includes('output:'));
      assert.ok(content.includes('directory:'));
      assert.ok(content.includes('format:'));
    });

    it('should have weight values that sum to 1.0', async () => {
      execSync(`node "${CLI_PATH}" init`, { cwd: tempDir, encoding: 'utf8' });

      const configPath = path.join(tempDir, '.specfirst', 'config.yaml');
      const content = await fs.readFile(configPath, 'utf8');

      // Extract weight values using regex
      const weightMatches = content.match(/requirement_clarity:\s+([\d.]+)|implementation_certainty:\s+([\d.]+)|risk_awareness:\s+([\d.]+)|dependency_clarity:\s+([\d.]+)/g);

      assert.ok(weightMatches, 'Should find weight values');

      let sum = 0;
      for (const match of weightMatches) {
        const value = parseFloat(match.split(':')[1].trim());
        sum += value;
      }

      // Check sum is 1.0 (with floating point tolerance)
      assert.ok(Math.abs(sum - 1.0) < 0.001, `Weights should sum to 1.0, got ${sum}`);
    });
  });
});
