import {
  FloatingLabelField,
  FloatingLabelInput,
  floatingControlClass,
} from "@/components/ui/floating-label-input";
import { ContactSearch } from "@/components/ui/searches/contactSearch/contact-search";

interface VendorInformationProps {
  formData: any;
  handleInputChange: (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleContactChange: (value: string) => void;
}

export default function VendorInformation({ 
  formData, 
  handleInputChange,
  handleContactChange
}: VendorInformationProps) {
  return (
    <div className="space-y-6">
      {/* Vendor Information Container */}
      <div className="bg-kenoo-white rounded-[30px] p-6">
        <div className="flex items-center mb-6">
          <h2 className="text-black font-black text-4xl">VENDOR INFORMATION</h2>
          <div className="flex-1 border-t border-black h-[1px] mx-4" />
        </div>
        <div className="grid grid-cols-2 gap-4 items-start">
          {/* Left Column */}
          <div className="space-y-4">
            <FloatingLabelInput
              label="Legal Name"
              value={formData.vendorCompanyName || ''}
              onChange={handleInputChange("vendorCompanyName")}
            />
            <FloatingLabelInput
              label="Country"
              value={formData.vendorCountry || ''}
              onChange={handleInputChange("vendorCountry")}
            />
            <FloatingLabelInput
              label="State"
              value={formData.vendorState || ''}
              onChange={handleInputChange("vendorState")}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <FloatingLabelInput
              label="City"
              value={formData.vendorCity || ''}
              onChange={handleInputChange("vendorCity")}
            />
            <FloatingLabelInput
              label="Street Address"
              value={formData.vendorStreetAddress || ''}
              onChange={handleInputChange("vendorStreetAddress")}
            />
            <FloatingLabelInput
              label="ZIP/Postal Code"
              value={formData.vendorZipCode || ''}
              onChange={handleInputChange("vendorZipCode")}
            />
            <FloatingLabelField
              label="Contact"
              hasValue={Boolean(formData.vendorContact)}
            >
              <ContactSearch
                value={formData.vendorContact}
                onChange={handleContactChange}
                placeholder=""
                className={floatingControlClass}
              />
            </FloatingLabelField>
          </div>
        </div>
      </div>
    </div>
  );
}
