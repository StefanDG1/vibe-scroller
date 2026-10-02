"use client";
import { Children, isValidElement, useState, type ReactNode } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";

export function ChoiceSelect({
  value,
  defaultValue,
  onValueChange,
  children,
  disabled,
  required,
  name,
  id,
  "aria-label": ariaLabel,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  "aria-label"?: string;
}) {
  const options = Children.toArray(children)
    .filter(isValidElement)
    .map((item) => {
      const props = item.props as {
        value: string;
        children: ReactNode;
        disabled?: boolean;
        required?: boolean;
        "data-group"?: string;
      };
      return props;
    });
  const [local, setLocal] = useState(defaultValue ?? options[0]?.value ?? "");
  const selected = value ?? local;
  return (
    <>
      {name && (
        <input type="hidden" name={name} value={selected} disabled={disabled} />
      )}
      <Menu.Root>
        <Menu.Trigger
          id={id}
          disabled={disabled}
          className="choice-trigger"
          aria-label={ariaLabel}
          aria-required={required}
        >
          <span>
            {options.find((o) => o.value === selected)?.children ?? "Choose"}
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content
            className="choice-menu"
            sideOffset={6}
            collisionPadding={16}
            align="start"
          >
            <Menu.RadioGroup
              value={selected}
              onValueChange={(next) => {
                setLocal(next);
                onValueChange?.(next);
              }}
            >
              {options.map((option, index) => (
                <span key={option.value}>
                  {option["data-group"] &&
                    option["data-group"] !==
                      options[index - 1]?.["data-group"] && (
                      <Menu.Label className="choice-group">
                        {option["data-group"]}
                      </Menu.Label>
                    )}
                  <Menu.RadioItem
                    value={option.value}
                    disabled={option.disabled}
                    className="choice-option"
                  >
                    <span>{option.children}</span>
                    <Menu.ItemIndicator>
                      <Check size={17} aria-hidden="true" />
                    </Menu.ItemIndicator>
                  </Menu.RadioItem>
                </span>
              ))}
            </Menu.RadioGroup>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
    </>
  );
}
