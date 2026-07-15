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
import { collection, getDocs, getFirestore, query, where } from "firebase/firestore";
import Image from 'next/image';

interface Recipient {
  id: string;
  name: string;
  email: string;
  type: 'contact' | 'lead';
  company: string;
}

interface RecipientSelectorProps {
  value: string;
  onChange: (value: string) => void;
  selectedCompany: string;
  className?: string;
  disabled?: boolean;
}

export function RecipientSelector({ value, onChange, selectedCompany, className, disabled }: RecipientSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [recipients, setRecipients] = React.useState<Recipient[]>([]);
  const [selectedRecipient, setSelectedRecipient] = React.useState<Recipient | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [imageErrors, setImageErrors] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const fetchRecipients = async () => {
      if (!selectedCompany) {
        setRecipients([]);
        setSelectedRecipient(null);
        return;
      }

      try {
        const db = getFirestore();
        
        // Fetch contacts
        const contactsRef = collection(db, "contacts");
        const contactsQuery = query(contactsRef, where("company", "==", selectedCompany));
        const contactsSnapshot = await getDocs(contactsQuery);
        
        // Fetch leads
        const leadsRef = collection(db, "leads");
        const leadsQuery = query(leadsRef, where("company", "==", selectedCompany));
        const leadsSnapshot = await getDocs(leadsQuery);

        const contacts = contactsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: `${doc.data().firstName} ${doc.data().lastName}`.trim(),
          email: doc.data().email,
          type: 'contact' as const,
          company: doc.data().company
        }));

        const leads = leadsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: `${doc.data().firstName} ${doc.data().lastName}`.trim(),
          email: doc.data().email,
          type: 'lead' as const,
          company: doc.data().company
        }));

        const allRecipients = [...contacts, ...leads]
          .filter(recipient => 
            recipient.email && 
            (!searchTerm || 
              recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              recipient.email.toLowerCase().includes(searchTerm.toLowerCase())
            )
          )
          .sort((a, b) => a.name.localeCompare(b.name));

        setRecipients(allRecipients);
        const selected = allRecipients.find(r => r.email === value);
        setSelectedRecipient(selected || null);
      } catch (error) {
        console.error("Error fetching recipients:", error);
        setRecipients([]);
      }
    };

    fetchRecipients();
  }, [selectedCompany, value, searchTerm]);

  const handleImageError = (recipientId: string) => {
    setImageErrors(prev => ({
      ...prev,
      [recipientId]: true
    }));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || !selectedCompany}
          className={cn("w-full justify-between bg-background text-foreground", className)}
        >
          <div className="flex items-center gap-2">
            {selectedRecipient && (
              <div className="flex items-center gap-2">
                <span>{selectedRecipient.name}</span>
                <span className="text-muted-foreground">({selectedRecipient.email})</span>
              </div>
            )}
            <span>{!selectedCompany ? "Select a company first..." : value || "Select recipient..."}</span>
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
                    <span className="text-sm text-muted-foreground">{recipient.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-600 capitalize">
                      {recipient.type}
                    </span>
                    <Check
                      className={cn(
                        "ml-2 h-4 w-4",
                        value === recipient.email ? "opacity-100" : "opacity-0"
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