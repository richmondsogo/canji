"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";

const CELL = {
  type: "spring",
  stiffness: 520,
  damping: 34,
  mass: 0.45,
};

const SEG_DEFAULT =
  "px-3 py-[5px] text-center text-xs font-medium leading-[16px] tracking-[-0.01em] whitespace-nowrap inline-flex items-center justify-center gap-1 min-w-[58px]";

const SEG_SM =
  "px-3 py-[5px] text-center text-xs font-medium leading-[16px] tracking-[-0.01em] whitespace-nowrap inline-flex items-center justify-center gap-1 min-w-[58px]";

export function SegmentedControl({
  options,
  label,
  value,
  defaultValue,
  onValueChange,
  size = "default",
  className = "",
  id,
}) {
  const count = Math.max(1, options.length);
  const template = `repeat(${count}, minmax(0, 1fr))`;
  const segClass = size === "sm" ? SEG_SM : SEG_DEFAULT;

  const [internal, setInternal] = useState(
    () => defaultValue ?? options[0]?.value ?? "",
  );
  const [hovered, setHovered] = useState(-1);

  const controlled = value !== undefined;
  const current = controlled ? value : internal;
  const found = options.findIndex((o) => o.value === current);
  const hasSelection = found >= 0;
  const index = hasSelection ? found : 0;

  const buttons = useRef([]);
  const emit = useRef(onValueChange);
  emit.current = onValueChange;

  const reduced = useReducedMotion();
  const pos = useMotionValue(index);
  const thumbX = useTransform(pos, (v) => `${v * 100}%`);
  const maskX = useTransform(pos, (v) => `${v * -100}%`);

  useEffect(() => {
    if (reduced) {
      pos.set(index);
      return;
    }
    const controls = animate(pos, index, CELL);
    return () => controls.stop();
  }, [index, reduced, pos]);

  const select = useCallback(
    (next) => {
      if (!controlled) setInternal(next);
      if (next !== current) emit.current?.(next);
    },
    [controlled, current],
  );

  const seek = useCallback(
    (from, dir) => {
      let i = from;
      for (let k = 0; k < count; k++) {
        i = (i + dir + count) % count;
        if (!options[i]?.disabled) return i;
      }
      return from;
    },
    [count, options],
  );

  const go = useCallback(
    (i) => {
      const option = options[i];
      if (!option || option.disabled) return;
      buttons.current[i]?.focus();
      select(option.value);
    },
    [options, select],
  );

  const onKeyDown = (e, i) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      go(seek(i, 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      go(seek(i, -1));
    } else if (e.key === "Home") {
      e.preventDefault();
      go(seek(count - 1, 1));
    } else if (e.key === "End") {
      e.preventDefault();
      go(seek(0, -1));
    }
  };

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={label}
      style={{
        backgroundColor: "var(--seg-track, var(--secondary))",
        borderColor: "var(--seg-border, var(--border))",
      }}
      className={`relative inline-block select-none rounded-[9px] border p-[3px] shadow-[inset_0_1px_2px_rgba(20,33,27,0.06)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)] ${className}`}
    >
      <div
        className="relative grid"
        style={{ gridTemplateColumns: template, touchAction: "manipulation" }}
      >
        {options.map((option, i) => (
          <span
            key={option.value}
            aria-hidden="true"
            className={`${segClass} pointer-events-none transition-colors duration-150 ${
              option.disabled
                ? "text-muted-foreground/40"
                : hovered === i && (!hasSelection || i !== index)
                  ? "text-foreground"
                  : "text-muted-foreground"
            }`}
          >
            {option.icon}
            <span>{option.label}</span>
          </span>
        ))}

        <motion.div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 overflow-hidden rounded-[6px] transition-opacity duration-150 ${
            hasSelection ? "opacity-100" : "opacity-0"
          }`}
          style={{
            width: `${100 / count}%`,
            x: thumbX,
            backgroundColor: "var(--seg-thumb, var(--primary))",
            boxShadow: "var(--seg-thumb-shadow, 0 1px 2px rgba(20, 33, 27, 0.24))",
          }}
          initial={false}
        >
          <motion.div
            className="absolute inset-0"
            style={{ x: maskX }}
            initial={false}
          >
            <div
              className="absolute inset-y-0 left-0 grid"
              style={{
                width: `${count * 100}%`,
                gridTemplateColumns: template,
              }}
            >
              {options.map((option) => (
                <span
                  key={option.value}
                  style={{ color: "var(--seg-thumb-foreground, var(--primary-foreground))" }}
                  className={segClass}
                >
                  {option.icon}
                  <span>{option.label}</span>
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: template }}
          onPointerLeave={() => setHovered(-1)}
        >
          {options.map((option, i) => {
            const accessibleLabel =
              option.ariaLabel ||
              (typeof option.label === "string" ? option.label : option.value);
            return (
              <button
                key={option.value}
                ref={(node) => {
                  buttons.current[i] = node;
                }}
                type="button"
                role="radio"
                aria-label={accessibleLabel}
                aria-checked={hasSelection && i === index}
                aria-disabled={option.disabled || undefined}
                tabIndex={i === index ? 0 : -1}
                onClick={() => !option.disabled && select(option.value)}
                onKeyDown={(e) => onKeyDown(e, i)}
                onPointerEnter={() => !option.disabled && setHovered(i)}
                className="cursor-pointer rounded-[6px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
              >
                <span className="sr-only">{accessibleLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SegmentedControl;
