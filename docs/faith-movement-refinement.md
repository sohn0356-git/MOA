# Chapel movement and posture refinement
Seat markers now share the same visual diameter and touch target in every state, with only their color changing. Their positions are projected from the actual destination points rather than independent percentages. Visibly occupied seats cannot be selected.

Navigation uses eight-direction A* with collision-checked line-of-sight simplification and exact endpoints. The animation loop consumes distance across waypoints within the same frame, so crossing a waypoint no longer adds a stop/start frame. Facing turns smoothly, and manual keys no longer add an immediate positional jump. Changing ambient controls releases manual input without cancelling an automatic walk; opening a modal, hiding the page, leaving the room, or providing new manual movement cancels pending arrival actions.

The prayer box queues an approach to its walkable point. The board opens once, after arrival and facing the box. Cancelling or replacing the route prevents a delayed board from opening. The sit action chooses the nearest visibly empty seat and sits only on arrival.

Legs now have independent thigh, shin and shoe cuboids. Sitting keeps the torso upright, thighs horizontal and shins hanging vertically. Kneeling puts the knees on the ground with shins folded backward and the upper body/head bowed. Existing presence pose values and permissions remain unchanged.

Verification includes routes between all seats and the box, exact arrival, cancellation, occupied-seat behavior, continuous walking frames, equal marker sizes, real two-account pose synchronization and rendered joint geometry, with responsive pose/scene screenshots.
