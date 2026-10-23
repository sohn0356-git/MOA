# Split city navigation

AI City opens with a native WebGL 3D city above an independent scrolling pane
containing the existing twelve functions. The city is fictional; no geographic
map, external 3D asset service, or new dependency is required.

Buildings are real world-space meshes with depth-tested walls, roofs, windows,
roads, trees and moving resident figures. Residents use the existing appearance
records and shared walking schedule/commands. Rotate with dragging or arrow keys,
zoom with buttons, and use the labeled entrance strip as a keyboard alternative.

Click a building or its labeled entrance to open the corresponding existing
function. The upper pane is hidden and the lower pane expands. A fixed
“지도로 돌아가기” button restores the split view without resetting the lower
function, composer, resident, avatar appearance or 3D camera. Focus returns to the
building entrance. Existing lower navigation and the suggestion box remain available.
Scroll positions in city navigation now belong to the lower pane.

The renderer remains mounted while inside a building and stops GPU drawing while
the map is hidden or the browser tab is not visible. Buffers, shaders, listeners and
animation frames are disposed on unmount. Context loss exposes a retry and the
building list. Devices without WebGL can still enter every function from that list.

Validation includes projection/ray depth tests, finite mesh validation, all twelve
building destinations, expansion/return/draft tests and real Chromium checks at
1440, 768 and 360 pixels using software WebGL in CI. Browser checks use the exact
Pages artifact and retain the existing public main/login/MOA checks.
