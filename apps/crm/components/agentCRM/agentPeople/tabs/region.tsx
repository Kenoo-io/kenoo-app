import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const OperatingCountriesMap = dynamic(
  () => import("@/components/ui/maps/operating-countries-map"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-[2/1] bg-transparent rounded-xl flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-kenoo-yellow" />
      </div>
    ),
  }
);

interface RegionProps {
  formData: any;
  handleInputChange: (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectChange: (field: string) => (value: string | string[]) => void;
}

export default function Region({ formData, handleInputChange }: RegionProps) {
  const selectedCountries = formData.region ? [formData.region] : [];

  return (
    <div className="relative pointer-events-none">
      <div className="relative z-10 -mt-1 mb-2 grid grid-cols-3 gap-4 pointer-events-auto">
        <FloatingLabelInput
          label="City"
          value={formData.city || ""}
          onChange={handleInputChange("city")}
        />

        <FloatingLabelInput
          label="State"
          value={formData.state || ""}
          onChange={handleInputChange("state")}
        />

        <FloatingLabelInput
          label="Country"
          value={formData.region || ""}
          onChange={handleInputChange("region")}
        />
      </div>

      <div className="relative -mt-20 w-full aspect-[2/1] pointer-events-none">
        <OperatingCountriesMap
          selectedCountries={selectedCountries}
          className="pointer-events-none h-full w-full"
        />
      </div>
    </div>
  );
}
