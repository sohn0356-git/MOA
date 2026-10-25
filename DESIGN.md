# AI City design direction

Scope: src/apps/ai-city only. Existing MOA apps keep their designs and entry points.

## Purpose
A visitor should understand who made something, what it is, and how to read the original. The city is a useful entrance to real work, rather than a decoration that forces walking.

## Composition
- Keep the walkable city as the main canvas; preserve the foldable news panel and direct destinations.
- Add one compact city-guide drawer to the existing map, not another menu or building.
- Inside an existing building, show its temporary use and referenced work before the existing tools.
- Use a clear editorial heading, quiet borders, generous separation, and a visible source/action. Avoid repeating interchangeable pastel cards everywhere.
- Actual saved posts, work titles, authors, dates and complete images supply the visual content. No invented online presence, activity counts, art or stock previews.

## Typography and spacing
- Use the existing system Korean font stack; do not add remote fonts.
- One 22–24px section heading, 15–16px work title, 11–13px metadata; body line height at least 1.6.
- Base spacing: 4, 8, 12, 16, 24. Minimum primary touch target 34px; map movement retains its large joystick.
- Ink #283b35, paper #fffdf5, quiet line #d8dfd1, contextual earth accent #765b43. Color never indicates a winning side or consent.

## Source integrity and editions
- Conditions are a separate bordered block before the title, labelled measurement status / calculation assumption / result.
- Show original / derived, author and draft / complete when actually registered.
- Use object-fit: contain; absent images are labelled absent.
- Equal comparisons share height. Ordered layouts keep DOM order. Free layouts always have a matching ordered list and become a list on small screens.
- A replacement preview changes this space's reference, never the original source.
- Publication requires a before/after influence preview. Old editions and their source links remain readable.
- Opening a space never records participation, assignment, preference or consent. Reading reasons require explicit input and submission; resting does not write a response.

## Accessibility and validation
- Native buttons, labels and keyboard controls; restore focus after replacement cancel and building return.
- Preserve WASD, joystick stop, wheel/pinch zoom and the 2D destination alternative.
- Respect prefers-reduced-motion; no motion is needed to understand a source.
- Check 360/768/1440 widths and 740×430 landscape, forced WebGL failure, original entry, and before/after screenshots.
- Protect saved editions, source provenance and closure in database rules as well as UI.

## References
The DESIGN.md approach was reviewed in [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md), MIT. This is an original AI City guideline, not a copied brand design or a claim to have installed a design tool. Tool decisions and evidence are tracked in docs/ai-city-design-review.md.
