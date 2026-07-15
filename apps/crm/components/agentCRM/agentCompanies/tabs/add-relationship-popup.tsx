"use client";


import { wallsToast } from "@/components/ui/walls-toast";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/agentCRM/ui/sequence-dialog";
import { Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getSupabaseClient } from "@/app/auth/supabaseClient";
import { CompanySearch } from "@/components/ui/searches/companySearch/company-search";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddRelationshipPopupProps {
  isOpen: boolean;
  onClose: () => void;
  fromCompanyId: string;
  onRelationshipAdded: () => void;
}

const formatRelationshipType = (type: string) => {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function AddRelationshipPopup({
  isOpen,
  onClose,
  fromCompanyId,
  onRelationshipAdded,
}: AddRelationshipPopupProps) {
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCompanyName, setSelectedCompanyName] = useState("");
  const [relationshipType, setRelationshipType] = useState("");
  const [isExclusive, setIsExclusive] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [relationshipTypes, setRelationshipTypes] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [isAdded, setIsAdded] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Sync internal dialog state with parent's isOpen prop
  React.useEffect(() => {
    if (isOpen) {
      setIsDialogOpen(true);
    } else {
      setIsDialogOpen(false);
    }
  }, [isOpen]);

  // Fetch relationship types from database
  useEffect(() => {
    const fetchRelationshipTypes = async () => {
      try {
        setLoadingTypes(true);
        const supabase = getSupabaseClient();
        
        const { data, error } = await supabase.rpc('get_company_relationship_types');
        
        if (error) {
          console.error('Error fetching relationship types:', error);
          // Fallback to default if function doesn't exist
          setRelationshipTypes([
            { value: "marketing_agency", label: "Marketing Agency" },
          ]);
          setRelationshipType("marketing_agency");
          return;
        }
        
        if (data && Array.isArray(data)) {
          const types = data.map((item: any) => ({
            value: item.value || item,
            label: formatRelationshipType(item.value || item),
          }));
          setRelationshipTypes(types);
          
          // Set default to first type if available
          if (types.length > 0) {
            setRelationshipType(types[0].value);
          }
        }
      } catch (error) {
        console.error('Error fetching relationship types:', error);
        // Fallback to default
        setRelationshipTypes([
          { value: "marketing_agency", label: "Marketing Agency" },
        ]);
        setRelationshipType("marketing_agency");
      } finally {
        setLoadingTypes(false);
      }
    };

    if (isOpen) {
      fetchRelationshipTypes();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!selectedCompanyName) {
      wallsToast.error("Error", "Please select a company");
      return;
    }

    try {
      setIsSubmitting(true);
      const supabase = getSupabaseClient();

      // Look up the company ID from the name
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id")
        .eq("name", selectedCompanyName)
        .single();

      if (companyError || !company) {
        throw new Error("Company not found");
      }

      const toCompanyId = company.id;

      // Check if relationship already exists
      const { data: existing } = await supabase
        .from("companies_representation")
        .select("id")
        .eq("from_company_id", fromCompanyId)
        .eq("to_company_id", toCompanyId)
        .eq("relationship_type", relationshipType)
        .maybeSingle();

      if (existing) {
        wallsToast.error("Error", "This relationship already exists");
        return;
      }

      // Insert the relationship
      const { error: insertError } = await supabase
        .from("companies_representation")
        .insert({
          from_company_id: fromCompanyId,
          to_company_id: toCompanyId,
          relationship_type: relationshipType,
          is_exclusive: isExclusive,
          is_active: isActive,
          notes: notes || null,
        });

      if (insertError) {
        throw insertError;
      }

      // Switch to animation mode
      setIsAdded(true);
      setIsSubmitting(false);

      // Wait for "Added" animation to complete
      setTimeout(() => {
        // Close the dialog (triggers Radix exit animation)
        setIsDialogOpen(false);
        
        // After Radix animation completes, notify parent and reset
        setTimeout(() => {
          resetForm();
          onRelationshipAdded();
          onClose();
        }, 300); // Match Radix's exit animation duration
      }, 2000); // Time to show "Added" state
    } catch (error: any) {
      console.error("Error adding relationship:", error);
      wallsToast.error("Error", error.message || "Failed to add relationship");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedCompanyName("");
    if (relationshipTypes.length > 0) {
      setRelationshipType(relationshipTypes[0].value);
    } else {
      setRelationshipType("marketing_agency");
    }
    setIsExclusive(false);
    setIsActive(true);
    setNotes("");
    setIsAdded(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setIsDialogOpen(false);
      setTimeout(() => {
        resetForm();
        onClose();
      }, 300); // Match Radix exit animation
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleClose}>
      <DialogContent 
        showCloseButton={true}
        className="sm:max-w-[600px] w-full bg-white/80 backdrop-blur-xl border border-white/30 shadow-2xl overflow-hidden"
      >
        <motion.div
          layout
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <AnimatePresence mode="wait">
            {isAdded ? (
              <motion.div
                key="added"
                initial={{ height: 300, opacity: 0 }}
                animate={{ height: 280, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="flex items-center justify-center py-12"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center gap-3"
                >
                  {/* Rotating circle + check icon */}
                  <div className="relative flex items-center justify-center">
                    <Check className="h-7 w-7 text-neutral-600" />
                    <motion.div
                      className="absolute inset-[-15px] rounded-full border-2 border-transparent"
                      style={{
                        background: `conic-gradient(from 0deg, transparent, #F59E0B, transparent)`,
                        WebkitMask:
                          "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                        WebkitMaskComposite: "xor",
                        maskComposite: "exclude",
                      }}
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  </div>

                  {/* "Added" text fade-in after delay */}
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9, duration: 0.4 }}
                    className="text-lg font-medium text-gray-800"
                  >
                    Relationship Added
                  </motion.span>
                </motion.div>
              </motion.div>
            ) : (
              // Main form content
              <motion.div
                key="loaded"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.99 }}
                transition={{
                  duration: 0.35,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="flex flex-col"
              >
                <div className="space-y-4">
                  {/* Company Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Company:</label>
                    <CompanySearch
                      value={selectedCompanyName}
                      onChange={setSelectedCompanyName}
                      triggerIcon="chevron"
                      className="w-full bg-neutral-100 backdrop-blur-md shadow-inner border border-neutral-200/50"
                    />
                  </div>

                  {/* Relationship Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Relationship Type:</label>
                    <Select value={relationshipType} onValueChange={setRelationshipType} disabled={loadingTypes}>
                      <SelectTrigger className="w-full bg-neutral-100 backdrop-blur-md shadow-inner border border-neutral-200/50">
                        <SelectValue placeholder={loadingTypes ? "Loading..." : "Select relationship type"} />
                      </SelectTrigger>
                      <SelectContent>
                        {relationshipTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Checkboxes */}
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="exclusive"
                        checked={isExclusive}
                        onCheckedChange={(checked) =>
                          setIsExclusive(checked === true)
                        }
                      />
                      <Label
                        htmlFor="exclusive"
                        className="text-sm font-medium cursor-pointer text-gray-700"
                      >
                        Exclusive
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="active"
                        checked={isActive}
                        onCheckedChange={(checked) => setIsActive(checked === true)}
                      />
                      <Label
                        htmlFor="active"
                        className="text-sm font-medium cursor-pointer text-gray-700"
                      >
                        Active
                      </Label>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Notes:</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional notes about this relationship..."
                      className="bg-neutral-100 backdrop-blur-md shadow-inner border border-neutral-200/50 min-h-[100px]"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-6 flex justify-end space-x-2">
                  <Button
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="bg-neutral-100 backdrop-blur-md shadow-inner border border-neutral-200/50 hover:bg-neutral-100/80 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] transition-all duration-300 text-gray-800 font-normal"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!selectedCompanyName || isSubmitting}
                    className="bg-neutral-100 backdrop-blur-md shadow-inner border border-neutral-200/50 hover:bg-neutral-100/80 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] transition-all duration-300 text-gray-800 font-normal"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Relationship"
                    )}
                  </Button>
                </DialogFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
