"use client";

import { cn } from "@/lib/utils";

export default function Switch({
  checked = false,
  onCheckedChange,
  disabled = false,
  label,
  className,
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "ui-switch",
        checked && "is-checked",
        disabled && "is-disabled",
        className,
      )}
    >
      <span className="ui-switch-thumb" />
    </button>
  );
}
