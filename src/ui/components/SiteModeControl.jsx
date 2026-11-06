// src/ui/components/SiteModeControl.jsx
import * as React from "react";
import { SegmentedControl } from "@/ui/components/ui/segmented-control";

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
  className = "",
  id,
}) {
  const options = React.useMemo(
    () => [
      {
        value: "ask",
        label: "Ask",
        ariaLabel: domain ? `Ask on ${domain}` : "Ask before converting",
        disabled,
      },
      {
        value: "always",
        label: "Always",
        ariaLabel: domain ? `Always convert ${domain}` : "Always convert",
        disabled,
      },
      {
        value: "never",
        label: "Never",
        ariaLabel: domain ? `Never convert ${domain}` : "Never convert",
        disabled,
      },
    ],
    [domain, disabled]
  );

  return (
    <SegmentedControl
      id={id}
      label={ariaLabel}
      options={options}
      value={value || ""}
      onValueChange={(val) => {
        if (!val || disabled) return;
        onChange?.(val);
      }}
      size={size}
      className={className}
    />
  );
}
