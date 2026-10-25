# AI City design/tool review — 2026-10-25

Request: 사용자 요청: 디자인 MD·MCP 5종을 AI 시티 개선 작업에 검토·적용
Existing board ID: -P4lPJv3cnw8sQSjjD5t

The screenshot's INSTALLED / QUEUED labels were not treated as evidence about this environment. No MCP connection, account, secret or editor configuration was changed in this work.

## Official sources and decisions

| Item | Publisher source / license observed | Supported purpose and requirements | Decision in this task |
| --- | --- | --- | --- |
| awesome-design-md | [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md), MIT | A collection and workflow for textual DESIGN.md directions; not an executable MCP. Some linked brand documents are separately hosted and were not downloaded or copied. | Applied the documentation method to the original root DESIGN.md: hierarchy, type, spacing, source integrity, map accessibility and visual checks. The image alone cannot establish which similarly named fork it showed; this publisher repository is the reviewed reference. |
| Figma-Context-MCP | [GLips/Figma-Context-MCP](https://github.com/GLips/Figma-Context-MCP), MIT; package figma-developer-mcp | Framelink supplies simplified Figma metadata to coding agents. Its repository requires a Figma API token and its package declares Node >=20.20.0. It is distinct from Figma's own MCP. | Not installed or connected. No Figma file/token was supplied and no matching callable tool was available. The implementation uses the existing React code and an explicit design guideline. |
| firecrawl-mcp | [firecrawl/firecrawl-mcp-server](https://github.com/firecrawl/firecrawl-mcp-server), MIT | Official search/scrape/parse and broader crawl operations. The reviewed README describes a rate-limited keyless hosted subset and authenticated broader features. | Not installed or connected. Official GitHub metadata/READMEs and the available web reader supplied this bounded source review. This is a substitute research route, not a Firecrawl invocation. |
| chrome-devtools-mcp | [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp), Apache-2.0 | Live Chrome inspection, screenshots, console/network and performance traces. Requires Node LTS and supported Chrome; Chromium is not guaranteed by that MCP. | Not installed or connected. Existing Playwright Chromium and direct CDP touch checks are used for real UI regression evidence. They do not constitute a Chrome DevTools MCP installation or a performance trace. |
| magic-mcp | [21st-dev/magic-mcp](https://github.com/21st-dev/magic-mcp), ISC for the repository package | The publisher now describes Magic as a compatibility proxy for 21st MCP, installed through the 21st CLI; authenticated setup needs a current 21st key. The README says old Magic keys no longer work. | Not installed or connected. No authenticated 21st tool was available. UI composition was implemented directly in the existing React app; no generated component or service license is assumed. |

Licenses above describe the reviewed repositories, not all linked hosted content or commercial services. The exact current package requirements must be checked again before a future installation.

## Visible application

- Existing map home gains a compact city-guide drawer: choose a destination, read actual source-backed work titles, authors, registered draft/complete status, dates and full images, then enter the existing building or open its original post.
- No online count or guessed resident presence is shown. Missing images and unavailable source data are labelled explicitly.
- Existing buildings gain temporary-use editions with 2–6 original/material references, separate condition labels, equal/ordered/free placement and a list alternative.
- Replacement and publication show their impacts before changing the public edition; original posts/materials are not copied or edited.
- Public editions, reading reasons and closures are protected by rules. MCP installation status is tracked separately from these UI changes.

## Visual evidence

Before: [successful browser baseline run 40068326105](https://github.com/sohn0356-git/MOA/actions/runs/40068326105), artifact ai-city-browser-screenshots, feed-360.png / feed-1440.png. These are actual pre-change screens, not mockups.

After evidence and final workflow IDs are filled only after the revised app passes its builds, database emulator tests and native-browser checks. No uninstalled MCP is marked complete merely because the UI changed.
