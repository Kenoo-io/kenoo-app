import { memo, useState, useEffect } from "react";
import WorldMap from "react-svg-worldmap";
import { getCountryCode } from "@/types/country.types";

interface OperatingCountriesMapProps {
  selectedCountries: string[];
  className?: string;
}

const OperatingCountriesMap = ({ selectedCountries, className }: OperatingCountriesMapProps) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Small delay to ensure the map has time to initialize
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Convert country names to the format expected by WorldMap
  const data = selectedCountries.map(country => ({
    country: getCountryCode(country),
    value: 1
  })).filter(item => item.country);

  return (
    <div className={`w-full aspect-[2/1] bg-background/0 rounded-xl overflow-hidden ${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
      <div className="w-full h-full flex items-center justify-center [&_svg]:!bg-transparent [&_svg]:!bg-none [&>div]:!bg-transparent [&>div]:!bg-none" style={{ pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto', background: 'none !important' }}>
          <WorldMap
            color="#e2f85c"
            backgroundColor="none"
            valueSuffix="operating"
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