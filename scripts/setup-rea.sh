#!/usr/bin/env bash
# Linux workspace setup, not an installer for the user's Windows machine.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .tools/rea .claude
npm install --prefix .tools/rea --no-save node@22.23.4 rea-agents@6.9.0
export PATH="$PWD/.tools/rea/node_modules/.bin:$PATH"
export CLAUDE_CONFIG_DIR="$PWD/.claude"
# Direct pinned entry avoids an ephemeral npx-cache path in the registration.
node "$PWD/.tools/rea/node_modules/rea-agents/scripts/rea.mjs" setup --client claude_code --yes --json
node "$PWD/.tools/rea/node_modules/rea-agents/scripts/rea.mjs" doctor --client claude_code --skill --json
