# @rezzed.ai/specfirst

> Confidence-scored specifications for Claude Code. Plan before you build. Know what you don't know.

[![npm version](https://img.shields.io/npm/v/@rezzed.ai/specfirst.svg)](https://www.npmjs.com/package/@rezzed.ai/specfirst)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

## Why

Most plan-before-build tools enforce a binary gate: spec exists or doesn't. But not all specs are created equal. A 10-step plan where step 7 is "figure out the database schema" isn't much better than no plan at all.

**specfirst adds a gradient.** Every step in your spec carries a 4-dimensional confidence score. Steps below threshold get flagged *before* you write a line of code. You see exactly where the uncertainty lives — unclear requirements, unfamiliar implementation, unknown risks, or missing dependencies.

The result: fewer rewrites, better estimates, and honest uncertainty instead of false confidence.

## Quick Start

### Installation

```bash
npm install -g @rezzed.ai/specfirst
```

Or use without installing:

```bash
npx @rezzed.ai/specfirst init
```

### Setup

1. **Initialize in your project:**

```bash
cd your-project/
specfirst init
```

This creates `.specfirst/` with default configuration.

2. **Add to Claude Code:**

Copy the skill definition to your Claude Code skills directory:

```bash
cp node_modules/@rezzed.ai/specfirst/SKILL.md .claude/skills/spec.md
```

Or if installed via npx:

```bash
mkdir -p .claude/skills && curl -o .claude/skills/spec.md https://raw.githubusercontent.com/rezzedai/specfirst/main/SKILL.md
```

3. **Create specs in Claude Code:**

```
/spec Add a /health endpoint that returns JSON with status and uptime
```

> **Note:** `/spec` is a Claude Code skill, not a CLI command. It runs inside Claude Code sessions. The CLI commands (`init`, `list`, `review`, `status`) manage specs after they're created.

Claude will analyze your codebase, decompose the task, score each step, and write a structured spec to `.specfirst/specs/`.

### Review Your Specs

```bash
specfirst list
specfirst review .specfirst/specs/2026-02-15T14-30-00Z-add-health-endpoint.md
```

## How It Works

**specfirst** follows a 7-step pipeline:

1. **ANALYZE** — Read your codebase to understand structure, patterns, and dependencies
2. **CLARIFY** — Ask questions if the task is ambiguous (or skip if clear)
3. **DECOMPOSE** — Break the task into ordered, testable implementation steps
4. **SCORE** — Rate each step on 4 dimensions (0.0 to 1.0 scale)
5. **AUTO-SCOPE** — Trivial tasks (≤2 steps, all scores ≥0.9) get lightweight specs
6. **VERIFY** — Identify failure modes and adjust the plan (full specs only)
7. **OUTPUT** — Write a structured spec file with scoring summary

## Confidence Scoring

Each step is scored on 4 dimensions:

| Dimension | What It Measures |
|-----------|------------------|
| **Requirement Clarity (RC)** | How well-defined is *what* needs to be built? |
| **Implementation Certainty (IC)** | How confident are you in the *how*? |
| **Risk Awareness (RA)** | How well do you understand what could go wrong? |
| **Dependency Clarity (DC)** | Do you know what this step depends on? |

**Composite score** = weighted average of the 4 dimensions (default: equal weights, 0.25 each).

**Overall plan confidence** = geometric mean of all step scores. This penalizes catastrophic uncertainty — one step with 0.2 confidence drags the whole plan into review, as it should.

### Calibrated Anchors

Scoring prompts include examples to prevent overconfidence:

- **RC 1.0**: "Add /health endpoint returning {status: 'ok'} with HTTP 200." (specific, testable)
- **RC 0.5**: "Make the API more observable." (general direction, details unclear)
- **IC 1.0**: Standard pattern seen many times (e.g., adding a REST endpoint with Express)
- **IC 0.5**: General approach known, implementation details need research (e.g., WebSocket subscriptions)

See [SKILL.md](SKILL.md) for full calibration table.

## Thresholds

Each score maps to an action:

| Score | Status | Meaning |
|-------|--------|---------|
| **≥0.8** | ✅ Green | Proceed — safe to implement autonomously |
| **0.5-0.79** | ⚠️ Yellow | Review — flagged for human review before implementation |
| **<0.5** | 🛑 Red | Block — requires human decision before proceeding |

Thresholds are configurable via `.specfirst/config.yaml`.

## Output Format

A spec file looks like this:

```markdown
# Spec: Add Health Endpoint

**Created:** 2026-02-15T14:30:00Z
**Task:** Add a /health endpoint that returns JSON with status and uptime
**Status:** draft
**Overall Confidence:** 0.92 ✅

---

## Context

The API currently has no health checking. This adds a lightweight endpoint
for monitoring tools to verify the service is running and track uptime.

## Steps

### Step 1: Add route handler

- **What:** Create GET /health endpoint in routes/health.js
- **Files:** src/routes/health.js, src/app.js
- **Dependencies:** Express (already installed)
- **Confidence:** 0.95 (✅)
  - Requirement Clarity: 1.0
  - Implementation Certainty: 0.9
  - Risk Awareness: 1.0
  - Dependency Clarity: 0.9
- **Risks:** None — standard Express route pattern
- **Verification:** curl localhost:3000/health returns 200 with JSON

### Step 2: Add uptime tracking

- **What:** Track process start time, calculate uptime in seconds
- **Files:** src/utils/uptime.js, src/routes/health.js
- **Dependencies:** Node.js process.uptime() (built-in)
- **Confidence:** 0.90 (✅)
  - Requirement Clarity: 0.9
  - Implementation Certainty: 0.9
  - Risk Awareness: 0.9
  - Dependency Clarity: 0.9
- **Risks:** Uptime resets on process restart (expected behavior)
- **Verification:** Verify uptime increments on subsequent requests

---

## Scoring Summary

| Step | Score | RC   | IC   | RA   | DC   | Status |
|------|-------|------|------|------|------|--------|
| 1    | 0.95  | 1.0  | 0.9  | 1.0  | 0.9  | ✅     |
| 2    | 0.90  | 0.9  | 0.9  | 0.9  | 0.9  | ✅     |

**Overall Confidence:** 0.92 ✅

**Steps requiring review:** 0 of 2
**Flagged dimensions:** None
```

For trivial tasks (≤2 steps, all scores ≥0.9), you get a lightweight version without the Chain of Verification section.

## CLI Reference

### `specfirst init`

Initialize specfirst in the current project.

```bash
specfirst init
```

Creates `.specfirst/` directory with default `config.yaml`.

### `specfirst list`

List all specs in the project.

```bash
specfirst list

# Output:
# .specfirst/specs/
#   2026-02-15T14-30-00Z-add-health-endpoint.md (0.92 ✅)
#   2026-02-14T09-15-00Z-database-migration.md (0.65 ⚠️)
```

### `specfirst review <file>`

Display a formatted summary of a spec.

```bash
specfirst review .specfirst/specs/2026-02-15T14-30-00Z-add-health-endpoint.md
```

Outputs: task, overall confidence, step count, flagged steps, and next actions.

### `specfirst status <file> <status>`

Update a spec's status.

```bash
specfirst status .specfirst/specs/2026-02-15T14-30-00Z-add-health-endpoint.md implementing
```

Valid statuses: `draft`, `reviewed`, `approved`, `implementing`, `complete`

## Configuration

Edit `.specfirst/config.yaml` to customize:

```yaml
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
  max_steps_for_lightweight: 2
  min_score_for_lightweight: 0.9

# Output
output:
  directory: ".specfirst/specs"
  format: "markdown"
```

**Examples:**

- Raise the bar: `thresholds.proceed: 0.9` (only super-confident plans go green)
- Weight risk higher: `weights.risk_awareness: 0.4` (reduce others to sum to 1.0)
- Disable auto-scoping: `auto_scope.enabled: false` (always generate full specs)

## Comparison

**vs. [superpowers](https://github.com/shaman-ai/superpowers)**

| Feature | superpowers | specfirst |
|---------|-------------|-----------|
| **Focus** | Methodology + templates | Measurement + confidence |
| **Size** | 22K tokens (skill definition) | ~2K tokens |
| **Enforcement** | Binary (spec exists or doesn't) | Graduated (green/yellow/red) |
| **Scoring** | None | 4-dimensional per step |
| **Auto-scope** | No | Yes (trivial tasks get lightweight specs) |
| **Dependencies** | Multiple npm packages | Zero (Node built-ins only) |
| **Philosophy** | "Follow this process" | "Measure your certainty" |

Both are valuable. **superpowers** is a comprehensive framework for AI-assisted development. **specfirst** is a focused tool for confidence-aware planning. Use them together if you want both process and measurement.

## Why Geometric Mean?

The overall plan confidence uses geometric mean, not arithmetic mean. Here's why:

**Arithmetic mean** treats all steps equally:
- Plan: [0.9, 0.9, 0.9, 0.2] → arithmetic mean = 0.73 (looks okay)

**Geometric mean** penalizes catastrophic uncertainty:
- Plan: [0.9, 0.9, 0.9, 0.2] → geometric mean = 0.60 (correctly flagged)

One step with 0.2 confidence *should* drag the entire plan into review. That's the step where the plan will blow up. Geometric mean surfaces that signal.

## Contributing

Contributions welcome! This is an open-source project by [Rezzed AI](https://rezzed.ai).

**To contribute:**

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes (add tests if applicable)
4. Run tests: `npm test` (when test suite exists)
5. Commit with clear messages
6. Open a PR with a description of what changed and why

**Ideas for contributions:**

- Additional output formats (JSON, YAML)
- IDE integrations (VS Code extension)
- Spec diff tool (compare two versions of a spec)
- Calibration dataset (real specs with outcomes for scoring calibration)
- Language-specific analyzers (better context extraction for Python, Go, Rust, etc.)

See [GitHub Issues](https://github.com/rezzedai/specfirst/issues) for open tasks.

## What's Next?

More tools coming from the @rezzed.ai toolkit. See [rezzed.ai](https://rezzed.ai) for updates.

## License

MIT License. See [LICENSE](LICENSE) for details.

---

Built by [Rezzed.ai](https://rezzed.ai)
