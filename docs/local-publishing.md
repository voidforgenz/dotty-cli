# Local Publishing with Verdaccio

Test package publishing locally before publishing to npm.

## Prerequisites

- pnpm installed
- All packages built (`pnpm build`)

## Quick Start

```bash
# Terminal 1: Start local registry
npx nx local-registry

# Terminal 2: Publish packages
pnpm nx release publish --registry=http://localhost:4873
```

## Full Workflow

### 1. Start Verdaccio

```bash
npx nx local-registry
```

Verdaccio runs on http://localhost:4873. The web UI is available at the same URL.

### 2. Build Packages

```bash
pnpm build
```

### 3. Publish to Local Registry

```bash
pnpm nx release publish --registry=http://localhost:4873
```

This publishes all 5 packages:
- `@dottyfiles/core`
- `@dottyfiles/chezmoi`
- `@dottyfiles/homebrew`
- `@dottyfiles/mas`
- `@dottyfiles/cli`

### 4. Test Installation

```bash
# Create test directory
mkdir /tmp/dotty-test && cd /tmp/dotty-test
npm init -y

# Point to local registry for @dotty scope
echo "@dotty:registry=http://localhost:4873" > .npmrc

# Install packages
npm install @dottyfiles/cli

# Verify
npx dotty --version
```

### 5. Cleanup

```bash
# Remove test directory
rm -rf /tmp/dotty-test

# Stop Verdaccio (Ctrl+C)

# Clear local registry storage (optional)
rm -rf tmp/local-registry
```

## Configuration

Verdaccio is configured at `.verdaccio/config.yml`:

- **Storage**: `tmp/local-registry/storage`
- **Port**: 4873
- **Upstream**: proxies to npmjs.org for non-local packages
- **Access**: full access for local development

## Troubleshooting

### Port 4873 already in use

```bash
lsof -i :4873
kill -9 <PID>
```

### workspace:* protocol in published packages

The `workspace:*` protocol is automatically replaced with actual versions during `nx release publish`.

### Packages not updating

Clear the Verdaccio storage:

```bash
rm -rf tmp/local-registry/storage
```
