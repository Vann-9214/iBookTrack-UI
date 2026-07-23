# Dead Code Archive Notes

## Date: July 23, 2026

The following unused components and routes were identified as dead code during Phase 6 refactoring and archived in `DEADCODES/`:

- `components/ilms-test-panel.tsx`: Deprecated test UI component.
- `components/missing-item-log.tsx`: Replaced by feature-based logging tables.
- `components/metrics-row.tsx`: Replaced by modular feature metric components.
- `components/import-modal.tsx`: Replaced by feature import dialogs.
- `components/book-info-card.tsx`: Replaced by feature card components.
- `action-buttons.tsx`: Obsolete action button bar.
- `session-log.tsx`: Replaced by inspection session log components.
- `session-control.tsx`: Replaced by feature session controls.
- `components/ui/use-mobile.tsx`: Duplicate hook replaced with `@/hooks/use-mobile`.
- `app/box/[boxNumber]/`: Unused empty route directory.

These files are safely archived here and can be deleted after one sprint.
