# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-02-20

### Added
- Initial release
- 7-step planning pipeline: ANALYZE → CLARIFY → DECOMPOSE → SCORE → AUTO-SCOPE → VERIFY → OUTPUT
- 4-dimensional confidence scoring per step: Requirement Clarity, Implementation Certainty, Risk Awareness, Dependency Clarity
- Graduated thresholds: green (≥0.8), yellow (0.5-0.79), red (<0.5)
- Auto-scope mode for trivial tasks (≤2 steps, all scores ≥0.9)
- Geometric mean for overall plan confidence (penalizes catastrophic uncertainty)
- CLI commands: init, list, review, status
- Claude Code skill definition (SKILL.md) with calibrated scoring anchors
- Configuration via `.specfirst/config.yaml`
- Zero runtime dependencies
- Comprehensive test suite and CI workflow
- Arsenal pre-commit hook for public repo safety
- MIT LICENSE

### Changed
- Added Grid-as-a-Service CTA to README

### Fixed
- Footer consistency for arsenal validation

[0.1.0]: https://github.com/rezzedai/specfirst/releases/tag/v0.1.0
