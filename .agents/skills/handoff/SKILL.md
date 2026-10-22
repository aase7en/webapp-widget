---
name: handoff
description: Transfer unfinished webapp-widget work safely to a fresh agent/session using a compact durable checkpoint.
argument-hint: "Which task will the next session resume?"
disable-model-invocation: true
---
# Project handoff — adaptation of Matt Pocock's /handoff

Original reference: https://github.com/mattpocock/skills/blob/main/skills/productivity/handoff/SKILL.md
Approach: https://www.aihero.dev/skills-handoff

1. Capture current goal, exact repo/worktree/branch/HEAD, facts vs unverified assumptions, scope/owner, work in flight, blockers and **one next safe action**.
2. Refer to existing ADR/spec/PR/CI/files by paths or links; do not duplicate large documents or copy secrets, tokens, keys, PHI, PII or raw hospital data.
3. Draft the handoff in OS temporary directory. Inspect and redact it.
4. Before persisting, verify current `AGENTS.md`, Git state, canonical handoff path and ownership. This repository's durable destination is the **one** tracked root `SESSION-HANDOFF.md`; copy the reviewed handoff there only on a safe, separately owned worktree. Do not overwrite another agent's dirty `SESSION-HANDOFF.md`.
5. Re-read and check diff; commit or make reviewable PR. Refresh changed state at session/model transfers. Mark obsolete status explicitly rather than silently treating stale text as truth.
6. List suggested skills for the next agent. The next agent must verify actual source/runtime; a handoff is context, not operational authority.

Use this skill when switching sessions/harnesses or sending work to another agent, not as an excuse to create a second task database.
