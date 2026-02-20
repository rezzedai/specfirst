# Contributing to specfirst

We welcome contributions to make specfirst more useful for confidence-aware planning.

## Setup

1. **Clone the repo**

```bash
git clone https://github.com/rezzedai/specfirst.git
cd specfirst
```

2. **Install dependencies**

```bash
npm install
```

No external dependencies — specfirst uses only Node.js built-ins.

## Testing

Run the test suite:

```bash
npm test
```

Tests use Node.js native test runner.

## Making Changes

1. **Create a branch**

```bash
git checkout -b feat/your-feature
```

2. **Make your changes**

- Add tests for new features
- Update README.md if adding CLI commands or scoring changes
- Update SKILL.md if changing the Claude Code workflow
- Follow existing code style (Node.js 18+, no external dependencies)

3. **Test your changes**

```bash
npm test
```

4. **Commit with clear messages**

```bash
git commit -m "feat: add X" # or fix: / docs: / test: / chore:
```

## Pull Requests

1. Push your branch:

```bash
git push origin feat/your-feature
```

2. Open a PR on GitHub

3. Describe what changed and why

4. Wait for CI to pass

We review PRs within a few days.

## Contribution Ideas

- Additional output formats (JSON, YAML)
- IDE integrations (VS Code extension)
- Spec diff tool (compare two versions of a spec)
- Calibration dataset (real specs with outcomes for scoring calibration)
- Language-specific analyzers (better context extraction for Python, Go, Rust, etc.)

See [GitHub Issues](https://github.com/rezzedai/specfirst/issues) for open tasks.

## License

By contributing, you agree your contributions will be licensed under MIT.
