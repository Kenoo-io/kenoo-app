"use client";

import * as React from "react";
import { motion } from "framer-motion";

const NEUTRAL_400 = "#a3a3a3";
const NEUTRAL_500 = "#737373";
const KENOO_SKY = "#54a9e8";

const POSITION_TRANSITION = { type: "spring" as const, stiffness: 420, damping: 32, mass: 0.6 };
const COLOR_TRANSITION = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };

export function FloatingLabelInput({ label, value, onChange, className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <FloatingLabelControl label={label} value={value} className={className}><input {...props} value={value} onChange={onChange} className="h-12 w-full rounded-2xl border border-[#e5e5e5] bg-kenoo-white px-4 text-sm font-light leading-none text-foreground outline-none placeholder:text-transparent focus:border-[var(--kenoo-sky)] focus:outline-none focus-visible:outline-none" /></FloatingLabelControl>;
}

export function FloatingLabelTextarea({ label, value, onChange, className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return <FloatingLabelControl label={label} value={value} className={className} topAligned><textarea {...props} value={value} onChange={onChange} className="min-h-[100px] w-full resize-none rounded-2xl border border-[#e5e5e5] bg-kenoo-white px-4 pt-3 pb-4 text-sm font-light leading-5 text-foreground outline-none placeholder:text-transparent focus:border-[var(--kenoo-sky)] focus:outline-none focus-visible:outline-none" /></FloatingLabelControl>;
}

function FloatingLabelControl({ label, value, children, className, topAligned = false }: { label: string; value?: string | number | readonly string[]; children: React.ReactNode; className?: string; topAligned?: boolean }) {
  const [focused, setFocused] = React.useState(false);
  const generatedId = React.useId();
  const hasValue = String(value ?? "").length > 0;
  const floated = focused || hasValue;
  const accentColor = focused ? KENOO_SKY : floated ? NEUTRAL_500 : NEUTRAL_400;
  const child = React.Children.only(children) as React.ReactElement<{ id?: string; onFocus?: React.FocusEventHandler<HTMLElement>; onBlur?: React.FocusEventHandler<HTMLElement> }>;
  const childWithHandlers = React.cloneElement(child, { id: generatedId, onFocus: (event) => { setFocused(true); child.props.onFocus?.(event); }, onBlur: (event) => { setFocused(false); child.props.onBlur?.(event); } });

  return <div className={`relative pt-2 ${className}`}><div className="relative">{childWithHandlers}<motion.label htmlFor={generatedId} className={`pointer-events-none absolute left-3 flex origin-left items-center px-1.5 font-light ${floated ? "bg-kenoo-white" : "bg-transparent"}`} initial={false} animate={{ top: topAligned ? floated ? 0 : "1rem" : floated ? 0 : "50%", y: topAligned ? floated ? "-50%" : 0 : "-50%", scale: topAligned ? floated ? 0.78 : 1 : floated ? 0.78 : 1, color: accentColor }} transition={{ top: POSITION_TRANSITION, y: POSITION_TRANSITION, scale: POSITION_TRANSITION, color: COLOR_TRANSITION }}><span className="text-sm leading-none">{label}</span></motion.label></div></div>;
}
