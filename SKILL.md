---
name: spec
description: Generate a structured spec with confidence scoring before building
---

# /spec — Confidence-Scored Specification Generator

You are generating a structured specification with self-assessed confidence scoring. This spec will guide implementation and flag uncertainty before code is written.

## Pipeline

Follow these steps in order:

### 1. ANALYZE — Read Codebase Context

Before decomposing the task, understand the environment:

- **Project structure**: Use Glob to identify key directories (src/, tests/, config/, etc.)
- **Package manifest**: Read package.json (Node), pyproject.toml (Python), Cargo.toml (Rust), go.mod (Go), or equivalent
- **Existing patterns**: Grep for similar implementations already in the codebase
- **Documentation**: Read README.md and CLAUDE.md (if present) for project conventions
- **Dependencies**: Identify installed libraries and frameworks

Spend 30-60 seconds gathering context. DO NOT skip this step.

### 2. CLARIFY — Ask Questions If Needed

If the task is ambiguous or has multiple valid interpretations, ask 1-3 clarifying questions.

**Skip clarification if:**
- The task is specific and testable (e.g., "Add /health endpoint returning {status: 'ok'}")
- The task references existing code patterns (e.g., "Add a user endpoint like the products endpoint")
- The intent is clear from context

**Ask clarifying questions if:**
- Multiple interpretations exist (e.g., "Add notifications" — push? email? in-app?)
- Key requirements are missing (e.g., "Add auth" — OAuth? JWT? session cookies?)
- Success criteria are unclear (e.g., "Make it faster" — faster how? by how much?)

Format questions as a bulleted list. Wait for answers before proceeding.

### 3. DECOMPOSE — Break Into Implementation Steps

Break the task into ordered implementation steps. For each step:

- **Title**: Short, action-oriented (e.g., "Add database migration for user_notifications table")
- **What**: Detailed description of what will be built/changed
- **Files**: Specific file paths that will be created or modified
- **Dependencies**: External libraries, APIs, services, or previous steps required
- **Risks**: Known failure modes or unknowns

**Rules:**
- Steps are ordered by dependency (if step 3 needs step 2, order matters)
- Each step is independently testable
- No "Step N: Everything else" — decompose fully

### 4. SCORE — Self-Assess Confidence

For EACH step, score on 4 dimensions (0.0 to 1.0 scale):

#### Requirement Clarity (RC)
How well-defined is what needs to be built?

- **1.0**: Specific, testable, unambiguous. "Add /health endpoint returning {status: 'ok'} with HTTP 200."
- **0.7**: Clear with minor ambiguity. "Add health checking to the API."
- **0.5**: General direction known, details need clarification. "Make the API more observable."
- **0.3**: Vague, multiple interpretations. "Improve the API."

#### Implementation Certainty (IC)
How confident are you in the implementation approach?

- **1.0**: Standard pattern seen many times. Adding a REST endpoint with Express.
- **0.7**: Known approach with project-specific unknowns. Endpoint with unfamiliar framework.
- **0.5**: General approach known, implementation details need research. WebSocket subscriptions.
- **0.3**: Uncertain approach, multiple valid paths. Real-time sync — SSE? WebSockets? Polling?

#### Risk Awareness (RA)
How well do you understand what could go wrong?

- **1.0**: All failure modes enumerated and mitigated.
- **0.7**: Most risks known, 1-2 unknowns identified but not mitigated.
- **0.5**: Some risks known, likely unknown unknowns.
- **0.3**: Significant uncertainty about what could go wrong.

#### Dependency Clarity (DC)
How well do you know what this step depends on?

- **1.0**: All files, APIs, libraries, services identified and accessible.
- **0.7**: Most dependencies known, 1-2 need investigation.
- **0.5**: Key dependencies identified but availability/compatibility uncertain.
- **0.3**: Major dependencies unknown or unverified.

#### Composite Score Formula

For each step:
```
composite_score = (RC × 0.25 + IC × 0.25 + RA × 0.25 + DC × 0.25)
```

Default weights are equal (0.25 each). Users can override in `.specfirst/config.yaml`.

#### Scoring Rules (CRITICAL)

1. **DO NOT default to high scores.** Honest uncertainty is more valuable than false confidence.
2. **If you catch yourself scoring everything above 0.8, re-examine.** Real plans have uncertainty.
3. **Score BEFORE you write the step details.** Scoring after leads to rationalization.
4. **The dimensional breakdown is the value.** A 0.8 composite could be [1.0, 1.0, 0.4, 0.8] (risk problem) or [0.8, 0.8, 0.8, 0.8] (mild uncertainty everywhere). These are different problems.

### 5. AUTO-SCOPE CHECK — Lightweight vs Full Spec

After scoring all steps:

**IF** the plan has ≤ 2 steps AND all composite scores ≥ 0.9:
- Output a **lightweight spec**: Context, Steps (with scores), Scoring Summary
- Skip Chain of Verification, skip review gates
- Don't force a 10-section document for fixing a typo

**OTHERWISE**:
- Output a **full spec** (includes Chain of Verification, all sections)

### 6. VERIFY — Chain of Verification

For full specs only. Identify 3 potential failure modes:

1. **{Failure mode 1}** (e.g., "Database migration breaks existing queries")
   - **Verification**: What evidence confirms this won't happen? Or is it an open risk?
   - **Plan impact**: Does the plan need adjustment? Or is the risk accepted?

2. **{Failure mode 2}**
   - **Verification**: ...
   - **Plan impact**: ...

3. **{Failure mode 3}**
   - **Verification**: ...
   - **Plan impact**: ...

If verification reveals missing steps or unmitigated risks, ADD them to the plan.

#### Overall Plan Confidence

Compute using **geometric mean** (not arithmetic):

```
overall_confidence = (step_1_score × step_2_score × ... × step_n_score) ^ (1/n)
```

**Why geometric mean?** It penalizes catastrophic uncertainty.
- Arithmetic mean of [0.9, 0.9, 0.9, 0.2] = 0.73 (looks acceptable)
- Geometric mean of [0.9, 0.9, 0.9, 0.2] = 0.60 (correctly flagged)

One step with 0.2 confidence should drag the entire plan into review.

#### Calibration Heuristic

After computing overall confidence, check for overconfidence:

**IF** all composite scores > 0.85:
- Add calibration warning: "All steps scored high. This may indicate overconfidence. Re-examine the step with the most unknowns."

**IF** no dimension across all steps ever scores below 0.7:
- Add calibration warning: "No dimension scored below 0.7. Consider: are there truly no unclear requirements, unfamiliar implementations, or unknown risks?"

### 7. OUTPUT — Write Spec File

Create `.specfirst/specs/{timestamp}-{slug}.md` where:
- `timestamp` = ISO-8601 format (e.g., `2026-02-15T14-30-00Z`)
- `slug` = kebab-case summary of the task (e.g., `add-health-endpoint`)

Use the Bash tool to create the directory if it doesn't exist:
```bash
mkdir -p .specfirst/specs
```

Then use the Write tool to create the spec file.

## Output Format

### Full Spec Template

```markdown
# Spec: {Feature Name}

**Created:** {ISO-8601 timestamp}
**Task:** {original user request, verbatim}
**Status:** draft
**Overall Confidence:** {geometric mean, 2 decimals} {status_emoji}

---

## Context

{Why this needs to be built. What exists today. What will change.}

## Steps

### Step 1: {Title}

- **What:** {Detailed description}
- **Files:** {Specific file paths, comma-separated}
- **Dependencies:** {Libraries, APIs, services, or "Step N" references}
- **Confidence:** {composite score, 2 decimals} ({status_emoji})
  - Requirement Clarity: {rc}
  - Implementation Certainty: {ic}
  - Risk Awareness: {ra}
  - Dependency Clarity: {dc}
- **Risks:** {Known failure modes or unknowns}
- **Verification:** {How to confirm this step succeeded}

### Step 2: {Title}

{...repeat for all steps...}

---

## Chain of Verification

### 1. {Failure mode}

**Verification:** {Evidence this won't happen, or mark as open risk}
**Plan impact:** {Adjustment made, or "Accepted risk: {reason}"}

### 2. {Failure mode}

**Verification:** ...
**Plan impact:** ...

### 3. {Failure mode}

**Verification:** ...
**Plan impact:** ...

---

## Scoring Summary

| Step | Score | RC   | IC   | RA   | DC   | Status |
|------|-------|------|------|------|------|--------|
| 1    | 0.85  | 0.9  | 0.8  | 0.9  | 0.8  | ⚠️     |
| 2    | 0.92  | 1.0  | 0.9  | 0.9  | 0.9  | ✅     |
| 3    | 0.68  | 0.7  | 0.5  | 0.8  | 0.7  | ⚠️     |

**Overall Confidence:** {geometric mean, 2 decimals} {status_emoji}

**Steps requiring review:** {count of steps with score < 0.8} of {total steps}

**Flagged dimensions:** {Analysis of weakest dimension across all steps. E.g., "Implementation Certainty averages 0.65 — unfamiliar patterns throughout."}

{Calibration warnings, if any}
```

### Lightweight Spec Template

For ≤2 steps with all scores ≥0.9:

```markdown
# Spec: {Feature Name}

**Created:** {ISO-8601}
**Task:** {original request}
**Overall Confidence:** {geometric mean} ✅

---

## Context

{Brief context}

## Steps

### Step 1: {Title}

- **What:** {description}
- **Files:** {paths}
- **Confidence:** {composite} (✅)
  - RC: {rc}, IC: {ic}, RA: {ra}, DC: {dc}

### Step 2: {Title} (if applicable)

{...same format...}

---

## Scoring Summary

| Step | Score | RC | IC | RA | DC | Status |
|------|-------|----|----|----|-----|--------|
| 1    | 0.95  | 1.0| 0.9| 1.0| 0.9 | ✅     |

**Overall:** 0.95 ✅
```

## Status Emojis

Use these in the output:

- **✅ Green (≥0.8)**: Proceed — safe to implement autonomously
- **⚠️ Yellow (0.5-0.79)**: Review — flagged for human review before implementation
- **🛑 Red (<0.5)**: Block — requires human decision before proceeding

## Final Output to User

After writing the spec file, display to the user:

```
✅ Spec written to: .specfirst/specs/{timestamp}-{slug}.md

Overall Confidence: {score} {emoji}
Steps: {total} | Review needed: {count} | Blocked: {count}

{If any steps flagged}:
⚠️ Flagged steps:
  - Step {N}: {title} ({score}) — {weakest dimension}: {value}

{Calibration warnings, if any}

Next: Review the spec, then implement with confidence-aware execution.
```

## Config File Support (Future)

If `.specfirst/config.yaml` exists, read it for:

```yaml
weights:
  requirement_clarity: 0.25
  implementation_certainty: 0.25
  risk_awareness: 0.25
  dependency_clarity: 0.25

thresholds:
  green: 0.8
  yellow: 0.5
```

If the file doesn't exist, use defaults (equal weights, standard thresholds).

---

## Example Invocation

User types:
```
/spec Add a /health endpoint that returns JSON with status and uptime
```

You:
1. Read codebase (find Express app, existing routes, utils)
2. Skip clarification (task is specific)
3. Decompose into 2 steps: add route handler, add uptime tracking
4. Score each step on 4 dimensions
5. Check auto-scope: 2 steps, both >0.9 → lightweight spec
6. Write `.specfirst/specs/2026-02-15T14-30-00Z-add-health-endpoint.md`
7. Display summary

---

**END OF SKILL**
