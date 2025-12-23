# 1.0.0 (2025-12-23)

### 🚀 Features

- ⚠️  add Dottyfile-based configuration system ([a9ee054](https://github.com/voidforgenz/dotty-cli/commit/a9ee054))
- add comprehensive test coverage and improve build scripts ([5ef4808](https://github.com/voidforgenz/dotty-cli/commit/5ef4808))
- **changelog:** configure author usernames and commit references ([bda4f2e](https://github.com/voidforgenz/dotty-cli/commit/bda4f2e))
- **config:** add enhanced profile system with inheritance and auto-detection ([e55a356](https://github.com/voidforgenz/dotty-cli/commit/e55a356))
- **config:** add automatic deduplication for Dottyfile apps ([308e303](https://github.com/voidforgenz/dotty-cli/commit/308e303))
- **core:** add pre/post hooks for apply and push commands ([4abab35](https://github.com/voidforgenz/dotty-cli/commit/4abab35))
- **git:** add git hooks, commitlint for conventional-changelog ([a6f547b](https://github.com/voidforgenz/dotty-cli/commit/a6f547b))
- **macos:** add macOS system settings management ([c006159](https://github.com/voidforgenz/dotty-cli/commit/c006159))
- **release:** add CI/CD release workflow and prepare for alpha ([c08a118](https://github.com/voidforgenz/dotty-cli/commit/c08a118))
- **runtime:** add migration system for Dottyfile schema upgrades ([09053d6](https://github.com/voidforgenz/dotty-cli/commit/09053d6))

### 🩹 Fixes

- resolve lint warnings and nx release config ([0d83455](https://github.com/voidforgenz/dotty-cli/commit/0d83455))
- **ci:** dispatch CI for release branch to satisfy branch protection ([1202278](https://github.com/voidforgenz/dotty-cli/commit/1202278))
- **mas:** handle leading whitespace in mas list output ([977e3d0](https://github.com/voidforgenz/dotty-cli/commit/977e3d0))
- **release:** add fallbackCurrentVersionResolver for first release ([49125b3](https://github.com/voidforgenz/dotty-cli/commit/49125b3))
- **release:** handle first release in changelog generation ([d4095ef](https://github.com/voidforgenz/dotty-cli/commit/d4095ef))
- **release:** remove non-existent release label from PR creation ([88280a3](https://github.com/voidforgenz/dotty-cli/commit/88280a3))
- **release:** support PAT_TOKEN for PR creation ([be200ff](https://github.com/voidforgenz/dotty-cli/commit/be200ff))
- **release:** force changelog regeneration ([43019ca](https://github.com/voidforgenz/dotty-cli/commit/43019ca))

### ⚠️  Breaking Changes

- add Dottyfile-based configuration system  ([a9ee054](https://github.com/voidforgenz/dotty-cli/commit/a9ee054))
  sync command removed, use apply/pull/push instead

### ❤️ Thank You

- Drian Naude