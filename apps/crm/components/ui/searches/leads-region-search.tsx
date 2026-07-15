import { useEffect, useState } from "react";
import { collection, getDocs, getFirestore, orderBy, query } from "firebase/firestore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";

// Helper function to convert region name to SVG filename
const getRegionFlagPath = (regionName: string): string => {
  return regionName
    .split(/[-\s]/)
    .map((word, index) => 
      index === 0 
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join('') + '.svg';
};

interface LeadRegionSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

interface Region {
  id: string;
  name: string;
}

export function LeadRegionSelect({ value, onValueChange, className }: LeadRegionSelectProps) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRegions = async () => {
      try {
        setLoading(true);
        const db = getFirestore();
        const regionsRef = collection(db, "typesLeadsRegion");
        const q = query(regionsRef, orderBy("name", "asc"));
        const querySnapshot = await getDocs(q);
        
        const regionsData: Region[] = [];
        querySnapshot.forEach((doc) => {
          regionsData.push({
            id: doc.id,
            name: doc.data().name,
          });
        });
        
        setRegions(regionsData);
      } catch (error) {
        console.error("Error fetching regions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRegions();
  }, []);

  return (
    <Select 
      value={value || undefined} 
      onValueChange={onValueChange}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? "Loading regions..." : "Select region"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none" className="text-muted-foreground">
          -- None --
        </SelectItem>
        {regions.map((region) => (
          <SelectItem 
            key={region.id} 
            value={region.name}
          >
            <div className="flex items-center gap-2">
              <div className="relative w-4 h-4 overflow-hidden rounded-full flex-shrink-0 flex items-center justify-center">
                <Image
                  src={`/images/region-flags/${getRegionFlagPath(region.name)}`}
                  alt={`${region.name} flag`}
                  width={16}
                  height={16}
                  className="object-cover"
                />
              </div>
              {region.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 