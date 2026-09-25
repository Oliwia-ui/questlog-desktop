# QuestLog design customization

QuestLog keeps task behavior and persistence outside the visual layer. Domain rules live in `src/shared/domain.ts`; application sequencing, JSON persistence, and Obsidian logging live in `src/main/`. Restyling the renderer should not require changing those files.

## Safest customization points

### Theme tokens

Start in `src/renderer/src/assets/theme.css`. It is the single source for:

- colors and semantic state colors
- display, body, and monospace typography
- spacing scale
- control, card, panel, and dialog radii
- elevation and glow shadows
- motion durations and easing
- primary sidebar/content/inspector widths

`main.css` contains reusable layout and component classes that consume those tokens. Prefer changing or adding a token over placing a new color, shadow, radius, timing value, or font directly in a component rule.

### Layout

Change the layout tokens at the bottom of `theme.css` for broad proportions. Responsive mode changes are grouped at the end of `main.css`. The three primary surfaces are `.sidebar`, `.main-panel`, and `.inspector`.

### Labels and chapter language

Navigation labels and chapter headings are centralized near the top of `src/renderer/src/App.tsx` in `viewCopy` and the four `NavButton` calls. Changing those strings does not affect stored task data or event types. Do not rename the `TASK_*` event constants: those are part of the history format.

### Reusable visual modules

The renderer uses shared React modules (`NavButton`, `QuestCard`, `QuestForm`, and `Settings`) and shared classes (`primary-button`, `secondary-button`, `quest-card`, `tag`, and `settings-card`). Extend these before adding page-specific duplicate markup or inline styles.

### Motion and accessibility

Adjust `--motion-fast`, `--motion-normal`, `--motion-slow`, and `--ease-standard` in `theme.css`. The reduced-motion media query in `main.css` must remain in place so operating-system preferences override decorative animation.

## Safety checklist

After design changes, run:

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

Then launch `npm start` and check keyboard focus, narrow-window behavior, readable status text, the create/edit inspector, deletion confirmation, and Settings.
