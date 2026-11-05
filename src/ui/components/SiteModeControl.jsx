// src/ui/components/SiteModeControl.jsx
import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/ui/toggle-group";
import { cn } from "@/ui/lib/utils";

/**
 * Three-way segmented control for site conversion mode: Ask | Always | Never.
 */
export function SiteModeControl({
  value = "",
  onChange,
  ariaLabel = "Conversion mode",
  domain,
  size = "sm",
  disabled = false,
  className,
  id,
}) {
  const itemClasses = size === "sm"
    ? "text-xs h-7 px-3 rounded-[5px] font-medium text-muted-foreground hover:bg-background/60 hover:text-foreground data-[state=on]:text-foreground data-[state=on]:bg-background data-[state=on]:shadow-xs data-[state=on]:border data-[state=on]:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background transition-[background-color,color,box-shadow,transform] motion-safe:active:scale-[0.98]"
    : "text-xs h-8 px-3.5 rounded-[5px] font-medium text-muted-foreground hover:bg-background/60 hover:text-foreground data-[state=on]:text-foreground data-[state=on]:bg-background data-[state=on]:shadow-xs data-[state=on]:border data-[state=on]:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background transition-[background-color,color,box-shadow,transform] motion-safe:active:scale-[0.98]";

  const askLabel = domain ? `Ask on ${domain}` : "Ask before converting";
  const alwaysLabel = domain ? `Always convert ${domain}` : "Always convert";
  const neverLabel = domain ? `Never convert ${domain}` : "Never convert";

  return (
    <ToggleGroup
      id={id}
      type="single"
      value={value || ""}
      onValueChange={(val) => {
        if (!val || disabled) return;
        onChange?.(val);
      }}
      disabled={disabled}
      className={cn("bg-secondary/80 p-1 rounded-lg border border-border/70 shrink-0 gap-1", className)}
      aria-label={ariaLabel}
    >
      <ToggleGroupItem
        value="ask"
        aria-label={askLabel}
        className={itemClasses}
      >
        Ask
      </ToggleGroupItem>
      <ToggleGroupItem
        value="always"
        aria-label={alwaysLabel}
        className={itemClasses}
      >
        Always
      </ToggleGroupItem>
      <ToggleGroupItem
        value="never"
        aria-label={neverLabel}
        className={itemClasses}
      >
        Never
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
