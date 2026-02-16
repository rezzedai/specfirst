/**
 * list.js — List all specs with scores
 *
 * Displays a formatted table of all specs in .specfirst/specs/
 * Zero dependencies, Node.js built-ins only.
 */

const fs = require('fs/promises');
const path = require('path');

/**
 * Parse spec file to extract metadata
 * @param {string} content - File content
 * @param {string} filename - File name
 * @returns {Object} Parsed metadata
 */
function parseSpecMetadata(content, filename) {
  const lines = content.split('\n');

  let name = filename.replace('.md', '');
  let status = 'unknown';
  let confidence = null;
  let created = null;

  for (const line of lines) {
    // Extract feature name from "# Spec: {name}"
    const nameMatch = line.match(/^#\s+Spec:\s+(.+)$/);
    if (nameMatch) {
      name = nameMatch[1].trim();
    }

    // Extract status from "**Status:** {status}"
    const statusMatch = line.match(/^\*\*Status:\*\*\s+(.+)$/);
    if (statusMatch) {
      status = statusMatch[1].trim();
    }

    // Extract confidence from "**Overall Confidence:** {score} {emoji}"
    const confMatch = line.match(/^\*\*Overall Confidence:\*\*\s+([\d.]+)/);
    if (confMatch) {
      confidence = parseFloat(confMatch[1]);
    }

    // Extract created date from "**Created:** {date}"
    const createdMatch = line.match(/^\*\*Created:\*\*\s+(.+)$/);
    if (createdMatch) {
      created = createdMatch[1].trim();
    }
  }

  return { name, status, confidence, created, filename };
}

/**
 * Get emoji for confidence score
 * @param {number} score - Confidence score
 * @returns {string} Emoji indicator
 */
function getConfidenceEmoji(score) {
  if (score === null) return '⚪';
  if (score >= 0.8) return '🟢';
  if (score >= 0.5) return '🟡';
  return '🔴';
}

/**
 * Format table row with proper padding
 * @param {string} file - Filename
 * @param {string} status - Status
 * @param {string} confidence - Confidence string
 * @param {string} created - Created date
 * @returns {string} Formatted row
 */
function formatRow(file, status, confidence, created) {
  const filePad = 35;
  const statusPad = 15;
  const confPad = 15;

  return [
    file.padEnd(filePad),
    status.padEnd(statusPad),
    confidence.padEnd(confPad),
    created || 'N/A'
  ].join('  ');
}

module.exports = async function list(args) {
  const cwd = process.cwd();
  const specsDir = path.join(cwd, '.specfirst', 'specs');

  try {
    // 1. Check if .specfirst/specs/ exists
    try {
      await fs.access(specsDir);
    } catch {
      console.error('Error: .specfirst/specs/ not found.');
      console.error('Run "npx specfirst init" first to initialize specfirst.');
      process.exit(1);
    }

    // 2. Read all files in specs directory
    const files = await fs.readdir(specsDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    if (mdFiles.length === 0) {
      console.log('No specs found in .specfirst/specs/\n');
      console.log('Create your first spec:');
      console.log('  npx specfirst spec "Add feature name"');
      console.log('\nOr use /spec in Claude Code');
      return;
    }

    // 3. Parse each spec file
    const specs = [];
    for (const file of mdFiles) {
      const filePath = path.join(specsDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      const metadata = parseSpecMetadata(content, file);
      specs.push(metadata);
    }

    // 4. Sort by created date (newest first), fall back to filename
    specs.sort((a, b) => {
      if (a.created && b.created) {
        return b.created.localeCompare(a.created);
      }
      return a.filename.localeCompare(b.filename);
    });

    // 5. Display as formatted table
    console.log('\nSpecFirst Specs\n');
    console.log(formatRow('File', 'Status', 'Confidence', 'Created'));
    console.log('─'.repeat(90));

    for (const spec of specs) {
      const confStr = spec.confidence !== null
        ? `${spec.confidence.toFixed(2)} ${getConfidenceEmoji(spec.confidence)}`
        : 'N/A';

      console.log(formatRow(
        spec.filename,
        spec.status,
        confStr,
        spec.created
      ));
    }

    console.log('\nLegend: 🟢 Proceed (≥0.8)  🟡 Review (0.5-0.79)  🔴 Blocked (<0.5)');
    console.log(`\nTotal: ${specs.length} spec${specs.length === 1 ? '' : 's'}`);

  } catch (err) {
    console.error('Error listing specs:', err.message);
    process.exit(1);
  }
};
