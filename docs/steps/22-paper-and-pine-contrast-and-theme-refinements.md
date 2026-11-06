# Step 22: Paper & Pine Contrast and Theme Refinements

**Status**: In Progress  
**Branch**: `step/22-paper-and-pine-contrast-and-theme-refinements`  
**Date**: 2026-11-07  

---

## 1. Objective & Scope

1. **Phosphor Duotone Layer Global Contrast Alignment (`src/ui/globals.css`)**:
   - Add global sub-path target inside `@layer base` targeting `svg path[opacity="0.2"]` to boost opacity from 0.2 to 0.3 with smooth fill/opacity transitions, binding duotone icon secondary layers directly to the layout theme.

2. **Extension Popup Footers & Domain Icon Theming (`src/popup/popup.jsx`)**:
   - Update `GlobeHemisphereWest` and `ClockCounterClockwise` icons to use `"size-3.5 text-muted-foreground fill-accent/20"`, cleanly weaving Pine accent into the duotone background layer.
   - Soften settings gear slider icon (`Faders`) in the header by setting `weight="regular"` with `"size-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"`.

3. **Sidebar Active State Menu Polish (`src/options/options.jsx` & `src/ui/components/ui/sidebar.jsx`)**:
   - Maintain `weight="duotone"` on active sidebar navigation items.
   - Update the active icon className to `"size-4 shrink-0 text-accent fill-accent/20"`.
   - Add `data-[active=true]:[&>svg]:text-accent data-[active=true]:[&>svg]:fill-accent/20` to `sidebarMenuButtonVariants` in `sidebar.jsx`.

4. **SegmentedControl Theme Icon Removal (`src/options/options.jsx`)**:
   - Remove `SunDim`, `MoonStars`, and `Desktop` icons from `THEME_OPTIONS` for the Light, Dark, and System theme segmented controls across the options page (sidebar footer and Appearance section).
   - Clean up unused icon imports from `@phosphor-icons/react`.

---

## 2. Verification Results

### Build (`npm run build`)
```text
[Build] Bundling Canji v2.0.0 (4222c6f) with esbuild...
[Build] esbuild bundling completed successfully.
[Build] Manifests generated for Chrome and Firefox.
[Build] Created package: canji-chrome-v2.0.0.zip
[Build] Created package: canji-firefox-v2.0.0.zip
[Build] Build completed successfully for v2.0.0 (4222c6f).
```

### Unit & Smoke Tests (`npm test`)
```text
ℹ tests 131
ℹ suites 0
ℹ pass 131
ℹ fail 0
```

### Firefox MV3 Lint (`npm run lint:firefox`)
```text
Validation Summary:
errors          0
notices         0
warnings        4
```

---

## 3. Provenance & Land Record
- **Pull Request**: TBD
- **First Commit SHA**: TBD
- **Last Commit SHA**: TBD
- **Merge Commit SHA**: TBD
