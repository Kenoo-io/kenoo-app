"use client";


import { wallsToast } from "@/components/ui/walls-toast";
import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "./sequence-dialog";
import { Loader2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/auth/AuthContext";
import { getSupabaseClient } from "@/app/auth/supabaseClient";
import { SequenceSelect } from "./sequence-select";
import { SenderSearch } from "@/components/ui/searches/senderSearch/sender-search";

interface AddToSequencePopupProps {
  isOpen: boolean;
  onClose: () => void;
  personId: string;
  personData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
  };
  onAddToSequence: (sequenceId: string, personId: string, sequenceName?: string, senderId?: string) => Promise<void>;
}

export default function AddToSequencePopup({ 
  isOpen, 
  onClose, 
  personId,
  personData,
  onAddToSequence
}: AddToSequencePopupProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<string>("");
  const [selectedSender, setSelectedSender] = useState<string>("");
  const [isSent, setIsSent] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const supabase = getSupabaseClient();

  // Get current user ID on mount
  useEffect(() => {
    const getCurrentUserId = async () => {
      if (!user?.email) return;
      
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();
        
        if (userData?.id) {
          setCurrentUserId(userData.id);
          setSelectedSender(userData.id); // Set default sender to current user
        }
      } catch (error) {
        console.error('Error fetching current user ID:', error);
      }
    };

    if (isOpen) {
      getCurrentUserId();
    }
  }, [isOpen, user?.email, supabase]);

  // Sync internal dialog state with parent's isOpen prop
  React.useEffect(() => {
    if (isOpen) {
      setIsDialogOpen(true);
    } else {
      setIsDialogOpen(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!selectedSequence) {
      wallsToast.error("No Sequence Selected", "Please select a sequence to continue");
      return;
    }

    if (!selectedSender) {
      wallsToast.error("No Sender Selected", "Please select a sender to continue");
      return;
    }

    setIsSubmitting(true);

    try {
      // Fetch sequence name for the toast
      let sequenceName: string | undefined;
      if (selectedSequence) {
        const { data: sequenceData } = await supabase
          .from('sequences')
          .select('name')
          .eq('id', selectedSequence)
          .single();
        sequenceName = sequenceData?.name;
      }

      // Check if person is already in this sequence
      const { data: existingRecord, error: checkError } = await supabase
        .from('sequence_people')
        .select('id')
        .eq('person_id', personId)
        .eq('sequence_id', selectedSequence)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing record:", checkError);
        wallsToast.error("Error", "Failed to check if person is already in sequence");
        setIsSubmitting(false);
        return;
      }

      if (existingRecord) {
        wallsToast.error("Already in Sequence", "This person is already in this sequence");
        setIsSubmitting(false);
        return;
      }

      // Use the selected sender (required)
      const senderId = selectedSender;

      if (!senderId) {
        wallsToast.error("Error", "Please select a sender");
        setIsSubmitting(false);
        return;
      }

      // Insert the person into the sequence with sender_id
      const { error: insertError } = await supabase
        .from('sequence_people')
        .insert({
          person_id: personId,
          sequence_id: selectedSequence,
          status: 'active',
          is_replied: false,
          sender_id: senderId,
        });

      if (insertError) {
        console.error("Error adding person to sequence:", insertError);
        
        // Check if it's a unique constraint violation
        if (insertError.code === '23505') {
          wallsToast.error("Already in Sequence", "This person is already in this sequence");
        } else {
          wallsToast.error("Error", "Failed to add person to sequence");
        }
        setIsSubmitting(false);
        return;
      }

      // Call the parent handler for any additional logic (like showing toast)
      await onAddToSequence(
        selectedSequence, 
        personId, 
        sequenceName,
        senderId
      );

      // Switch to animation mode
      setIsSent(true);
      setIsSubmitting(false);

      // Wait for "Sent" animation to complete
      setTimeout(() => {
        // Close the dialog (triggers Radix exit animation)
        setIsDialogOpen(false);
        
        // After Radix animation completes, notify parent and reset
        setTimeout(() => {
          resetForm();
          onClose();
        }, 300); // Match Radix's exit animation duration
      }, 2000); // Time to show "Sent" state
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedSequence("");
    setSelectedSender(currentUserId);
    setIsSent(false);
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

  const personName = personData.firstName || personData.lastName 
    ? `${personData.firstName || ''} ${personData.lastName || ''}`.trim()
    : personData.email || 'Contact';

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
            {isSent ? (
              <motion.div
                key="sending"
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
                  {/* Rotating circle + send icon */}
                  <div className="relative flex items-center justify-center">
                    <Send className="h-7 w-7 text-neutral-600" />
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

                  {/* "Sent" text fade-in after delay */}
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9, duration: 0.4 }}
                    className="text-lg font-medium text-gray-800"
                  >
                    Added to Sequence
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Sequence:</label>
                    <SequenceSelect
                      value={selectedSequence}
                      onValueChange={setSelectedSequence}
                      personId={personId}
                      className="w-full bg-neutral-100 backdrop-blur-md shadow-inner border border-neutral-200/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Sender:</label>
                    <SenderSearch
                      value={selectedSender}
                      onValueChange={setSelectedSender}
                      className="w-full bg-neutral-100 backdrop-blur-md shadow-inner border border-neutral-200/50"
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
                    disabled={!selectedSequence || isSubmitting}
                    className="bg-neutral-100 backdrop-blur-md shadow-inner border border-neutral-200/50 hover:bg-neutral-100/80 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] transition-all duration-300 text-gray-800 font-normal"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add contact"
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
