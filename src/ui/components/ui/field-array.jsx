import * as React from "react";
import { cn } from "@/ui/lib/utils";

/**
 * Dynamic form field array: add/remove/reorder list items.
 * Adapted from FieldArray pattern for Canji Paper & Pine design system.
 */
export function FieldArray({
  label = "Fields",
  countLabel,
  headerRight,
  hideHeader = false,
  rows = [],
  onRowsChange,
  placeholder = "Value…",
  maxRows = 10,
  minRows = 1,
  showMove = true,
  addLabel = "+ Add row",
  onAdd,
  renderRow,
  renderAdd,
  footer,
  emptyState,
  getDeleteAriaLabel,
  getMoveUpAriaLabel,
  getMoveDownAriaLabel,
  className,
  ...props
}) {
  const update = (idx, value) =>
    onRowsChange?.(rows.map((r, i) => (i === idx ? { ...r, value } : r)));

  const remove = (idx) =>
    onRowsChange?.(rows.filter((_, i) => i !== idx));

  const add = () => {
    if (onAdd) {
      onAdd();
      return;
    }
    onRowsChange?.([...rows, { id: `row-${Date.now()}`, value: "" }]);
  };

  const move = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[idx], next[target]] = [next[target], next[idx]];
    onRowsChange?.(next);
  };

  return (
    <div className={cn("w-full space-y-2.5", className)} {...props}>
      {!hideHeader && (label || headerRight) && (
        <div className="flex items-center justify-between gap-3 pb-1">
          {label ? (
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground tnum">
              {label} · {countLabel ?? rows.length}
            </p>
          ) : (
            <div />
          )}
          {headerRight ? <div className="flex items-center gap-2">{headerRight}</div> : null}
        </div>
      )}

      {rows.length === 0 && emptyState ? (
        emptyState
      ) : (
        <div className="space-y-1.5" role="list">
          {rows.map((row, idx) => (
            <div
              key={row.id ?? idx}
              role="listitem"
              className="flex items-center gap-2 rounded-lg border border-border/80 bg-card/45 px-2.5 py-1.5 animate-[faIn_0.22s_ease-out_both] motion-reduce:animate-none"
              style={{ animationDelay: `${idx * 35}ms` }}
            >
              <span className="w-5 shrink-0 font-mono text-xs tabular-nums text-muted-foreground text-right select-none pr-0.5">
                {idx + 1}
              </span>

              <div className="min-w-0 flex-1 flex items-center gap-2">
                {renderRow ? (
                  renderRow(row, idx, { update, remove, move })
                ) : (
                  <input
                    value={row.value}
                    onChange={(e) => update(idx, e.target.value)}
                    placeholder={placeholder}
                    className="min-w-0 flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors motion-reduce:transition-none"
                  />
                )}
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                {showMove && (
                  <>
                    <button
                      type="button"
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0}
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring motion-reduce:transition-none"
                      aria-label={getMoveUpAriaLabel ? getMoveUpAriaLabel(row, idx) : "Move up"}
                      title="Move up"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M18 15l-6-6-6 6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => move(idx, 1)}
                      disabled={idx === rows.length - 1}
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring motion-reduce:transition-none"
                      aria-label={getMoveDownAriaLabel ? getMoveDownAriaLabel(row, idx) : "Move down"}
                      title="Move down"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  disabled={rows.length <= minRows}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring motion-reduce:transition-none"
                  aria-label={getDeleteAriaLabel ? getDeleteAriaLabel(row, idx) : "Delete row"}
                  title="Remove"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {renderAdd ? (
        renderAdd({ add, disabled: rows.length >= maxRows })
      ) : (
        <button
          type="button"
          onClick={add}
          disabled={rows.length >= maxRows}
          className="w-full h-[34px] rounded-[9px] border border-dashed border-border font-sans text-xs font-medium text-muted-foreground transition-colors hover:border-accent hover:text-accent hover:bg-[color-mix(in_srgb,var(--accent)_4%,transparent)] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring motion-reduce:transition-none"
        >
          {addLabel}
        </button>
      )}

      {footer}
    </div>
  );
}

export default FieldArray;
