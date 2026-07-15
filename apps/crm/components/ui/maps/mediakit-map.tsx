import { memo, useState, useEffect } from "react";
import WorldMap from "react-svg-worldmap";
import { getCountryCode } from "@/types/country.types";

interface OperatingCountriesMapProps {
  selectedCountries: string[];
  regionDemographics?: { label: string; percentage: number }[];
  className?: string;
}

const OperatingCountriesMap = ({ selectedCountries, regionDemographics, className }: OperatingCountriesMapProps) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Small delay to ensure the map has time to initialize
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Create a map of country names to percentages
  const countryToPercentage = new Map<string, number>();
  if (regionDemographics) {
    regionDemographics.forEach(region => {
      countryToPercentage.set(region.label, region.percentage);
    });
  }

  // Convert country names to the format expected by WorldMap
  const data = selectedCountries.map(country => {
    const percentage = countryToPercentage.get(country) || 0;
    return {
      country: getCountryCode(country),
      value: percentage
    };
  }).filter(item => item.country);

  return (
    <div className={`w-full aspect-[4/3] bg-background/0 rounded-xl overflow-hidden ${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
      <div className="w-full h-full flex items-center justify-center [&_svg]:!bg-transparent [&_svg]:!bg-none [&>div]:!bg-transparent [&>div]:!bg-none" style={{ pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto', background: 'none !important' }}>
          <WorldMap
            color="#e2f85c"
            backgroundColor="none"
            valueSuffix="%"
            size="responsive"
            data={data}
            tooltipBgColor="#FFF"
            tooltipTextColor="#000"
            frame={false}
            strokeOpacity={0}
            styleFunction={(country) => ({
              fill: data.some(d => d.country === country.countryCode) ? "#e2f85c" : "#D6D6DA",
              stroke: "white",
              strokeWidth: 0.3,
              strokeOpacity: 1,
              fillOpacity: 1,
              background: 'none'
            })}
          />
        </div>
      </div>
    </div>
  );
};

export default memo(OperatingCountriesMap); 