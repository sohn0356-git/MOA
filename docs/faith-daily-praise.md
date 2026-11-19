# Daily praise library selection
The feed no longer requires a lunchPraiseTracks entry whose key equals today's date. It normalizes all existing entries and selects a playable active YouTube video from the library. Dates on older rows remain valid library identifiers.

The Korean-day key already maintained by MeditationApp seeds a daily pseudo-random selection. The chosen video ID is saved locally for that day, so rerenders, account switches, reloads and new uploads do not unnecessarily replace an already chosen video. Removing/deactivating the selected video chooses another playable track. The next Korean day selects again automatically, including when the page stays open. Random selection can repeat a video on different days.

Malformed links and inactive entries are excluded; duplicate YouTube videos receive one place in the pool. A valid URL can recover an invalid videoId field. Empty/loading/error UI remains truthful when no playable library entries are available. Existing muted autoplay/player controls and authorized URL registration stay unchanged; registration feedback now describes saving to the shared library.

No new database path, daily job, migration, or client write permission is required. Selection works without browser storage using the day seed. Tests cover historical-only data, duplicate/bad/inactive rows, day rollover, persistence, list changes, blocked storage and an actual MeditationApp iframe regression.
