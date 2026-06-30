# Project Title & Summary

Team Skill Matrix - an interactive web application that tracks team member proficiency across various workstations and skills. Built with vanilla HTML/JS, Cloudflare Pages, and Turso DB.

## Current Objective & Next Steps

- All major features implemented. Monitoring for any further UI/UX tweaks.

## Major Features & Architecture

- Cookie-based JWT Authentication.
- Dynamic CSS Grid for rendering the matrix.
- Cloudflare Pages Worker functions for the API backend.
- Turso (libsql) database.

## Optimizations & Decisions

- Implemented CSRF protection via custom `X-CSRF-Token` headers.
- Rate-limiting enforced in memory for isolate nodes.
- Allowed users to exist without email addresses for pure tracking (dummy emails generated behind the scenes).

## Active Bugs & Blockers

- None currently identified.

## Recent Changelog

- [2026-06-30]: Added Remove Skill functionality to admin panel.
- [2026-06-30]: Updated Add User to capture First Name, Last Name, and Role, with Email being optional.
- [2026-06-30]: Completed Priorities 2, 3, and 4 (Admin Controls, Matrix Usability, Security Hardening).

## Knowledge Base & Reference Links

- Cloudflare deployment requires `npm install` build command to properly bundle dependencies.
