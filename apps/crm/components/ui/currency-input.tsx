import React, { useState } from "react";
import { Input } from "./borderless-input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number;
  onChange: (value: string) => void;
  className?: string;
  currency?: string;
  showSymbol?: boolean;
}

export function CurrencyInput({ value, onChange, className, currency = 'USD', showSymbol = true, ...props }: CurrencyInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState('');

  // Format number as currency for display
  const formatAsCurrency = (num: number): string => {
    if (!showSymbol) {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Convert currency string back to number
  const parseCurrency = (str: string): string => {
    return str.replace(/[^\d.-]/g, '');
  };

  const handleFocus = () => {
    setIsEditing(true);
    setLocalValue(value ? parseCurrency(value.toString()) : '');
  };

  const handleBlur = () => {
    setIsEditing(false);
    onChange(localValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d.-]/g, '');
    setLocalValue(rawValue);
  };

  // Display raw value while editing, formatted value otherwise
  const displayValue = isEditing 
    ? localValue 
    : (value ? formatAsCurrency(Number(value)) : '');

  return (
    <Input
      {...props}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn(
        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        className
      )}
    />
  );
} 