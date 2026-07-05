# Contributing to Lobby

First off, thank you for considering contributing to Lobby! Every contribution — bug report, feature idea, or pull request — makes this project better for the community.

This guide walks you through everything you need to go from "I want to help" to a merged pull request.

---

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Before You Start](#-before-you-start)
- [Local Development Setup](#-local-development-setup)
- [Branching & Workflow](#-branching--workflow)
- [Commit Conventions](#-commit-conventions)
- [Submitting a Pull Request](#-submitting-a-pull-request)
- [Code Quality Standards](#-code-quality-standards)
- [Reporting Bugs](#-reporting-bugs)
- [Requesting Features](#-requesting-features)
- [Need Help?](#-need-help)

---

## 📜 Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold a welcoming, inclusive, and respectful environment for everyone.

---

## 🧭 Before You Start

Not all contributions require code. Here's how you can help:

- **Report a bug** — Found something broken? [Open a bug report](https://github.com/josephsystems/lobby/issues/new?template=bug_report.md).
- **Suggest a feature** — Have an idea? [Open a feature request](https://github.com/josephsystems/lobby/issues/new?template=feature_request.md).
- **Improve documentation** — Typo fixes, clearer explanations, and new examples are always welcome.
- **Write code** — Bug fixes, new features, and performance improvements.

### ⚠️ Avoid Duplicate Work: Open an Issue First

To prevent multiple people from working on the same thing simultaneously:

1. **Search existing issues & PRs** to see if your issue or feature has already been reported or is being worked on.
2. **Open an issue or find the existing one** describing the bug or feature.
3. **Leave a comment** on the issue asking to work on it (e.g., "I'd like to work on this!").
4. **Wait for a maintainer to assign the issue to you** before you start writing code.

_Note: Minor typo fixes, documentation improvements, or trivial single-line fixes can be submitted directly as PRs without an issue._

---

## 🛠 Local Development Setup

### Prerequisites

| Tool           | Version           | Install                                                                |
| :------------- | :---------------- | :--------------------------------------------------------------------- |
| **Node.js**    | ≥ 22.0.0          | [nodejs.org](https://nodejs.org)                                       |
| **pnpm**       | ≥ 10.33.4         | `npm install -g pnpm`                                                  |
| **PostgreSQL** | Latest            | Via Docker or [native install](https://www.postgresql.org/download/)   |
| **Redis**      | Latest (optional) | Via Docker or [native install](https://redis.io/docs/getting-started/) |

> [!TIP]
> **Docker is the fastest way** to get PostgreSQL and Redis running locally. Full Docker Compose support for the entire dev environment is coming soon.

### Quick Setup with Docker (Recommended for Dependencies)

Spin up PostgreSQL and Redis in seconds:

```bash
# Start a local PostgreSQL instance
docker run -d --name lobby-postgres \
  -e POSTGRES_USER=lobby \
  -e POSTGRES_PASSWORD=lobby \
  -e POSTGRES_DB=lobby \
  -p 5432:5432 \
  postgres:latest

# Start a local Redis instance (only needed if email is enabled)
docker run -d --name lobby-redis \
  -p 6379:6379 \
  redis:latest
```

### Step-by-Step

1. **Clone the repository:**

   ```bash
   git clone https://github.com/josephsystems/lobby.git && cd lobby
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Run the interactive setup wizard:**

   ```bash
   pnpm run setup
   ```

   This generates `lobby.config.json` (your waitlist schema) and a SQL migration file.

4. **Configure environment variables:**

   ```bash
   cp .env.example .env
   ```

   Update `.env` with your local database credentials. If you used the Docker commands above:

   ```env
   DATABASE_URL=postgresql://lobby:lobby@localhost:5432/lobby
   ```

5. **Run migrations:**

   ```bash
   pnpm run migration:run
   ```

6. **Start the dev server:**

   ```bash
   pnpm run start:dev
   ```

   The API is now running at `http://localhost:3000/api/v1`. You're ready to contribute!

---

## 🌿 Branching & Workflow

Lobby uses `staging` as the active development branch. All contributions should branch from and target `staging`.

### Branch Naming Convention

Use descriptive, prefixed branch names:

| Prefix      | Use Case                | Example                              |
| :---------- | :---------------------- | :----------------------------------- |
| `feat/`     | New feature             | `feat/referral-tracking`             |
| `fix/`      | Bug fix                 | `fix/duplicate-email-race-condition` |
| `docs/`     | Documentation           | `docs/api-examples`                  |
| `refactor/` | Code restructuring      | `refactor/config-loader`             |
| `chore/`    | Maintenance / tooling   | `chore/update-dependencies`          |
| `perf/`     | Performance improvement | `perf/query-optimization`            |
| `test/`     | Adding or fixing tests  | `test/waitlist-service`              |
| `ci/`       | CI/CD changes           | `ci/add-coverage-report`             |

### Workflow

```
1. Clone the repo
2. Create your branch from staging:  git checkout -b feat/your-feature staging
3. Make your changes
4. Push to your branch:                git push origin feat/your-feature
5. Open a PR targeting staging
```

---

## 💬 Commit Conventions

Lobby enforces [Conventional Commits](https://www.conventionalcommits.org/) via Husky + Commitlint. Your commits will be automatically validated on every commit.

### Format

```
<type>: <subject>
```

- **Subject** must be ≤ 100 characters.
- Use the **imperative mood** ("add feature" not "added feature").
- Do not end the subject with a period.

### Allowed Types

| Type       | When to Use                                             |
| :--------- | :------------------------------------------------------ |
| `feat`     | A new feature                                           |
| `fix`      | A bug fix                                               |
| `docs`     | Documentation only changes                              |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                                 |
| `test`     | Adding or correcting tests                              |
| `chore`    | Maintenance tasks (deps, configs, tooling)              |
| `ci`       | CI/CD pipeline changes                                  |

### Examples

```bash
# ✅ Good
git commit -m "feat: add referral link generation endpoint"
git commit -m "fix: prevent duplicate email race condition on concurrent signups"
git commit -m "docs: clarify Redis setup instructions in README"

# ❌ Bad
git commit -m "updated stuff"
git commit -m "Fix: Added the thing."
git commit -m "feat: add the new endpoint for referral link generation that tracks invites and counts them"  # Too long
```

> [!NOTE]
> Don't worry about getting it perfect — Commitlint will tell you exactly what's wrong if your commit message doesn't pass validation.

---

## 🚀 Submitting a Pull Request

### Before You Submit

Run the full quality check locally to avoid CI surprises:

```bash
pnpm typecheck   # TypeScript type checking
pnpm lint         # ESLint
pnpm build        # Ensure the project builds cleanly
```

### PR Checklist

Your PR should:

- [ ] Target the **`staging`** branch
- [ ] Have a clear, descriptive title (following commit conventions)
- [ ] Include a summary of what changed and why
- [ ] Pass all CI checks (typecheck, lint, build)
- [ ] Not include unrelated changes — keep PRs focused

### Review Process

- All PRs require **approval from a maintainer** before merging.
- The maintainer may request changes — this is collaborative, not adversarial.
- Once approved and CI passes, the maintainer will merge your PR.

> [!TIP]
> Smaller, focused PRs get reviewed faster than large, sweeping changes. When in doubt, split it up.

---

## ✅ Code Quality Standards

Lobby has automated quality gates that run on every commit and in CI. These are non-negotiable for all contributions.

### Automated Checks

| Tool             | What It Does                      | Runs When                    |
| :--------------- | :-------------------------------- | :--------------------------- |
| **Prettier**     | Formats code consistently         | Pre-commit (auto-fixes)      |
| **ESLint**       | Catches bugs and enforces rules   | Pre-commit (auto-fixes) + CI |
| **Commitlint**   | Validates commit message format   | Commit-msg hook              |
| **TypeScript**   | Static type checking (`--noEmit`) | CI                           |
| **NestJS Build** | Ensures successful compilation    | CI                           |

### Key Rules

- **No `console.log`** — Use the NestJS `Logger` service instead.
- **Explicit return types** — Exported functions must have explicit return types (enforced via `@typescript-eslint/explicit-module-boundary-types`).
- **No unused variables** — Prefix intentionally unused parameters with `_` (e.g., `_req`).

### Style

- **Semicolons**: Yes
- **Quotes**: Single quotes
- **Trailing commas**: ES5
- **Print width**: 80 characters
- **Indentation**: 2 spaces

> [!NOTE]
> Prettier runs automatically on pre-commit via `lint-staged`, so you don't need to think about formatting — just write code and commit.

---

## 🐛 Reporting Bugs

Found something broken? [Open a bug report](https://github.com/josephsystems/lobby/issues/new?template=bug_report.md) with:

1. **What you expected** to happen
2. **What actually happened**
3. **Steps to reproduce** the issue
4. Your **environment** (OS, Node version, pnpm version)

The more detail you provide, the faster we can fix it.

---

## 💡 Requesting Features

Have an idea? [Open a feature request](https://github.com/josephsystems/lobby/issues/new?template=feature_request.md) and describe:

1. **The problem** you're trying to solve
2. **Your proposed solution**
3. **Alternatives** you've considered

Check the [Roadmap](README.md#-roadmap) first — your idea might already be planned.

---

## 🆘 Need Help?

- **Stuck on setup?** Open an issue tagged `question`.
- **Not sure where to start?** Look for issues labeled [`good first issue`](https://github.com/josephsystems/lobby/issues?q=label%3A%22good+first+issue%22).
- **Want to discuss an approach?** Open an issue before writing code — we're happy to help you find the right path.

---

Thank you for helping make Lobby better! 🚀
