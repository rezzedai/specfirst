/**
 * init.js — Initialize specfirst in a project
 *
 * Creates .specfirst/ directory structure and default config.
 * Zero dependencies, Node.js built-ins only.
 */

const fs = require('fs/promises');
const path = require('path');

const DEFAULT_CONFIG = `# specfirst configuration
# See: https://github.com/rezzedai/specfirst

# Confidence thresholds
thresholds:
  proceed: 0.8       # Green — implement autonomously
  review: 0.5        # Yellow — flagged for human review (below = red/blocked)

# Scoring weights (must sum to 1.0)
weights:
  requirement_clarity: 0.25
  implementation_certainty: 0.25
  risk_awareness: 0.25
  dependency_clarity: 0.25

# Auto-scope: lightweight spec for trivial tasks
auto_scope:
  enabled: true
  max_steps_for_lightweight: 2    # At most this many steps for lightweight spec
  min_score_for_lightweight: 0.9  # All scores must meet this threshold

# Output
output:
  directory: ".specfirst/specs"   # Where specs are saved
  format: "markdown"              # Only markdown for v1
`;

module.exports = async function init(args) {
  const cwd = process.cwd();
  const specfirstDir = path.join(cwd, '.specfirst');
  const configPath = path.join(specfirstDir, 'config.yaml');
  const specsDir = path.join(specfirstDir, 'specs');
  const claudeSkillsDir = path.join(cwd, '.claude', 'skills');

  try {
    // 1. Check if already initialized
    try {
      await fs.access(specfirstDir);
      console.error('Error: .specfirst/ already exists in this directory.');
      console.error('If you want to reinitialize, remove it first: rm -rf .specfirst/');
      process.exit(1);
    } catch {
      // Directory doesn't exist, good to proceed
    }

    // 2. Create .specfirst/ directory
    await fs.mkdir(specfirstDir, { recursive: true });
    console.log('✓ Created .specfirst/');

    // 3. Create config.yaml
    await fs.writeFile(configPath, DEFAULT_CONFIG, 'utf8');
    console.log('✓ Created .specfirst/config.yaml');

    // 4. Create specs/ directory
    await fs.mkdir(specsDir, { recursive: true });
    console.log('✓ Created .specfirst/specs/');

    // 5. Check for Claude Code project and provide guidance
    try {
      await fs.access(claudeSkillsDir);
      console.log('\n📋 Claude Code project detected!');
      console.log('   To enable the /spec skill, copy the skill file:');
      console.log('   cp node_modules/@rezzed.ai/specfirst/SKILL.md .claude/skills/spec.md');
      console.log('   (or create a symlink if you prefer)');
    } catch {
      // Not a Claude Code project, skip
    }

    // 6. Success message
    console.log('\n✅ specfirst initialized successfully!\n');
    console.log('Next steps:');
    console.log('  1. Review configuration: .specfirst/config.yaml');
    console.log('  2. Create specs using /spec in Claude Code');
    console.log('     (Copy SKILL.md to .claude/skills/spec.md first)');
    console.log('  3. List specs: npx specfirst list');
    console.log('  4. Review a spec: npx specfirst review <spec-file>');

  } catch (err) {
    console.error('Error initializing specfirst:', err.message);
    process.exit(1);
  }
};
