"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { kenooColors } from "@walls/ui/colors";
import { cn } from "@/lib/utils";

const NEUTRAL_200 = "#e5e5e5";
const NEUTRAL_400 = "#a3a3a3";
const NEUTRAL_500 = "#737373";
const KENOO_SKY = kenooColors.sky.DEFAULT;

const POSITION_TRANSITION = {
  type: "spring" as const,
  stiffness: 420,
  damping: 32,
  mass: 0.6,
};

const COLOR_TRANSITION = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as const,
};

const LABEL_TRANSITION = {
  top: POSITION_TRANSITION,
  y: POSITION_TRANSITION,
  scale: POSITION_TRANSITION,
  color: COLOR_TRANSITION,
};

function accentColorFor(active: boolean, floated: boolean) {
  if (active) return KENOO_SKY;
  return floated ? NEUTRAL_500 : NEUTRAL_400;
}

/**
 * Radix triggers keep focus inside a portalled popover while open, so
 * `:focus-within` on the shell is not enough to keep the label floated.
 */
function useOpenWithin(ref: React.RefObject<HTMLElement | null>) {
  const [openWithin, setOpenWithin] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const read = () =>
      setOpenWithin(Boolean(node.querySelector('[data-state="open"]')));

    read();
    const observer = new MutationObserver(read);
    observer.observe(node, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });

    return () => observer.disconnect();
  }, [ref]);

  return openWithin;
}

type FloatingLabelChromeProps = {
  label: string;
  floated: boolean;
  active: boolean;
  disabled?: boolean;
  htmlFor?: string;
  /** Distance from the top of the shell to the label's resting centre, in px. */
  restingTop?: number | string;
  offsetLeft?: boolean;
  labelBgClassName?: string;
};

function FloatingLabelChrome({
  label,
  floated,
  active,
  disabled,
  htmlFor,
  restingTop = "50%",
  offsetLeft,
  labelBgClassName = "bg-kenoo-white",
}: FloatingLabelChromeProps) {
  return (
    <motion.label
      htmlFor={htmlFor}
      className={cn(
        "pointer-events-none absolute z-10 flex origin-left items-center px-1.5 font-light",
        offsetLeft ? "left-10" : "left-3",
        floated ? labelBgClassName : "bg-transparent",
        disabled && "opacity-50",
      )}
      initial={false}
      animate={{
        top: floated ? 0 : restingTop,
        y: "-50%",
        scale: floated ? 0.78 : 1,
        color: accentColorFor(active, floated),
      }}
      transition={LABEL_TRANSITION}
    >
      <span className="whitespace-nowrap text-sm leading-none">{label}</span>
    </motion.label>
  );
}

/* -------------------------------------------------------------------------- */
/*                            FloatingLabelInput                              */
/* -------------------------------------------------------------------------- */

export type FloatingLabelInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  | "placeholder"
  | "onAnimationStart"
  | "onDragStart"
  | "onDrag"
  | "onDragEnd"
> & {
  label: string;
  containerClassName?: string;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  /** Background the floated label paints over so it cuts the border cleanly. */
  labelBgClassName?: string;
  /** Rendered under the field, styled as an error message. */
  error?: string | null;
  /**
   * Keep the label raised even when empty. Needed for `date` / `time` /
   * `datetime-local`, whose native placeholder text can't be hidden.
   */
  alwaysFloated?: boolean;
};

export const FloatingLabelInput = React.forwardRef<
  HTMLInputElement,
  FloatingLabelInputProps
>(function FloatingLabelInput(
  {
    label,
    className,
    containerClassName,
    value,
    defaultValue,
    onFocus,
    onBlur,
    id,
    type,
    disabled,
    startAdornment,
    endAdornment,
    labelBgClassName,
    error,
    alwaysFloated,
    ...props
  },
  ref,
) {
  const [focused, setFocused] = React.useState(false);
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  const resolvedValue =
    value !== undefined ? value : defaultValue !== undefined ? defaultValue : "";
  const hasValue = String(resolvedValue ?? "").length > 0;
  const floated = focused || hasValue || Boolean(alwaysFloated);

  return (
    <div className={cn("pt-2", containerClassName)}>
      <div className="relative">
        {startAdornment ? (
          <div className="pointer-events-none absolute left-4 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2 text-neutral-500">
            {startAdornment}
          </div>
        ) : null}
        <motion.input
          ref={ref}
          id={inputId}
          type={type}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          aria-label={label}
          className={cn(
            "h-12 w-full rounded-2xl border bg-kenoo-white text-sm font-light leading-none text-neutral-900 outline-none placeholder:text-transparent focus:outline-none focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
            startAdornment ? "pl-12 pr-4" : endAdornment ? "pl-4 pr-10" : "px-4",
            startAdornment && endAdornment && "pl-12 pr-10",
            type === "number" &&
              "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            className,
          )}
          initial={false}
          animate={{
            borderColor: error
              ? "#ef4444"
              : focused
                ? KENOO_SKY
                : NEUTRAL_200,
          }}
          transition={COLOR_TRANSITION}
          {...props}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
        <FloatingLabelChrome
          label={label}
          htmlFor={inputId}
          floated={floated}
          active={focused}
          disabled={disabled}
          offsetLeft={Boolean(startAdornment)}
          labelBgClassName={labelBgClassName}
        />
        {endAdornment ? (
          <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 items-center">
            {endAdornment}
          </div>
        ) : null}
      </div>
      {error ? <p className="px-4 pt-1 text-xs text-red-500">{error}</p> : null}
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/*                           FloatingLabelTextarea                            */
/* -------------------------------------------------------------------------- */

export type FloatingLabelTextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  | "placeholder"
  | "onAnimationStart"
  | "onDragStart"
  | "onDrag"
  | "onDragEnd"
> & {
  label: string;
  containerClassName?: string;
  labelBgClassName?: string;
  /** Grow with content instead of scrolling. */
  autoResize?: boolean;
  minHeight?: number;
};

export const FloatingLabelTextarea = React.forwardRef<
  HTMLTextAreaElement,
  FloatingLabelTextareaProps
>(function FloatingLabelTextarea(
  {
    label,
    className,
    containerClassName,
    labelBgClassName,
    value,
    defaultValue,
    onFocus,
    onBlur,
    onChange,
    id,
    disabled,
    autoResize = true,
    minHeight = 96,
    rows,
    ...props
  },
  ref,
) {
  const [focused, setFocused] = React.useState(false);
  const generatedId = React.useId();
  const textareaId = id ?? generatedId;
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

  const setRefs = (node: HTMLTextAreaElement | null) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const resize = React.useCallback(
    (el: HTMLTextAreaElement | null) => {
      if (!el || !autoResize) return;
      el.style.height = "auto";
      el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
    },
    [autoResize, minHeight],
  );

  React.useEffect(() => {
    resize(innerRef.current);
  }, [resize, value]);

  const resolvedValue =
    value !== undefined ? value : defaultValue !== undefined ? defaultValue : "";
  const hasValue = String(resolvedValue ?? "").length > 0;
  const floated = focused || hasValue;

  return (
    <div className={cn("pt-2", containerClassName)}>
      <div className="relative">
        <motion.textarea
          ref={setRefs}
          id={textareaId}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          rows={rows}
          aria-label={label}
          style={{ minHeight }}
          className={cn(
            "w-full resize-none overflow-hidden rounded-2xl border bg-kenoo-white px-4 py-3.5 text-sm font-light leading-relaxed text-neutral-900 outline-none placeholder:text-transparent focus:outline-none focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          initial={false}
          animate={{ borderColor: focused ? KENOO_SKY : NEUTRAL_200 }}
          transition={COLOR_TRANSITION}
          {...props}
          onChange={(event) => {
            onChange?.(event);
            resize(event.currentTarget);
          }}
          onFocus={(event) => {
            setFocused(true);
            resize(event.currentTarget);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
        <FloatingLabelChrome
          label={label}
          htmlFor={textareaId}
          floated={floated}
          active={focused}
          disabled={disabled}
          restingTop={24}
          labelBgClassName={labelBgClassName}
        />
      </div>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/*                            FloatingLabelField                              */
/* -------------------------------------------------------------------------- */

/**
 * Drop-in `className` for a shadcn `SelectTrigger` (or any similar control)
 * placed inside `FloatingLabelField`. Hides the control's own placeholder so
 * the floating label is the only resting hint.
 */
export const floatingSelectTriggerClass =
  "h-12 w-full border-0 bg-transparent px-0 py-0 text-sm font-light text-neutral-900 shadow-none outline-none hover:bg-transparent focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 [&>span]:truncate [&[data-placeholder]>div]:text-transparent [&[data-placeholder]>span]:text-transparent";

/**
 * Same as above, for controls that render their own trigger (the `searches/*`
 * comboboxes). Pass `placeholder=""` alongside it so the floating label is the
 * only resting hint.
 */
export const floatingControlClass =
  "h-12 min-h-12 w-full border-0 bg-transparent px-0 py-0 text-sm font-light shadow-none outline-none hover:bg-transparent focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0";

export type FloatingLabelFieldProps = {
  label: string;
  /** Whether the wrapped control currently holds a value. */
  hasValue?: boolean;
  /** Force the accent/floated state (e.g. a controlled popover being open). */
  active?: boolean;
  disabled?: boolean;
  className?: string;
  containerClassName?: string;
  labelBgClassName?: string;
  /** Align the control to the top instead of centring it (multi-line controls). */
  alignTop?: boolean;
  error?: string | null;
  children: React.ReactNode;
};

/**
 * Wraps an arbitrary control (select, combobox, custom search) in the same
 * outlined container + floating label used by `FloatingLabelInput`.
 */
export function FloatingLabelField({
  label,
  hasValue = false,
  active,
  disabled,
  className,
  containerClassName,
  labelBgClassName,
  alignTop = false,
  error,
  children,
}: FloatingLabelFieldProps) {
  const shellRef = React.useRef<HTMLDivElement | null>(null);
  const [focusWithin, setFocusWithin] = React.useState(false);
  const openWithin = useOpenWithin(shellRef);

  const isActive = Boolean(active ?? (focusWithin || openWithin));
  const floated = isActive || hasValue;

  return (
    <div className={cn("pt-2", containerClassName)}>
      <div
        className="relative"
        onFocusCapture={() => setFocusWithin(true)}
        onBlurCapture={() => setFocusWithin(false)}
      >
        <motion.div
          ref={shellRef}
          className={cn(
            "flex w-full rounded-2xl border bg-kenoo-white px-4",
            alignTop ? "items-start py-2" : "min-h-12 items-center",
            disabled && "cursor-not-allowed opacity-50",
            className,
          )}
          initial={false}
          animate={{
            borderColor: error ? "#ef4444" : isActive ? KENOO_SKY : NEUTRAL_200,
          }}
          transition={COLOR_TRANSITION}
        >
          <div className="min-w-0 flex-1">{children}</div>
        </motion.div>
        <FloatingLabelChrome
          label={label}
          floated={floated}
          active={isActive}
          disabled={disabled}
          restingTop={alignTop ? 24 : "50%"}
          labelBgClassName={labelBgClassName}
        />
      </div>
      {error ? <p className="px-4 pt-1 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            FloatingLabelValue                              */
/* -------------------------------------------------------------------------- */

export type FloatingLabelValueProps = {
  label: string;
  value?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  labelBgClassName?: string;
};

/** Read-only counterpart, for system/metadata fields that can't be edited. */
export function FloatingLabelValue({
  label,
  value,
  className,
  containerClassName,
  labelBgClassName,
}: FloatingLabelValueProps) {
  const hasValue =
    value !== null && value !== undefined && value !== "" && value !== false;

  return (
    <div className={cn("pt-2", containerClassName)}>
      <div className="relative">
        <div
          className={cn(
            "flex min-h-12 w-full items-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/60 px-4 text-sm font-light text-neutral-600",
            className,
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            {hasValue ? value : null}
          </span>
        </div>
        <FloatingLabelChrome
          label={label}
          floated
          active={false}
          labelBgClassName={labelBgClassName ?? "bg-kenoo-white"}
        />
      </div>
    </div>
  );
}
