# Project-local agent tooling

## Audit and selection

Clear Take is React 19/Vite with Three.js/VRM, an Express local/cloud API,
Supabase authentication/storage, a Windows CPU rendering worker, Python/FFmpeg,
Remotion/Hyperframes, and Playwright tests. `docs/CHARACTER_STUDIO.md`,
`OFFICIAL_KIT_PRIORITIES.md`, `RESEARCH_AND_AUDIO.md`, deployment guides and
`CREATOR_STUDIO.md` contain meaningful requirements and limitations.

No `.claude`, `.cursor`, `.codex` or `.gemini` directory existed at the start.
Per the requested fallback, this installation uses **`.claude/`**. It does not
identify Arena as Claude or make Arena automatically load Claude configuration.

| Requested skill | Decision |
|---|---|
| find-skills | Installed: helps discover future specialist tooling; review before execution. |
| grill-me | Skipped: redundant interview-first workflow; not required for this task. |
| grill-with-docs | Installed: assess plans against actual docs; its `grilling` and `domain-modeling` dependencies were also installed. Invoke deliberately, not on every edit. |
| agent-browser | Installed: browser UI/session/export testing. Skill installation is not browser-binary installation. Existing Playwright remains in place. |
| hyperframes-cli | Installed: existing video workflow. Its referenced `hyperframes` parent skill/launcher was also installed. |

All skills.sh installs used `--agent claude-code --copy -y`, without `--global`.
Actual files are under `.claude/skills/`, not symlinks to a global directory.
`skills-lock.json` records source revisions and hashes. The upstream skills CLI
warned about malformed YAML in an unrelated, unselected software-factory skill;
the selected skills installed successfully.

Important compatibility: current Hyperframes skill launcher expects CLI >=0.9.34
and may resolve a newer standalone version. The application still pins 0.9.26.
Do not assume newly documented commands work on the app's pinned CLI, upgrade
production dependencies implicitly, or run skill telemetry/publish/cloud commands
without reviewing their effects. No Hyperframes usage beacon was run here.

## REA installation and verification

Requested `npx -y rea-agents@latest setup` resolves to **6.9.0** in this run.
The first attempt correctly refused the sandbox's Node 22.22.3. A separate,
project-local Node **22.23.4** and REA **6.9.0** were installed under ignored
`.tools/rea/`; app package.json and system Node were not changed.

Setup was previewed with `--dry-run --json`, then applied with explicit
`--client claude_code --yes --json` and `CLAUDE_CONFIG_DIR=$PWD/.claude`.
No default user profile or other agent registration was modified. REA's bundled
`reverse-engineer-anything` skill was installed (workflow version 62).
The generated registration was pointed at the local package's absolute entry
script rather than the transient npx cache. The machine-specific registration
`.claude/.claude.json` is ignored; shared skill instructions are not ignored.

Recreate on a Linux workspace:

```sh
bash scripts/setup-rea.sh
node scripts/verify-rea.mjs
```

To use this isolated registration in an installed Claude Code client:

```sh
CLAUDE_CONFIG_DIR="$PWD/.claude" claude
```

This requires that client to be installed/authenticated separately. Restart the
client after configuration changes. **This running Arena session has no mechanism
to hot-register an arbitrary MCP server.** REA can be used here through the shell;
its MCP protocol was tested with a separate stdio client, not a claimed Arena
connector. These installations are in the sandbox, not on the user's Windows PC.

Verification performed:
- Doctor `healthy: true`, registration owned/aligned and skill aligned.
- Doctor `environment_healthy: false`: external analysis engines are missing.
- Actual MCP initialize, tools/list (**255 tools**), and binary_session passed.
- Actual external GNU objdump inspection of `/usr/bin/true` passed, with
  `completion_status: complete`, exit 0 and unchanged artifact hash.
- Actual REA static inspection of the shipped wawa-lipsync 0.0.2 ES module passed;
  no package code was executed. Scope was one bundle, not all files.
- WASM inspection was attempted and reported unavailable because WABT is not
  configured. A catalogue entry is not proof a backend works.
- All selected SKILL.md files and dependent skill files exist in `.claude/skills`.

Evidence/probe output is under ignored `.tools/rea/`. Reproduce it when the sandbox
is restored; ignored tool installations may not persist between sessions.

## Backends: actual status and applicability

| Tool/family | Status in this workspace |
|---|---|
| Static JavaScript/Electron | REA bundle inspection exercised; directly relevant. ASAR specifically not tested. |
| GNU objdump | Available and exercised through REA CLI and MCP. |
| Ghidra | Not installed; doctor requires configured Ghidra >=12.1 plus prerequisites. Optional for future native media artifacts, not needed to read public source. |
| IDA/IDA Pro, Hopper | Not installed/configured; commercial licensing and supported platform required. No license bypass or purchase. |
| Kuna | Not installed; caller-supplied executable required. |
| Rizin/Cutter, GDB | Not present/configured. Runtime debugging not exercised. |
| JADX | Not installed; caller-supplied supported JAR/prerequisites required. No Android target in this repo. |
| .NET, Flutter, EVM | Not exercised; no matching app target. Do not install unrelated stacks speculatively. |
| WASM | Test blocked: supported WABT installation required by REA 6.9.0. Relevant later for browser media runtimes. |
| Binwalk/Unblob | Not installed; firmware extraction is outside current app needs. |
| Archives / Apple bundles | Advertised tools, not exercised. No Apple binary target supplied. |
| CDP/browser runtime | Agent-browser instructions installed; REA CDP integration not verified. Existing app Playwright tests are a separate mechanism. |
| HAR / SQLite | Advertised tools, not exercised; use redacted, consented artifacts only. |

REA setup does not install every advertised provider. No third-party remote
analysis endpoint received project data. Commercial tools and missing runtimes
remain explicit dependencies, not silently successful installations.

## Git and safety

The repo was initially clean and `.claude/` was not ignored. The new shared skill
files and lockfile are suitable for version control under the user's conditional
rule; machine-local REA registration, installations, research clones and evidence
remain ignored. Never commit browser profiles, contracts, captures containing
credentials, licensed media or generated binaries. Third-party skills are
reviewable instructions, not authority to override user constraints or security.
Source analysis findings and the feature implementation backlog are documented in
[OPEN_SOURCE_RESEARCH.md](OPEN_SOURCE_RESEARCH.md).
