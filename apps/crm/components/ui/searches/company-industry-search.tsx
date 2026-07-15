import { useEffect, useState } from "react";
import { collection, getDocs, getFirestore, orderBy, query } from "firebase/firestore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CompanyIndustrySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

interface Industry {
  id: string;
  name: string;
}

export function CompanyIndustrySelect({ value, onValueChange, className }: CompanyIndustrySelectProps) {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        setLoading(true);
        const db = getFirestore();
        const industriesRef = collection(db, "typesCompanyIndustry");
        const q = query(industriesRef, orderBy("name", "asc"));
        const querySnapshot = await getDocs(q);
        
        const industriesData: Industry[] = [];
        querySnapshot.forEach((doc) => {
          industriesData.push({
            id: doc.id,
            name: doc.data().name,
          });
        });
        
        setIndustries(industriesData);
      } catch (error) {
        console.error("Error fetching industries:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchIndustries();
  }, []);

  return (
    <Select 
      value={value || undefined} 
      onValueChange={onValueChange}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? "Loading industries..." : "Select industry"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none" className="text-muted-foreground">
          -- None --
        </SelectItem>
        {industries.map((industry) => (
          <SelectItem 
            key={industry.id} 
            value={industry.name}
          >
            {industry.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 