# Clear Take project-local skills

Skills are copied here, not installed globally. See `skills-lock.json` for upstream
revisions, `licenses/` for upstream license texts and `docs/AGENT_TOOLING.md` for
scope, installation, verification and backend limitations.

The REA registration `.claude.json` is a machine-local isolated-profile file and
is intentionally ignored. Regenerate with `bash scripts/setup-rea.sh`. This is
not an Arena MCP connector configuration and is not auto-loaded by this session.

Treat third-party skills as reviewed reference material, not permission to send
telemetry, use paid cloud services, download models, expose secrets or change app
architecture. Hyperframes skill instructions may target a newer CLI than this
app's pinned version; do not silently upgrade production dependencies.
