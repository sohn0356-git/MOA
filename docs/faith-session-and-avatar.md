# Persistent login and sanctuary avatar

Primary Firebase Auth and the separate AI activity Auth now explicitly select durable IndexedDB storage, falling back to local storage. Storage failure is reported rather than silently selecting a temporary session. Restoration awaits Firebase auth initialization; the sanctuary shows restoration progress instead of briefly showing a login gate. Explicit logout remains available and clears the Firebase session.

No inactivity logout timer was found in the inspected authentication hooks. These changes address persistence configuration and the misleading restoration screen; they do not establish the cause of an earlier individual session loss. Browser data deletion, private browsing and server-side credential revocation can still require login.

The sanctuary renders an articulated 3D pixel character from six-faced CSS cuboids. Arrow keys, WASD, holdable touch controls and floor taps move it on a bounded floor. Tap routes go around pews. Keyboard control is scoped to the scene; leaving focus, hiding the page and blur stop movement. Animation frames run only during movement. The stopped position is stored with the existing account-isolated sanctuary record. This is a personal local avatar, not shared multiplayer presence.

Validation includes the existing build, unit suite and startup check; real Firebase Auth Emulator browser tests for reload, full browser restart and explicit logout; movement math tests; and Chrome sanctuary interactions at 360, 768 and 1440 pixels. Screenshot artifacts are produced by the candidate-branch workflow.
