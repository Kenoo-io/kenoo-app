"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReactCountryFlag from "react-country-flag";
import { countryCodeMapping } from "@/types/country.types";

interface CountrySelectProps {
  value: string; // This will be a country code (e.g., "US", "GB")
  onValueChange: (value: string) => void; // Returns country code
  className?: string;
}

interface Country {
  name: string;
  countryCode: string;
}

// Convert countryCodeMapping to array and sort alphabetically
const COUNTRIES: Country[] = Object.entries(countryCodeMapping)
  .map(([name, countryCode]) => ({
    name,
    countryCode,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Create a reverse mapping: country code -> country name
const CODE_TO_NAME: Record<string, string> = {};
COUNTRIES.forEach(country => {
  CODE_TO_NAME[country.countryCode] = country.name;
});

export function CountrySelect({ value, onValueChange, className }: CountrySelectProps) {
  // value is a country code, find the country name for display
  const selectedCountry = COUNTRIES.find(c => c.countryCode === value);
  const displayName = selectedCountry?.name || value; // Fallback to code if not found

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select a country">
          {value && (
            <div className="flex items-center space-x-2">
              <div className="relative w-4 h-4 overflow-hidden rounded-full flex-shrink-0 flex items-center justify-center">
                <ReactCountryFlag
                  countryCode={value}
                  svg
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  title={`${displayName} flag`}
                />
              </div>
              <span>{displayName}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {COUNTRIES.map((country) => (
          <SelectItem 
            key={country.countryCode} 
            value={country.countryCode}
          >
            <div className="flex items-center space-x-2">
              <div className="relative w-4 h-4 overflow-hidden rounded-full flex-shrink-0 flex items-center justify-center">
                <ReactCountryFlag
                  countryCode={country.countryCode}
                  svg
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  title={`${country.name} flag`}
                />
              </div>
              <span>{country.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 