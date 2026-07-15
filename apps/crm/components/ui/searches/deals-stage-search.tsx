import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/app/auth/supabaseClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DealsStageSelectProps {
  value: string;
  onValueChange: (value: string, probability: number, nextStep: string, dealStageId?: string) => void;
  className?: string;
  /** @deprecated Stages always load from `deal_stages`. Kept for call-site compatibility. */
  pipelineId?: string | null;
}

interface Stage {
  id: string;
  name: string;
  probability: number;
  index_order: number;
  stage_id?: string;
  pipeline_stages?: {
    id: string;
    name: string;
    slug: string;
    is_won: boolean;
    is_lost: boolean;
  };
  is_won?: boolean;
  is_lost?: boolean;
}

export function DealsStageSelect({ value, onValueChange, className }: DealsStageSelectProps) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        setLoading(true);
        const supabase = getSupabaseClient();

        const { data: dealStages, error } = await supabase
          .from("deal_stages")
          .select("id, name, slug, is_won, is_lost, order_index, probability")
          .order("order_index", { ascending: true });

        if (error) {
          console.error("Error fetching deal stages:", error);
          setStages([]);
        } else {
          setStages(
            (dealStages || []).map((s: any) => ({
              id: s.id,
              name: s.name || "",
              probability: Number(s.probability) || 0,
              index_order: s.order_index ?? 999,
              is_won: s.is_won || false,
              is_lost: s.is_lost || false,
              pipeline_stages: {
                id: s.id,
                name: s.name || "",
                slug: s.slug || "",
                is_won: s.is_won || false,
                is_lost: s.is_lost || false,
              },
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching stages:", error);
        setStages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStages();
  }, []);

  const isWonOrLost = (s: Stage): boolean =>
    s.pipeline_stages?.is_won || s.pipeline_stages?.is_lost || s.is_won || s.is_lost || false;

  const determineNextStep = (selectedStage: Stage): string => {
    if (isWonOrLost(selectedStage)) return "Complete";
    const currentOrder = selectedStage.index_order;
    const nextStage = stages.find(stage => stage.index_order > currentOrder && !isWonOrLost(stage));
    return nextStage ? nextStage.name : "Complete";
  };

  const handleValueChange = (selectedValue: string) => {
    if (selectedValue === "none") {
      onValueChange("", 0, "", undefined);
      return;
    }
    const selectedStage = stages.find(stage => stage.name === selectedValue);
    if (selectedStage) {
      const probability = selectedStage.probability || 0;
      const nextStep = determineNextStep(selectedStage);
      onValueChange(selectedStage.name, probability, nextStep, selectedStage.id);
    } else {
      onValueChange(selectedValue, 0, "", undefined);
    }
  };

  return (
    <Select 
      value={value || undefined} 
      onValueChange={handleValueChange}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? "Loading stages..." : "Select stage"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none" className="text-muted-foreground">
          -- None --
        </SelectItem>
        {stages.map((stage) => (
          <SelectItem 
            key={stage.id} 
            value={stage.name}
          >
            {stage.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 