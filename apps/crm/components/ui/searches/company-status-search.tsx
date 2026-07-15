import { useEffect, useState } from "react";
import { collection, getDocs, getFirestore, orderBy, query } from "firebase/firestore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CompanyStatusSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

interface Status {
  id: string;
  name: string;
}

export function CompanyStatusSelect({ value, onValueChange, className }: CompanyStatusSelectProps) {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        setLoading(true);
        const db = getFirestore();
        const statusesRef = collection(db, "typesCompanyStatus");
        const q = query(statusesRef, orderBy("name", "asc"));
        const querySnapshot = await getDocs(q);
        
        const statusesData: Status[] = [];
        querySnapshot.forEach((doc) => {
          statusesData.push({
            id: doc.id,
            name: doc.data().name,
          });
        });
        
        setStatuses(statusesData);
      } catch (error) {
        console.error("Error fetching statuses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatuses();
  }, []);

  return (
    <Select 
      value={value || undefined} 
      onValueChange={onValueChange}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? "Loading statuses..." : "Select status"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none" className="text-muted-foreground">
          -- None --
        </SelectItem>
        {statuses.map((status) => (
          <SelectItem 
            key={status.id} 
            value={status.name}
          >
            {status.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 