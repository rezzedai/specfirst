/**
 * review.js — Display scoring summary for a spec
 *
 * Parses and displays the scoring table from a spec file
 * Zero dependencies, Node.js built-ins only.
 */

const fs = require('fs/promises');
const path = require('path');

/**
 * Parse spec file to extract scoring summary
 * @param {string} content - File content
 * @returns {Object} Parsed scoring data
 */
function parseSpec(content) {
  const lines = content.split('\n');

  let name = 'Unknown';
  let status = 'unknown';
  let overallConfidence = null;
  let created = null;
  const steps = [];
  const flaggedDimensions = new Set();

  let inScoringTable = false;
  let tableHeaderPassed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Extract metadata
    const nameMatch = line.match(/^#\s+Spec:\s+(.+)$/);
    if (nameMatch) {
      name = nameMatch[1].trim();
    }

    const statusMatch = line.match(/^\*\*Status:\*\*\s+(.+)$/);
    if (statusMatch) {
      status = statusMatch[1].trim();
    }

    const confMatch = line.match(/^\*\*Overall Confidence:\*\*\s+([\d.]+)/);
    if (confMatch) {
      overallConfidence = parseFloat(confMatch[1]);
    }

    const createdMatch = line.match(/^\*\*Created:\*\*\s+(.+)$/);
    if (createdMatch) {
      created = createdMatch[1].trim();
    }

    // Detect scoring summary table
    if (line.includes('## Scoring Summary')) {
      inScoringTable = true;
      continue;
    }

    // Exit scoring table when we hit next section
    if (inScoringTable && line.startsWith('##') && !line.includes('Scoring Summary')) {
      break;
    }

    // Parse table rows
    if (inScoringTable) {
      // Skip table header and separator
      if (line.includes('Step') && (line.includes('Score') || line.includes('RC'))) {
        tableHeaderPassed = true;
        continue;
      }
      if (line.match(/^\|[\s-]+\|/)) {
        continue;
      }

      // Parse step rows: | Step | Score | RC | IC | RA | DC | Status |
      const rowMatch = line.match(/^\|\s*(.+?)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/);
      if (rowMatch && tableHeaderPassed) {
        const [, step, score, rc, ic, ra, dc] = rowMatch;

        const scores = {
          requirement_clarity: parseFloat(rc),
          implementation_certainty: parseFloat(ic),
          risk_awareness: parseFloat(ra),
          dependency_clarity: parseFloat(dc),
          average: parseFloat(score)
        };

        // Identify flagged dimensions (< 0.5)
        Object.entries(scores).forEach(([dim, score]) => {
          if (dim !== 'average' && score < 0.5) {
            flaggedDimensions.add(dim);
          }
        });

        steps.push({
          step: step.trim(),
          scores,
          emoji: getScoreEmoji(scores.average)
        });
      }
    }
  }

  return {
    name,
    status,
    overallConfidence,
    created,
    steps,
    flaggedDimensions: Array.from(flaggedDimensions)
  };
}

/**
 * Get color indicator for score
 * @param {number} score - Score value
 * @returns {string} Emoji indicator
 */
function getScoreEmoji(score) {
  if (score >= 0.8) return '🟢';
  if (score >= 0.5) return '🟡';
  return '🔴';
}

/**
 * Format dimension name for display
 * @param {string} dim - Dimension key
 * @returns {string} Formatted name
 */
function formatDimensionName(dim) {
  return dim.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

async function review(args) {
  if (args.length === 0) {
    console.error('Error: No spec file specified.\n');
    console.error('Usage: npx specfirst review <spec-file>\n');
    console.error('Example: npx specfirst review payment-api.md');
    process.exit(1);
  }

  const cwd = process.cwd();
  const specsDir = path.join(cwd, '.specfirst', 'specs');
  const specName = args[0].endsWith('.md') ? args[0] : `${args[0]}.md`;
  const specPath = path.join(specsDir, specName);

  try {
    // 1. Read spec file
    let content;
    try {
      content = await fs.readFile(specPath, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.error(`Error: Spec file not found: ${specName}\n`);

        // Show available specs
        try {
          const files = await fs.readdir(specsDir);
          const mdFiles = files.filter(f => f.endsWith('.md'));

          if (mdFiles.length > 0) {
            console.error('Available specs:');
            mdFiles.forEach(f => console.error(`  - ${f}`));
          } else {
            console.error('No specs found in .specfirst/specs/');
          }
        } catch {
          // Can't list specs
        }

        process.exit(1);
      }
      throw err;
    }

    // 2. Parse spec
    const spec = parseSpec(content);

    // 3. Display review
    console.log(`\n📋 Spec Review: ${spec.name}\n`);
    console.log(`Status: ${spec.status}`);
    console.log(`Created: ${spec.created || 'N/A'}`);

    if (spec.overallConfidence !== null) {
      console.log(`Overall Confidence: ${spec.overallConfidence.toFixed(2)} ${getScoreEmoji(spec.overallConfidence)}\n`);
    } else {
      console.log('Overall Confidence: N/A\n');
    }

    // 4. Display scoring table
    if (spec.steps.length > 0) {
      console.log('Scoring Summary:\n');
      console.log('Step'.padEnd(40) + 'Req'.padStart(6) + 'Impl'.padStart(6) + 'Risk'.padStart(6) + 'Deps'.padStart(6) + 'Avg'.padStart(6) + '  Status');
      console.log('─'.repeat(85));

      for (const step of spec.steps) {
        const s = step.scores;
        const row = [
          step.step.padEnd(40),
          s.requirement_clarity.toFixed(2).padStart(6),
          s.implementation_certainty.toFixed(2).padStart(6),
          s.risk_awareness.toFixed(2).padStart(6),
          s.dependency_clarity.toFixed(2).padStart(6),
          s.average.toFixed(2).padStart(6),
          `  ${step.emoji}`
        ].join('');

        console.log(row);
      }

      console.log('\nLegend: 🟢 Proceed (≥0.8)  🟡 Review (0.5-0.79)  🔴 Blocked (<0.5)');
    }

    // 5. Highlight flagged dimensions
    if (spec.flaggedDimensions.length > 0) {
      console.log('\n⚠️  Flagged Dimensions (score < 0.5):');
      spec.flaggedDimensions.forEach(dim => {
        console.log(`   - ${formatDimensionName(dim)}`);
      });
    }

    // 6. Show steps needing review
    const needsReview = spec.steps.filter(s => s.scores.average >= 0.5 && s.scores.average < 0.8);
    const blocked = spec.steps.filter(s => s.scores.average < 0.5);

    if (needsReview.length > 0) {
      console.log('\n🟡 Steps Needing Review:');
      needsReview.forEach(s => console.log(`   - ${s.step}`));
    }

    if (blocked.length > 0) {
      console.log('\n🔴 Blocked Steps:');
      blocked.forEach(s => console.log(`   - ${s.step}`));
    }

    // 7. Next steps recommendation
    console.log('\nNext Steps:');
    if (spec.overallConfidence >= 0.8) {
      console.log('  ✓ This spec is ready to implement');
    } else if (spec.overallConfidence >= 0.5) {
      console.log('  → Review flagged items before implementation');
      console.log('  → Update status: npx specfirst status', specName, 'reviewed');
    } else {
      console.log('  ⚠️  This spec needs significant clarification before proceeding');
    }

    console.log('');

  } catch (err) {
    console.error('Error reviewing spec:', err.message);
    process.exit(1);
  }
}

module.exports = review;
module.exports.parseSpec = parseSpec;
module.exports.getScoreEmoji = getScoreEmoji;
module.exports.formatDimensionName = formatDimensionName;
