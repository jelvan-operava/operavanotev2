# ACCESSIBILITY.md

## Current state

The UI uses semantic buttons, inputs, tables, and dialogs in many places, but accessibility is inconsistent because the app is large and highly custom.

## Good patterns already present

- Many actions use real `<button>` elements.
- Modal components set `role="dialog"` and `aria-modal="true"`.
- Some close buttons have `aria-label`.
- Public legal/help pages are readable without login.

## Gaps and risks

- Focus trapping is not consistently implemented in modals.
- Keyboard-only navigation is not guaranteed for all custom controls.
- Some icon-only buttons lack accessible names.
- Some draggable/resizable regions need keyboard alternatives.
- Color-driven status indicators may need stronger non-color cues.
- Large workspace views need careful zoom and scroll behavior on mobile.

## Feature notes

- **Dashboard**: visually dense; verify contrast in note cards and widget states.
- **StickySend**: composer and filters should remain keyboard accessible.
- **Calendar**: calendar grid should expose selected date and event state clearly.
- **Docs**: toolbar controls need labels and predictable focus order.
- **Canvas**: pointer-based interactions should have keyboard fallback where practical.
- **Admin**: select controls and tables need clear labels and row action focus states.

## What to verify manually

- Tab order through all dialogs
- Escape closes modals
- Enter/Space activates buttons
- Screen reader labels on icon buttons
- Contrast in dark/light themes
- Mobile touch target sizes

## WCAG target

Target WCAG 2.2 AA where practical.

## Next improvements

1. Add focus trapping to all modals.
2. Add missing labels to icon-only buttons.
3. Add keyboard support for custom board interactions.
4. Add accessibility tests.
