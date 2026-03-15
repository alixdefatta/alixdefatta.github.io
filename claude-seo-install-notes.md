# Claude SEO Plugin Installation Notes

**Date:** 2026-03-02

## What Was Installed

**Repository:** https://github.com/AgriciDaniel/claude-seo
**Type:** Claude Code Skill (not an MCP server)
**License:** MIT

## What It Does

Comprehensive SEO analysis skill for Claude Code. Covers:
- Full website audits (up to 500 pages, parallel subagent delegation)
- Single-page deep analysis
- Technical SEO (crawlability, indexability, Core Web Vitals, security headers)
- Schema markup detection, validation, and generation (JSON-LD)
- Content quality / E-E-A-T analysis
- Image optimization
- Sitemap analysis and generation
- Hreflang / international SEO
- Programmatic SEO planning
- AI search optimization / GEO (Google Overviews, ChatGPT, Perplexity)
- Competitor comparison page generation

## Installation Method Used

```bash
curl -fsSL https://raw.githubusercontent.com/AgriciDaniel/claude-seo/main/install.sh | bash
```

## Files Installed

| Location | Contents |
|---|---|
| `~/.claude/skills/seo/` | Main skill files |
| `~/.claude/skills/seo/.venv/` | Python virtual environment + dependencies |
| `~/.claude/agents/` | SEO subagent markdown files |
| `~/.claude/skills/seo/schema/` | Schema templates |
| `~/.claude/skills/seo/scripts/` | Shared scripts |
| `~/.claude/skills/seo/hooks/` | Hook scripts |

## Dependencies

- Python 3.14 (detected at install time)
- Python packages from `~/.claude/skills/seo/requirements.txt`
- Playwright + Chromium (for visual/screenshot analysis) → cached at `~/Library/Caches/ms-playwright/`

## Available Commands

| Command | Description |
|---|---|
| `/seo audit <url>` | Full site audit |
| `/seo page <url>` | Deep single-page analysis |
| `/seo technical <url>` | Technical SEO audit |
| `/seo schema <url>` | Schema markup check |
| `/seo content <url>` | Content quality / E-E-A-T |
| `/seo sitemap <url>` | Sitemap analysis |
| `/seo images <url>` | Image optimization audit |
| `/seo hreflang <url>` | International SEO / hreflang |
| `/seo geo <url>` | AI search / GEO optimization |
| `/seo programmatic <url>` | Programmatic SEO analysis |
| `/seo plan <url>` | Strategic SEO planning |
| `/seo competitor-pages <url>` | Competitor comparison pages |

## Notes

- Restart Claude Code after installation for skills to be picked up
- Playwright/Chromium is used for visual analysis; falls back to WebFetch if unavailable

## Uninstall

```bash
curl -fsSL https://github.com/AgriciDaniel/claude-seo/raw/main/uninstall.sh | bash
```
