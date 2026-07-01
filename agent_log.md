# Project Title & Summary

Team Skill Matrix - an interactive web application that tracks team member proficiency across various workstations and skills. Built with vanilla HTML/JS, Cloudflare Pages, and Turso DB.

## Current Objective & Next Steps

- All major features implemented. Monitoring for any further UI/UX tweaks.

## Major Features & Architecture

- Cookie-based JWT Authentication.
- Dynamic CSS Grid for rendering the matrix.
- Cloudflare Pages Worker functions for the API backend.
- Turso (libsql) database.
- Dark/Light mode toggle with localStorage persistence.

## Optimizations & Decisions

- Implemented CSRF protection via custom X-CSRF-Token headers.
- Rate-limiting enforced in memory for isolate nodes.
- JWT cookie parsing uses regex match(/session=([^;]+)/) to avoid base64 = truncation bug.
- Dark mode is VS Code-inspired flat surfaces (#1e1e1e, #252526, #3e3e42 borders, #0078d4 accent). No glow orbs in dark mode.
- Light mode uses off-white #f0f2f8 with backdrop blur on glass panels.

## Active Bugs & Blockers

- None currently identified.

## Recent Changelog

- [2026-07-01]: VS Code-style dark mode theme applied.
- [2026-07-01]: Light/Dark mode toggle added with localStorage persistence.
- [2026-07-01]: Heatmap hover bleed fixed.
- [2026-07-01]: Fixed Manage Roles missing X-CSRF-Token header.
- [2026-07-01]: Fixed JWT token parsing across all admin API routes.
- [2026-06-30]: Added Remove Skill, Add User improvements, Security Hardening.

## Knowledge Base & Reference Links

- Cloudflare deployment requires npm install build command.
- CSS custom properties on [data-theme] attribute on html element drive the entire colour system.

