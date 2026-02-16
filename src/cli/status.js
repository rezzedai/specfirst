/**
 * status.js — Update spec status
 *
 * Updates the status field in a spec file
 * Zero dependencies, Node.js built-ins only.
 */

const fs = require('fs/promises');
const path = require('path');

const VALID_STATUSES = ['draft', 'reviewed', 'approved', 'implementing', 'complete'];

/**
 * Update status in spec content
 * @param {string} content - Original content
 * @param {string} newStatus - New status value
 * @returns {string} Updated content
 */
function updateStatus(content, newStatus) {
  const lines = content.split('\n');
  let updated = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const statusMatch = line.match(/^(\*\*Status:\*\*\s+)(.+)$/);

    if (statusMatch) {
      lines[i] = `${statusMatch[1]}${newStatus}`;
      updated = true;
      break;
    }
  }

  if (!updated) {
    throw new Error('Status field not found in spec file');
  }

  return lines.join('\n');
}

async function status(args) {
  // 1. Validate arguments
  if (args.length < 2) {
    console.error('Error: Missing arguments.\n');
    console.error('Usage: npx specfirst status <spec-file> <new-status>\n');
    console.error('Valid statuses:', VALID_STATUSES.join(', '));
    console.error('\nExample: npx specfirst status payment-api.md approved');
    process.exit(1);
  }

  const specName = args[0].endsWith('.md') ? args[0] : `${args[0]}.md`;
  const newStatus = args[1].toLowerCase();

  // 2. Validate status
  if (!VALID_STATUSES.includes(newStatus)) {
    console.error(`Error: Invalid status "${newStatus}"\n`);
    console.error('Valid statuses:', VALID_STATUSES.join(', '));
    process.exit(1);
  }

  const cwd = process.cwd();
  const specsDir = path.join(cwd, '.specfirst', 'specs');
  const specPath = path.join(specsDir, specName);

  try {
    // 3. Read spec file
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

    // 4. Extract current status for display
    const currentStatusMatch = content.match(/^\*\*Status:\*\*\s+(.+)$/m);
    const currentStatus = currentStatusMatch ? currentStatusMatch[1].trim() : 'unknown';

    // 5. Update status
    const updatedContent = updateStatus(content, newStatus);

    // 6. Write file back
    await fs.writeFile(specPath, updatedContent, 'utf8');

    // 7. Confirmation
    console.log(`✓ Updated status for ${specName}`);
    console.log(`  ${currentStatus} → ${newStatus}`);

    // 8. Status-specific guidance
    console.log('');
    switch (newStatus) {
      case 'draft':
        console.log('Next: Review the spec and iterate on scoring');
        break;
      case 'reviewed':
        console.log('Next: Get approval before implementation');
        break;
      case 'approved':
        console.log('Next: Begin implementation');
        console.log('  Update to "implementing" when work starts');
        break;
      case 'implementing':
        console.log('Implementation in progress');
        console.log('  Update to "complete" when done');
        break;
      case 'complete':
        console.log('✓ Spec implementation complete');
        break;
    }

  } catch (err) {
    console.error('Error updating status:', err.message);
    process.exit(1);
  }
}

module.exports = status;
module.exports.updateStatus = updateStatus;
module.exports.VALID_STATUSES = VALID_STATUSES;
