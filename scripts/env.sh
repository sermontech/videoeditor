# Source from bash: source scripts/env.sh
EDITOR_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$EDITOR_ROOT/.tools/bin:$EDITOR_ROOT/.tools/python/bin:$EDITOR_ROOT/node_modules/.bin:$PATH"
export PYTHONPATH="$EDITOR_ROOT/.tools/python${PYTHONPATH:+:$PYTHONPATH}"
export LD_LIBRARY_PATH="$EDITOR_ROOT/.tools/chrome-libs/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export HYPERFRAMES_BROWSER_PATH="$(cd "$EDITOR_ROOT" && node --input-type=module -e 'import chromium from "@sparticuz/chromium"; console.log(await chromium.executablePath())')"
