"use client";

import * as React from "react";
import { LiquidToggle } from "@/ui/components/ui/liquid-toggle";

const Switch = React.forwardRef(
  ({ className, inline = true, ...props }, _ref) => (
    <LiquidToggle inline={inline} className={className} {...props} />
  )
);
Switch.displayName = "Switch";

export { Switch };
