// src/ui/components/CurrencyCombobox.jsx
import * as React from "react";
import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/ui/components/ui/command";
import { Button } from "@/ui/components/ui/button";
import { Check, CaretUpDown, ArrowRight } from "@phosphor-icons/react";
import { getCurrencyMeta, getAllCurrencies } from "../../shared/currencies.js";
import { cn } from "@/ui/lib/utils";

/**
 * Accessible searchable Currency Combobox with Popover + Command.
 */
export function CurrencyCombobox({
  value,
  onChange,
  currencies,
  allowAutoDetect = false,
  autoDetectLabel = "Auto-detect",
  placeholder = "Search code or name...",
  triggerText,
  triggerId,
  searchInputId,
  ariaLabel = "Select currency",
  align = "start",
  disabled = false,
  hideIcon = false,
  className,
  popoverClassName,
  scrollHeight = "h-56",
  onPrefetch,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const list = useMemo(() => {
    if (currencies && Array.isArray(currencies)) return currencies;
    return getAllCurrencies({ includeCrypto: true }).sort((a, b) =>
      a.code.localeCompare(b.code)
    );
  }, [currencies]);

  const filteredCurrencies = useMemo(() => {
    if (!search) return list;
    const q = search.toLowerCase().trim();
    return list.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.symbol && c.symbol.toLowerCase().includes(q))
    );
  }, [list, search]);

  const selectedMeta = value ? getCurrencyMeta(value) : null;

  const displayLabel = useMemo(() => {
    if (triggerText) return triggerText;
    if (!value) return allowAutoDetect ? autoDetectLabel : "Select currency...";
    const sym = selectedMeta?.symbol || value;
    return `${value} (${sym})`;
  }, [triggerText, value, selectedMeta, allowAutoDetect, autoDetectLabel]);

  const handleSelect = (code) => {
    onChange?.(code);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (disabled) return;
        setOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={triggerId}
          variant="outline"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          onPointerEnter={onPrefetch}
          onFocus={onPrefetch}
          className={cn(
            "justify-between font-mono text-xs h-9 bg-background hover:bg-secondary/60 border-border/80 shadow-xs transition-[background-color,border-color,box-shadow,transform] motion-safe:active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            className
          )}
        >
          <span
            id={triggerId === "picker-to-btn" ? "selected-target-text" : undefined}
            className="truncate font-medium"
          >
            {displayLabel}
          </span>
          {!hideIcon && (
            <CaretUpDown
              weight="bold"
              className={cn(
                "ml-2 h-3.5 w-3.5 shrink-0 opacity-60 text-muted-foreground transition-transform duration-150 ease-out",
                open && "rotate-180"
              )}
              aria-hidden="true"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-[280px] p-0 border-border/80 shadow-pine-popover rounded-lg bg-popover", popoverClassName)}
        align={align}
      >
        <Command shouldFilter={false}>
          <CommandInput
            id={searchInputId}
            placeholder={placeholder}
            value={search}
            onValueChange={setSearch}
            className="search-input h-9 text-xs"
            aria-label={placeholder}
          />
          <CommandList className={cn("overflow-y-auto overflow-x-hidden p-1", scrollHeight)}>
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              No currency found.
            </CommandEmpty>

            {allowAutoDetect && (
              <CommandGroup>
                <CommandItem
                  data-currency-code=""
                  value={`auto ${autoDetectLabel}`}
                  onSelect={() => handleSelect(null)}
                  onClick={() => handleSelect(null)}
                  className="option-item text-xs py-1.5 px-2 cursor-pointer font-sans"
                >
                  <Check
                    weight="bold"
                    className={cn(
                      "mr-1.5 h-3.5 w-3.5 shrink-0 text-accent",
                      !value ? "opacity-100" : "opacity-0"
                    )}
                    aria-hidden="true"
                  />
                  <span>{autoDetectLabel}</span>
                </CommandItem>
              </CommandGroup>
            )}

            <CommandGroup heading="Currencies">
              {filteredCurrencies.map((c) => {
                const isSelected = value === c.code;
                return (
                  <CommandItem
                    key={c.code}
                    data-currency-code={c.code}
                    value={`${c.code} ${c.name} ${c.symbol}`}
                    onSelect={() => handleSelect(c.code)}
                    onClick={() => handleSelect(c.code)}
                    className="option-item text-xs font-mono flex items-center justify-between py-1.5 px-2 cursor-pointer"
                  >
                    <div className="flex items-center min-w-0 pr-2">
                      <Check
                        weight="bold"
                        className={cn(
                          "mr-1.5 h-3.5 w-3.5 shrink-0 text-accent",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                        aria-hidden="true"
                      />
                      <span className="font-semibold text-foreground shrink-0">{c.code}</span>
                      <span className="ml-2 font-sans text-xs text-muted-foreground truncate">
                        {c.name}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground shrink-0 ml-auto pl-2 text-right">
                      {c.symbol}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Type 4 Calm Single-Chip Currency Pair ([ Auto → USD ⌄ ]).
 * Wraps the source ("From") and target ("To") CurrencyCombobox triggers inside
 * a single unified 34px capsule with one shared border and a single trailing caret.
 */
export function CurrencyPairChip({
  fromValue,
  onFromChange,
  toValue,
  onToChange,
  defaultTargetCurrency = "USD",
  currencies,
  fromAriaLabel = "Source currency",
  toAriaLabel = "Target currency",
  className,
}) {
  const hasCustomOverride = Boolean(
    fromValue || (toValue && toValue !== defaultTargetCurrency)
  );

  return (
    <div
      role="group"
      className={cn(
        "inline-flex items-center h-[34px] rounded-[9px] border px-1 shrink-0 transition-colors",
        hasCustomOverride
          ? "border-accent bg-[color-mix(in_srgb,var(--accent)_7%,var(--background))]"
          : "border-border bg-background",
        className
      )}
    >
      <CurrencyCombobox
        value={fromValue || null}
        onChange={onFromChange}
        currencies={currencies}
        allowAutoDetect={true}
        autoDetectLabel="Auto-detect"
        triggerText={fromValue || "Auto"}
        ariaLabel={fromAriaLabel}
        align="start"
        hideIcon={true}
        className="h-[26px] px-2 text-xs font-mono border-0 shadow-none bg-transparent hover:bg-secondary/80 rounded-[6px] w-auto min-w-[44px]"
        popoverClassName="w-56"
        scrollHeight="h-48"
        placeholder="Search currencies…"
      />
      <ArrowRight
        weight="bold"
        className="h-3 w-3 shrink-0 text-muted-foreground/70 mx-0.5 select-none pointer-events-none"
        aria-hidden="true"
      />
      <CurrencyCombobox
        value={toValue || null}
        onChange={onToChange}
        currencies={currencies}
        allowAutoDetect={true}
        autoDetectLabel={`Default (${defaultTargetCurrency})`}
        triggerText={toValue || defaultTargetCurrency}
        ariaLabel={toAriaLabel}
        align="end"
        hideIcon={false}
        className="h-[26px] pl-2 pr-1.5 text-xs font-mono border-0 shadow-none bg-transparent hover:bg-secondary/80 rounded-[6px] w-auto min-w-[54px]"
        popoverClassName="w-56"
        scrollHeight="h-48"
        placeholder="Search currencies…"
      />
    </div>
  );
}

