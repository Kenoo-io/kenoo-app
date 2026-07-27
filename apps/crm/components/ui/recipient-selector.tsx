"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getSupabaseClient } from "@/app/auth/supabaseClient";

interface Recipient {
  id: string;
  name: string;
  email: string;
  type: "contact" | "lead";
  company: string;
}

interface RecipientSelectorProps {
  value: string;
  onChange: (value: string) => void;
  selectedCompany: string;
  className?: string;
  disabled?: boolean;
}

export function RecipientSelector({
  value,
  onChange,
  selectedCompany,
  className,
  disabled,
}: RecipientSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [recipients, setRecipients] = React.useState<Recipient[]>([]);
  const [selectedRecipient, setSelectedRecipient] =
    React.useState<Recipient | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");

  React.useEffect(() => {
    const fetchRecipients = async () => {
      if (!selectedCompany) {
        setRecipients([]);
        setSelectedRecipient(null);
        return;
      }

      try {
        const supabase = getSupabaseClient();

        // Resolve company by name (pitch UI passes company name) or by id.
        let companyId: string | null = null;
        const byId = await supabase
          .from("companies")
          .select("id, name")
          .eq("id", selectedCompany)
          .maybeSingle();

        if (byId.data?.id) {
          companyId = byId.data.id;
        } else {
          const byName = await supabase
            .from("companies")
            .select("id, name")
            .eq("name", selectedCompany)
            .maybeSingle();
          companyId = byName.data?.id ?? null;
        }

        let query = supabase
          .from("people")
          .select("id, first_name, last_name, email, company_name, person_type")
          .not("email", "is", null);

        if (companyId) {
          query = query.eq("company_id", companyId);
        } else {
          query = query.eq("company_name", selectedCompany);
        }

        const { data, error } = await query.limit(500);
        if (error) {
          console.error("Error fetching recipients:", error);
          setRecipients([]);
          return;
        }

        const allRecipients = (data || [])
          .map(
            (row: {
              id: string;
              first_name: string | null;
              last_name: string | null;
              email: string | null;
              company_name: string | null;
              person_type: string | null;
            }) => ({
              id: row.id,
              name: `${row.first_name || ""} ${row.last_name || ""}`.trim(),
              email: row.email || "",
              type: (row.person_type === "lead" ? "lead" : "contact") as
                | "contact"
                | "lead",
              company: row.company_name || selectedCompany,
            }),
          )
          .filter(
            (recipient) =>
              recipient.email &&
              (!searchTerm ||
                recipient.name
                  .toLowerCase()
                  .includes(searchTerm.toLowerCase()) ||
                recipient.email
                  .toLowerCase()
                  .includes(searchTerm.toLowerCase())),
          )
          .sort((a, b) => a.name.localeCompare(b.name));

        setRecipients(allRecipients);
        setSelectedRecipient(
          allRecipients.find((r) => r.email === value) || null,
        );
      } catch (error) {
        console.error("Error fetching recipients:", error);
        setRecipients([]);
      }
    };

    fetchRecipients();
  }, [selectedCompany, value, searchTerm]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || !selectedCompany}
          className={cn(
            "w-full justify-between bg-background text-foreground",
            className,
          )}
        >
          <div className="flex items-center gap-2">
            {selectedRecipient && (
              <div className="flex items-center gap-2">
                <span>{selectedRecipient.name}</span>
                <span className="text-muted-foreground">
                  ({selectedRecipient.email})
                </span>
              </div>
            )}
            <span>
              {!selectedCompany
                ? "Select a company first..."
                : value || "Select recipient..."}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-background z-[10000]">
        <Command className="w-full bg-background">
          <CommandInput
            placeholder="Search recipients..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            className="bg-background"
          />
          <CommandList className="bg-background">
            <CommandEmpty>No recipient found.</CommandEmpty>
            <CommandGroup>
              {recipients.map((recipient) => (
                <CommandItem
                  key={recipient.id}
                  value={recipient.email}
                  onSelect={() => {
                    onChange(recipient.email);
                    setSelectedRecipient(recipient);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span>{recipient.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {recipient.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-600 capitalize">
                      {recipient.type}
                    </span>
                    <Check
                      className={cn(
                        "ml-2 h-4 w-4",
                        value === recipient.email ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
