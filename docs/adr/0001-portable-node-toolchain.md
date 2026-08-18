# ADR 0001: Portable Node toolchain

Status: accepted — 2026-08-14

The host had Git and Python but no Node/npm in `PATH`. The project pins official Windows x64 Node.js `24.18.1` LTS under ignored `.tools/`, keeps the verified archive as a local cache, and versions bootstrap plus `.cmd`/PowerShell wrappers. The archive SHA-256 is fixed to the value published by Node.js.

This avoids an unrequested global installation and lets repository commands run in restricted Windows environments. CI and normal developer machines still use standard Node version setup. `.tools/` stays outside Git, lint and builds because portable binaries are large and platform-specific.
