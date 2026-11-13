# Changelog — OpenFront Utility (BrayFlex fork)

*Note: some changes may be undocumented prior to September 2026 because I didn't keep track ¯\_(ツ)_/¯*

## November 13th, 2026 — Wrapping Shapes & Better Paste
- **Shape** and **Paste** now **wrap around the canvas edges**: a shape or pasted pattern that crosses a seam continues on the opposite side, and its preview shows both halves.
- Fixed **paste mode still pasting after switching tools** — choosing the pencil, shape (or any other tool) before clicking now uses that tool instead of pasting the clipboard.
- **Paste now has its own Overwrite setting** (Black / Both / White) in the canvas options strip. It starts from the Select value each time and changing it only affects the current paste.
- The **Paste toolbar button stays highlighted** while paste mode is active.
- The **paste preview is much easier to see**: filled pixels use a strong accent tint that stays visible over black cells, and protected cells show the full footprint with a red hatch instead of disappearing.

## November 12th, 2026 — Faster Preview & Drawing
- The **pattern preview is much smoother**, especially on large canvases and at higher zoom. It now draws the pattern as a repeating tile instead of rebuilding every pixel.
- **Map simulation and team colours no longer hitch** while the preview updates — their expensive layers are cached and reused between frames.
- **Drawing stays responsive while the preview follows**: canvas output is updated once per animation frame instead of repeatedly for every cell change.
- **Fast strokes stay smooth** because the brush shape is worked out once per stroke rather than again for every cell it touches.
- The **cursor position readout** no longer does extra layout work on every pointer move.
- Preview, maps and colours render **exactly as before** — this is a performance pass with no visual changes.

## November 6th, 2026 — Team Color Warning
- A glowing **warning icon** now appears next to **Colors** when more than 40% of a pattern uses a bright, highly saturated secondary color. Hover or click it to learn why the pattern may be confusing in team games.
- **Submit is disabled** while the warning is active; hovering or pressing it shows the same explanation.
- Secondary colors must be **clearly darker** or **near white** to avoid the warning.
- Added canvas pixel counts and mouse position to the footer

## November 6th, 2026 — Paste Preview Shows the Copied Pattern
- The **paste preview** now shows what is on the clipboard: filled pixels preview dark and empty pixels preview faint, so you can see the pattern's shape before placing it instead of the whole selection showing as one solid block.

## November 5th, 2026 — Offline Support (credit oncenot)
- The utility now **works with no internet**: a service worker saves the app on the first visit (about 0.7 MB up front, map backgrounds finish in the background).
- **Fonts are bundled** with the app, so text looks the same offline and the page no longer requests Google Fonts.
- The app is now **installable** as a standalone app from the browser (manifest and icons).
- Returning visitors see a **"new version is ready"** message after a deploy instead of a surprise reload, and `npm run dev` is unaffected (network-first on localhost).

## November 5th, 2026 — Centered Guide Grid & Info Glow
- With both **Grid** and **Center** turned on, the 5-cell guide grid is now **anchored to the centre of the canvas** instead of the top-left corner, so the guide lines stay symmetric. Odd canvas sizes keep a whole cell in the middle.
- The **info button glows** when there are changes to read, and first-time visitors see it too. Opening the information panel clears the glow; it comes back with each new changelog entry.

## November 4th, 2026 — Selection Preview Contrast
- The drag **selection preview** is now easy to see over filled/black pixels: a small centered dot. The marker is drawn on top of the cell, so you can still tell filled and empty pixels apart while selecting.
- Selected cells and the **paste preview** now carry a light inner edge so their outlines stand out against dark pixels too.
- While an existing selection dims the canvas, **pending preview cells stay at full strength** instead of being dimmed along with everything else.
- **Removing from a selection** now previews in the danger red instead of blue, so subtracting is visually distinct from adding.

## November 3th, 2026 — Extra Fill Shades
- Added two more Fill swatches: an **extra-light 12.5% dither** (three clear cells between marks horizontally and vertically, alternating with a single clear cell diagonally) and its inverse, an **extra-dense 87.5% dither**.
- Both sit in density order with the existing swatches, between solid and 75%, and between 25% and Erase.

## November 3th, 2026 — Export Label Accuracy
- The export **JSON** button is now labelled **Base64**, since it copies the URL-safe Base64 pattern code rather than JSON. Its tooltip, copy confirmation toast, and the in-app help text now say the same.

## November 2nd, 2026 — Selection Bug Fixes and Canvas Wrap
- Selection **translations now wrap around the canvas edges** instead of dropping pixels that leave the board.
- The **Deselect** button now only tints its icon blue while a selection exists — its background and label stay neutral.
- **Lasso selection now fills the area it encloses**: the outline closes automatically, the live preview shows the filled region, and starting on a selected pixel deselects everything inside it.
- **Shift + Alt/⌥ no longer pans the canvas**, so it reliably starts a lasso with any tool.
- **Shift + arrow keys** move the active selection by one cell instead of panning, and **Shift + `+` / `-`** adjust the current tool's size.
- The Select **mode, Select and Overwrite tabbers are horizontal** with their titles above, styled like Pattern Scale.
- Tool previews now hide while **Shift / Shift + Alt** selection gestures are active, and those gestures override **Object** mode for regular / lasso selection.

## November 2nd, 2026 — Select Tool Controls, Lasso & Object Selection
- **Select now has its own options strip** in the canvas controls bar, just like Shape, Line and the other tools.
- Choose between **Regular ⬚**, **Lasso / freehand ◌** and **Object ⁜** selection. Object selection picks up every connected pixel of the same colour as the one you click.
- Hold **Shift + Alt/⌥** with any tool to temporarily use lasso selection, and **Ctrl/⌘ + A** now selects the whole canvas.
- Added **Select: Black / Both / White** and **Overwrite: Black / Both / White** tabbers (Both by default). Select controls which pixels enter a selection and which pixels are read by copy, invert, clear and every selection transform (shift, rotate and flip); Overwrite controls which destination pixels those actions may replace. Protected pixels now stay put instead of disappearing, and the selection only ever contains colours allowed by the Select filter.

## October 10th, 2026 — Improved Compatibility, Pencil Size/Drag Fixes, Performance Improvements
- **The Shape tool now starts on Circle** instead of Star.
- Removed the **browser-native number spinners** from the canvas Width/Height inputs on Firefox, leaving only the custom steppers.
- Fixed **square brushes being one cell too large at even sizes** — a size 4 brush is now exactly 4×4 instead of 5×5.
- Fixed **fast pencil drags skipping pixels** — strokes are now filled in between cell updates, so quick lines stay continuous.
- **Dragging the colour picker is much smoother**: colour changes are coalesced to roughly 30fps, the pattern is no longer re-encoded on every input event, and the URL rewrite waits until you pause.
- Holding **Space, Ctrl or ⌘** to pan now hides every tool preview, so the canvas stays clean during a pan gesture.

## October 10th, 2026 — Line Controls, Curved Lines & Pencil Preview
- **Line thickness** now has a Size slider just like Pencil, and the live line preview reflects the chosen thickness.
- Added a **Straight / Curved** option to the Line tool, shown as a compact **╲ / ⌒** icon tabber. In Curved mode, place your two endpoints, then **move the pointer to bend the line** — the pixel under the cursor becomes part of the curve.
- A curved line stays editable while you move the pointer, and the **next click solidifies it** onto the canvas. The floating Draw / × buttons and the first-time toast are gone.
- **Pencil now shows a live preview** of its brush footprint, matching the Shape tool's hover preview.
- Added a **Sharp (■) / Soft (●)** pencil tip toggle, switching between a square block and a circular brush.

## October 4th, 2026 — Selection, Sizing & Pencil Fixes
- **Undo/redo now preserves your selection** instead of clearing it. Copy, cut and the explicit **Deselect** action still clear it automatically, and the Deselect button highlights while a selection is active.
- Shortcut hints now use the **⌘ symbol** for Mac alongside Ctrl, including the Deselect tooltip and the keyboard shortcuts panel.
- **Shape sizes now match the Size slider exactly**: circles are drawn at their stated width (e.g. 64 is 64 cells, not 65), and cubes use the rounded Size × ratio for their width and height (e.g. 16 with a 1× height ratio is 16 cells tall).
- The **outside ruler strips are transparent**, so the faded canvas tiling remains visible around the grid.
- **Pencil strokes now start on mouse-down**, so the first pixel draws or erases correctly when you begin dragging.

## October 3rd, 2026 — One Fill Tool with 1-Bit Shading Styles
- **Fill** and **Shade** are now a single **Fill** tool (keeping the ▦ shade icon), so there is one place to fill or shade an area.
- The Fill options strip shows **clickable pixel swatches** instead of named buttons, ordered from darkest to lightest: solid ink, 75%, 50% and 25% dithers, plus **Erase** at the lightest end. Each swatch is a 48×48 preview drawn with chunky 4px pixels, so the pattern is easy to read at a glance.
- Hovering with Fill shows a live preview: every cell the fill would touch gets a faint tint, and the cells the chosen style would actually ink get a stronger tint. The preview follows the pointer and respects any active selection.
- Fills anchor the dither to the cell under the cursor, so patterns move with the pointer and line up predictably across a flood fill.
- With a selection active, Fill now paints the chosen style across the **whole selection** (Erase clears it), with the dither still anchored to the clicked cell.

## October 2nd, 2026 — Shape Tool Options Sub-bar
- Selecting the **Shape** tool now opens a dedicated options strip on the left of the canvas controls bar instead of hiding choices inside the toolbar button.
- Choose **Circle, Cube, Star, Triangle, Diamond, or Hexagon** from the Shape dropdown — the hover preview and drawing use the same shape state.
- The Cube now exposes **W× / H× ratio inputs**, so its width and height scale from the Size slider independently.
- Removed the separate **Circle** tool button since Circle is available from the Shape dropdown, and the **Shape toolbar icon now reflects the last shape selected**.
- The Size slider now adapts to the chosen shape — **circles can be drawn up to 128 across**, while every other shape tops out at **64 across** (the slider value is the shape's overall width). Switching shapes clamps the current size into the new range, and large ranges thin out the tick labels so they stay readable.
- The **Star** is now drawn as a hollow outline by default (no spokes through the middle).

## September 27th, 2026 — Seamless Tiling Around the Canvas
- The workspace **outside the drawing canvas** now shows a faded repeat of your pattern, so you can see how it continues across tile edges while you draw.
- The ghost keeps the canvas scheme — **black marks on a light backdrop** — in both light and dark mode. In dark mode the area outside the canvas lifts slightly so the black marks stay readable instead of inverting. It follows the pattern live and tracks canvas zoom/pan.
- Fixed toggling the **Center** guide shifting the canvas (and knocking the ghost out of alignment), and the center-only ruler strips now stay transparent so they no longer cover the tiling around the canvas.

## August 16, 2026 — Update Links
- The **Links** now reference the new artist dashboard and links related to the old system have been removed.

## August 16, 2026 — New Dashboard Submit
- The **Submit** button no longer pops up a form modal. Clicking it now opens the **OpenFront Dashboard Submission Form Page** in a new tab with your pattern already filled in — ready to fill out, review and submit.

## August 16, 2026 — Simulate In-Game Map & Team Colors
Three big additions to the Preview panel:

- **Simulate Map (🗺 button)** — opens a popover where you can pick from **9 real in-game maps** (World, Alps, Two Lakes, Arctic, Mare Nostrum, Gulf of St. Lawrence, Australia, Baikal, and South America). Your pattern is layered over the map using the game's own terrain colours and territory-fill style, drawn **only on land**, and kept in sync with the pattern zoom — so it looks just like the in-game map view.
- **Show Team Colors** — a toggle (now sitting below the map list with its own description) that shows what your pattern looks like in **team games**: the primary colour is swapped out for each team's colour in radial pie-style wedges radiating from the centre, so you can eyeball all 7 team colours at once.
- Behind the scenes fix, the preview background turns to the map's dark colour while a map is shown, so your primary colour no longer bleeds through at the edges when you zoom out.
- Added a **Copy image (⎙) button** to the right of it — one click copies the preview **exactly as you see it** (pattern, zoom, map simulation and all) to your clipboard as a PNG image.
- The **🗺 button now glows with the 7 team colours** when *Simulate Teams* is switched on, so you can tell at a glance that team colours are active behind that popover menu button.
- Small fixes to: UI spacing on popovers to create uniformity, size tick display, color display area in floating preview and font imports.

## August 15, 2026 — Crisper, Pixel-Perfect Preview
The preview panel got a big clarity upgrade:
- The pattern now **repeats right to the edges** of the panel, at any size or zoom level — resizing the panel just reveals more of the pattern instead of stretching it.
- **Zoom controls the pattern size** 50% up to 500% 
- **Fixed Monitor Interpolation** by adding a formula to calculate how to display pattern **sharp and pixel-perfect** at every level and every screen size — no more mis-sized, blurry or smudged edges (avoids half pixel rounding).
- The preview area now takes up about **60% of the panel's height**, giving your pattern more room to shine.
- Fixed an edge case where the pattern could stop just short of the panel's borders at certain zoom levels.

## August 14, 2026 — Favorite Colours
- Added a **★ star button** next to the Color Code button so you can **favorite your current color palette** (preset or custom) with one click — tap again to remove it.
- Favorited colors appear in a new **Favorites** list above the Color Presets, so you can quickly jump back to the palettes you use most. Custom palettes are listed as **"custom"**, and your favorites are remembered between sessions.

## August 14, 2026 — Guides, Ruler & Toolbar Polish
- Guide controls are now a tidy **Grid / Center / Ruler** toggle group with a more subtle tab-like style.
- The **Grid and Center toggles now stay in sync across both the Main and Test canvases** without resizing either one.
- Added an outside **ruler** around the drawable canvas — ticks on every line with numbers every 5 — plus a **Show/Hide Ruler** toggle. Center ticks appear on all four sides when Center is on, independent of the ruler.
- Moved the **Invert/Clear** buttons into the toolbar and the **Grid/Center/Ruler** toggles into the secondary toolbar (they swapped places), stacking Invert/Clear to save space.
- Tidied the top bar: extra top/bottom padding, smaller export buttons, and consistent 12px font across the main controls.

## August 13, 2026 — Test Canvas & Preview Fixes
- The **Test Canvas** is now a fixed 128×128 scratchpad with its own independent pan/zoom, so drawing there never silently changes the size of your main canvas.
- Fixed **Undo/Redo on the Test Canvas** (it previously couldn't record your steps because a 128×128 pattern can't be compressed into the standard pattern code).
- The preview panel now renders correctly no matter which canvas is active.
- Helpful little **toasts** (bottom-corner notifications) now confirm when you copy the JSON, console string, or preview link, and the Test Canvas tab shows a short tip on first use.

## August 12, 2026 — DM Mono Font
The monospace font everywhere (canvas size numbers, shape buttons, image-import threshold and the preview code view) switched from **IBM Plex Mono** to **DM Mono**, matching the DM Sans look of the rest of the interface.

## August 12, 2026 — Invert shortcut now Ctrl+I
- Inverting pixels is now **Ctrl/Cmd+I** (was plain `I`), matching the other clipboard-style shortcuts.
- The **Controls** tab was tidied up: panning via Space or Ctrl is now a single line.

## August 11, 2026 — Reworked Info Panel into Five Tabs
The **Info** modal was broken down into five focused tabs:
- **About** — the beta disclaimer, how patterns work, team-colour tips, and credits.
- **Guide** — step-by-step instructions for testing your pattern in-game.
- **Controls** — every keyboard shortcut in a clean table.
- **Links** — all useful resources (submit form, status tracker, pattern tools, converter, feedback) in tidy cards.
- **Changelog** — the latest changes pulled straight from GitHub.

## August 10, 2026 — Redesigned Colors Section of the Preview Panel
The panel is now more compact in both fixed and floating preview and the text style matches other labels.

## August 10, 2026 — Fresh New App Icon
The little icon shown in your browser tab (the favicon) has been replaced with a brand new design.

## August 10, 2026 — Cleaner Font (DM Sans)
The whole interface now uses the **DM Sans** font, giving the tool a cleaner, more modern look.

## August 10, 2026 — Polished Tool-Size Slider
Refreshed the slider used to change tool size: clearer tick marks and number labels that are easy to read in **both light and dark mode**.

## August 9, 2026 — Artist Name Field
Text descriptions and label names have been written from scratch, concise and clear to keep everything compact. 

## August 9, 2026 — Pattern Scale Tabs (1× / 2× / 4×)
Pattern scale is now chosen with three simple tabs instead of a dropdown. The Width/Height labels and zoom controls were also tidied up.

## August 9, 2026 — Tool-Size Slider Fixes
Fixed the size slider so it works properly for every tool (the Circle and Shape tools use a 1–30 range), and improved how the slider looks with clear tick marks.

## August 8, 2026 — New Shortcuts & Easier Panning
- **Arrow keys** now pan around the canvas.
- Hold **Ctrl** and drag to pan — the cursor turns into a grab hand.
- **Backspace / Delete** erases the cells inside your current selection (and won't wipe the whole canvas by accident).
- Press **i** to invert pixels in your selection (or the whole canvas if nothing is selected); press **Shift+i** to invert the selection area itself.
- Fixed **Cut** so it actually removes the pixels, and **pasting** is now centred on your cursor and stays inside your selection.

## August 8, 2026 — Redesigned Tool-Size Selector
The size picker is now a clean floating panel in the corner of the canvas. It only appears for tools that have a size (like Pencil or Circle). You can type a size directly, and it automatically clamps to the limits of whichever tool you have selected. Pasting no longer deselects your pasted cells.

## August 2, 2026 — Preview Panel Overhaul
Big update to the preview panel:
- **Zoom** the preview from 50% up to 400%.
- Colour controls (primary / secondary / swap / copy colour code) are now in a single tidy row.
- The preview can be **undocked into a floating window** that you can drag anywhere, resize freely (grab the corner), and it remembers its position between sessions.
- Fixed a few dragging and resizing bugs along the way.

## July 30, 2026 — Smarter Preview Behaviour
The preview now **collapses automatically when you float it** and **expands when you dock it back**, keeping the workspace tidy.

## July 29–30, 2026 — Grid & Center Guides
- The **Center Guide** is now a clean, perfectly centred crosshair overlay.
- Refined the grid and center-guide colours and lines so they're clearly visible on any background.
- Added a "Size" label under the toolbar size button.

## July 29, 2026 — Preview Sizing Fixes
Fixed the preview canvas sizing so it keeps the correct proportions and fills its panel properly.

## July 22–23, 2026 — UI Revamp & Expanded Info Popup
- New animated **moon/sun** switch on the dark-mode toggle.
- Transform buttons (rotate / shift / flip) arranged into a tidy grid.
- Fixed Undo accidentally clearing the canvas when a selection was active.
- The selection border is now clearly visible even over black pixels.
- Side panels can be resized by dragging the divider, and the floating preview now has a resize handle.
- The **Info (ⓘ) popup** is now scrollable and includes more detail (including tips about testing FFA vs Teams colours).
- Removed third-party analytics for privacy.

## July 15, 2026 — New Blue Theme, Dark Mode & Compact Layout
- Restyled the whole app with a clean blue theme.
- Added a **Dark Mode toggle** that follows your system setting and remembers your choice.
- The tool-size picker is now a popover with clear tick marks.
- Colour presets are shown in a tidy 2-column grid, and the toolbar is compact enough to fit on 1080p / iPad screens.

## July 8, 2026 — Better Drawing Tools & Easier Submission
- **Submit** now collects your name, player ID, and pattern name, then opens a **pre-filled Google Form** in a new tab.
- **Paste** is now a tool of its own with a live preview under your cursor — it returns to your previous tool once placed.
- Hold **Shift** with any tool to temporarily switch into selection mode.
- New **Shape tool** (choose **Star** or **Cube**), and **circles** are now much smoother thanks to a better drawing algorithm.
- Fixed the Fill and Shade tools, and Clear / Invert now respect your selection.

## July 1, 2026 — Feature & Function Revamp (THE BIG UI OVERHAUL)
This was a complete rebuild of the tool, so almost everything about how you use it changed. Compared to the previous version:

**A brand-new toolbar**
- Drawing tools moved out of a side panel and into a horizontal toolbar along the top: **Pencil, Circle, Star, Line**, plus **Fill** and a new **Shade** tool (fills an area with a checkerboard pattern).
- One shared, adaptive **size slider** replaces the old separate size control per tool — it automatically matches whichever tool you pick.

**Cut, Copy & Paste**
- New **Cut / Copy / Paste** buttons — select part of your pattern, copy it, and paste it back down anywhere on the canvas.

**Selection tools**
- New **Select Area** and **Select Custom** tools plus a **Deselect** button, with **Shift / Rotate** buttons that act on your selection.

**Two canvases**
- A brand-new **Scrap Canvas** (a scratch/test canvas) alongside the main **Pattern Canvas**, switched with tabs at the top of the canvas area — each with its own Undo/Redo.

**Canvas controls bar**
- Canvas width and height now use compact number boxes with ▲/▼ arrows, plus dropdowns for **Scale** (1×–16×) and **Grid Zoom**, and **Invert / Clear** buttons.

**Preview panel**
- The preview can now be **floated** as its own window, **docked** back, or hidden (with a button to show it again when collapsed). The colour controls (primary / secondary / swap / presets) stayed in the panel.

**Simpler export & submit**
- Export and Import were reorganized into tabs with one-click **Copy** buttons (JSON, Discord, Preview link, Console) and a brand-new **Submit** button that opens a submission popup.
- The old **Stamp** tool and the complicated shift-mode settings were removed to keep things simpler.
