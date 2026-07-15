"use client";

import AddressAutoComplete, {
  AddressType,
} from "@/components/ui/address-autocomplete";
import { getCountryCode } from "@/types/country.types";
import { useEffect, useState, useRef } from "react";

export const AutocompleteComponent = ({
  setAddressNew,
  existingAddress,
  onCountryCodeChange,
  inputClassName,
  onStructuredPlaceSelected,
  placeholder,
  searchInputAppearance,
}: {
  setAddressNew: (address: string) => void;
  existingAddress: string;
  onCountryCodeChange?: (code: string) => void;
  inputClassName?: string;
  /** When set, a chosen place fills structured fields via this callback instead of storing the full formatted string in `setAddressNew`. */
  onStructuredPlaceSelected?: (address: AddressType) => void;
  placeholder?: string;
  searchInputAppearance?: "default" | "people-toolbar";
}) => {
  const [address, setAddress] = useState<AddressType>({
    address1: "",
    address2: "",
    formattedAddress: "",
    city: "",
    region: "",
    postalCode: "",
    country: "",
    lat: 0,
    lng: 0,
  });
  const [searchInput, setSearchInput] = useState(existingAddress || "");
  const isInitialRender = useRef(true);
  const prevExistingAddress = useRef(existingAddress);

  // Sync searchInput with existingAddress when it changes (e.g., after save)
  useEffect(() => {
    if (existingAddress !== prevExistingAddress.current && existingAddress) {
      setSearchInput(existingAddress);
      prevExistingAddress.current = existingAddress;
    }
  }, [existingAddress]);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    if (address.formattedAddress && address.formattedAddress !== existingAddress) {
      // When a new address is selected, store it but don't set formattedAddress
      // This keeps the input editable until save is clicked
      if (onStructuredPlaceSelected) {
        onStructuredPlaceSelected(address);
        setSearchInput("");
      } else {
        setAddressNew(address.formattedAddress);
        setSearchInput(address.formattedAddress);
      }
      if (address.country) {
        onCountryCodeChange?.(getCountryCode(address.country));
      }
      // Clear formattedAddress to prevent read-only view
      setAddress(prev => ({ ...prev, formattedAddress: "" }));
    }
  }, [address, setAddressNew, existingAddress, onCountryCodeChange, onStructuredPlaceSelected]);

  const handleAddressChange = (newAddress: AddressType) => {
    setAddress(newAddress);
  };

  const handleSearchInputChange = (input: string) => {
    setSearchInput(input);
  };

  return (
    <AddressAutoComplete
      address={address}
      setAddress={handleAddressChange}
      searchInput={searchInput}
      setSearchInput={handleSearchInputChange}
      dialogTitle="Enter Address"
      placeholder={placeholder ?? (existingAddress ? undefined : "Enter address")}
      disableInitialFetch={true}
      showInlineError={false}
      alwaysEditable={true}
      inputClassName={inputClassName}
      searchInputAppearance={searchInputAppearance}
    />
  );
};
