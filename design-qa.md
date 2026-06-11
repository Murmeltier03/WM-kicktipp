# Design QA

Source visual: `C:/Users/Yanni/AppData/Local/Temp/codex-clipboard-dca1eb0e-d603-4a15-aeec-8505697d4ee8.png`

Prototype capture: `C:/Users/Yanni/Documents/WM Website/qa-reference-mobile.png`

Viewport: Chrome DevTools mobile emulation, 390px wide, device scale factor 2.

Measurements:
- `innerWidth`: 390
- `documentElement.scrollWidth`: 390
- `body.scrollWidth`: 390

Checks:
- Header matches the black mobile bar, German flag mark, WM Kicktipp title, hamburger control, and black-red-gold stripe.
- Hero matches the provided football/photo-led direction with white WM 2026 title, dark overlay, status chip, and football/grass image.
- Leaderboard now uses the reference-like table card with trophy icon, player count, column labels, rank badges, total score, ST1/ST2/ST3 cells, and chevrons.
- Mapping section uses the calendar icon, automatic label, numbered rows, and arrow buttons in the same family.
- Bottom navigation is fixed and icon-led for Tabelle, Spielplan, and Admin.
- No horizontal overflow at 390px.

Remaining P3 notes:
- The supplied ball photo is not exactly the same crop as the reference concept, but it is the user-provided asset and now occupies the same visual role.
- The first mapping row begins below the fold on a 390x900 capture because the real data table remains fully visible above it.

Final result: passed
