# Contributor Guide

> Welcome to Candl! This guide outlines how to contribute to the project.

---

## The Golden Rule
**Documentation before code.**
If you have an idea for a feature, do not write a PR with code immediately. First, discuss the idea. Then, document it in the `docs/` folder or update `Candl.md`. Only after the architecture and reasoning are approved should you write the implementation.

## Development Setup (Coming Soon)
*(Instructions for setting up the monorepo, Turborepo, Anchor, and Postgres will be added here once the initial scaffolding is complete.)*

## Coding Standards

### 1. General
- Keep files small (< 200 lines).
- Keep functions small and focused on a single responsibility.
- Use named constants; no magic numbers.
- Avoid deeply nested conditionals. Return early.

### 2. TypeScript
- Use strict typing. Do not use `any`.
- Avoid implicit returns for complex logic.
- Use interfaces for object shapes.

### 3. Rust (Anchor)
- Always use checked math (`checked_add`, `checked_mul`, etc.) for token and SOL balances.
- Keep instructions lean; move complex logic to helper functions inside the `state` modules.
- Ensure all PDAs use the correct seeds and bumps.

## Pull Request Process

1. **Branch Naming**: Use `feat/description`, `fix/description`, or `docs/description`.
2. **Commit Messages**: Write clear, descriptive commit messages.
3. **Tests**: All new features must be accompanied by tests (Anchor tests for on-chain, Vitest for off-chain).
4. **Documentation**: Update the relevant `docs/` files if your PR changes architecture, APIs, or database schemas.
5. **Review**: All PRs require review from a core maintainer before merging.

## Architectural Decisions
If your PR introduces a significant change in how the system works (e.g., adding a new service, changing a core library, altering the economic model), you must add an entry to `docs/15-decisions.md` explaining the context, the decision, and the consequences.
