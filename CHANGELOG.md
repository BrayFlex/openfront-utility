# Changelog — OpenFront Utility (BrayFlex fork)

*Note: some changes may be missing prior to September 2026 due to my lack of documentation.*

## August 10, 2026 — Redesigned Colors Section of the Preview Panel
The panel is now more compact in both fixed and floating preview and the text style matches other labels.

## August 10, 2026 — Fresh new app icon
The little icon shown in your browser tab (the favicon) has been replaced with a brand new design.

## August 10, 2026 — Cleaner font (DM Sans)
The whole interface now uses the **DM Sans** font, giving the tool a cleaner, more modern look.

## August 10, 2026 — Polished tool-size slider
Refreshed the slider used to change tool size: clearer tick marks and number labels that are easy to read in **both light and dark mode**.

## August 9, 2026 — Artist Name field
Text descriptions and label names have been written from scratch, concise and clear to keep everything compact. 

## August 9, 2026 — Pattern Scale tabs (1× / 2× / 4×)
Pattern scale is now chosen with three simple tabs instead of a dropdown. The Width/Height labels and zoom controls were also tidied up.

## August 9, 2026 — Tool-size slider fixes
Fixed the size slider so it works properly for every tool (the Circle and Shape tools use a 1–30 range), and improved how the slider looks with clear tick marks.

## August 8, 2026 — New shortcuts & easier panning
- **Arrow keys** now pan around the canvas.
- Hold **Ctrl** and drag to pan — the cursor turns into a grab hand.
- **Backspace / Delete** erases the cells inside your current selection (and won't wipe the whole canvas by accident).
- Press **i** to invert pixels in your selection (or the whole canvas if nothing is selected); press **Shift+i** to invert the selection area itself.
- Fixed **Cut** so it actually removes the pixels, and **pasting** is now centred on your cursor and stays inside your selection.

## August 8, 2026 — Redesigned tool-size selector
The size picker is now a clean floating panel in the corner of the canvas. It only appears for tools that have a size (like Pencil or Circle). You can type a size directly, and it automatically clamps to the limits of whichever tool you have selected. Pasting no longer deselects your pasted cells.

## August 2, 2026 — Preview panel overhaul
Big update to the preview panel:
- **Zoom** the preview from 50% up to 400%.
- Colour controls (primary / secondary / swap / copy colour code) are now in a single tidy row.
- The preview can be **undocked into a floating window** that you can drag anywhere, resize freely (grab the corner), and it remembers its position between sessions.
- Fixed a few dragging and resizing bugs along the way.

## July 30, 2026 — Smarter preview behaviour
The preview now **collapses automatically when you float it** and **expands when you dock it back**, keeping the workspace tidy.

## July 29–30, 2026 — Grid & Center Guides
- The **Center Guide** is now a clean, perfectly centred crosshair overlay.
- Refined the grid and center-guide colours and lines so they're clearly visible on any background.
- Added a "Size" label under the toolbar size button.

## July 29, 2026 — Preview sizing fixes
Fixed the preview canvas sizing so it keeps the correct proportions and fills its panel properly.

## July 22–23, 2026 — UI revamp & expanded Info popup
- New animated **moon/sun** switch on the dark-mode toggle.
- Transform buttons (rotate / shift / flip) arranged into a tidy grid.
- Fixed Undo accidentally clearing the canvas when a selection was active.
- The selection border is now clearly visible even over black pixels.
- Side panels can be resized by dragging the divider, and the floating preview now has a resize handle.
- The **Info (ⓘ) popup** is now scrollable and includes more detail (including tips about testing FFA vs Teams colours).
- Removed third-party analytics for privacy.

## July 15, 2026 — New blue theme, dark mode & compact layout
- Restyled the whole app with a clean blue theme.
- Added a **Dark Mode toggle** that follows your system setting and remembers your choice.
- The tool-size picker is now a popover with clear tick marks.
- Colour presets are shown in a tidy 2-column grid, and the toolbar is compact enough to fit on 1080p / iPad screens.

## July 8, 2026 — Better drawing tools & easier submission
- **Submit** now collects your name, player ID, and pattern name, then opens a **pre-filled Google Form** in a new tab.
- **Paste** is now a tool of its own with a live preview under your cursor — it returns to your previous tool once placed.
- Hold **Shift** with any tool to temporarily switch into selection mode.
- New **Shape tool** (choose **Star** or **Cube**), and **circles** are now much smoother thanks to a better drawing algorithm.
- Fixed the Fill and Shade tools, and Clear / Invert now respect your selection.

## July 1, 2026 — Feature & Function Overhaul (the big rebuild)
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
