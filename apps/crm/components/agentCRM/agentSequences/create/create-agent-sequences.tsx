"use client";


import { wallsToast } from "@/components/ui/walls-toast";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/auth/AuthContext";
import { createClient } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { Loader2, X, Save, Expand, Minimize, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet-view";
import General from "../tabs/general";
import Steps, { StepsRef } from "../tabs/steps";
import Schedule from "../tabs/schedule";
import { UnsavedChangesPopup } from "../../ui/unsaved-changes-popup";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface CreateAgentSequencesProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when a sequence is successfully created or saved. Use to refresh the sequences list. */
  onSuccess?: () => void;
}

export default function CreateAgentSequences({ isOpen, onClose, onSuccess }: CreateAgentSequencesProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('general');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'draft',
    stop_on_reply: true,
    daily_limit: null as number | null,
    is_campaign: false,
    use_case: 'general',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasTemplateChanges, setHasTemplateChanges] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  const [stepsRemountKey, setStepsRemountKey] = useState(0);
  const stepsRef = useRef<StepsRef>(null);
  const [sequenceId, setSequenceId] = useState<string | null>(null);
  const [isSequenceCreated, setIsSequenceCreated] = useState(false);
  const [sequenceOwnerId, setSequenceOwnerId] = useState<string | null>(null);

  const tabs = [
    { id: 'general', name: 'General' },
    { id: 'steps', name: 'Steps' },
    { id: 'schedule', name: 'Schedule' },
  ];

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSelectChange = (field: string) => (value: string | boolean | number | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // Create sequence when user starts editing (or on first save)
  const createSequence = async () => {
    if (!user) {
      wallsToast.error("Error", "You must be logged in to create a sequence");
      return null;
    }

    if (!formData.name.trim()) {
      wallsToast.error("Error", "Please enter a sequence name");
      return null;
    }

    try {
      // Get user data from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
        wallsToast.error("Error", "User not found");
        return null;
      }

      const { data: newSequence, error } = await supabase
        .from('sequences')
        .insert({
          name: formData.name.trim(),
          description: formData.description || null,
          status: 'draft',
          stop_on_reply: formData.stop_on_reply ?? true,
          daily_limit: formData.daily_limit || null,
          is_campaign: true,
          sequence_owner: userData.id,
          use_case: formData.use_case || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      // Store the owner ID for display
      setSequenceOwnerId(userData.id);

      return newSequence.id;
    } catch (error) {
      console.error("Error creating sequence:", error);
      wallsToast.error("Error", "Failed to create sequence");
      return null;
    }
  };

  const handleSave = async () => {
    if (!user) {
      wallsToast.error("Error", "You must be logged in to create a sequence");
      return;
    }

    try {
      setIsSubmitting(true);
      
      let currentSequenceId = sequenceId;

      // Create sequence if it doesn't exist yet
      if (!currentSequenceId) {
        currentSequenceId = await createSequence();
        if (!currentSequenceId) {
          setIsSubmitting(false);
          return;
        }
        setSequenceId(currentSequenceId);
        setIsSequenceCreated(true);
        onSuccess?.();
      } else {
        // Update existing sequence
        const updatedData: any = {
          name: formData.name || null,
          description: formData.description || null,
          status: 'draft',
          stop_on_reply: formData.stop_on_reply ?? true,
          daily_limit: formData.daily_limit || null,
          is_campaign: true,
          use_case: formData.use_case || null,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('sequences')
          .update(updatedData)
          .eq('id', currentSequenceId);

        if (error) {
          throw error;
        }
        onSuccess?.();
      }

      // Save email templates if there are changes
      if (hasTemplateChanges && stepsRef.current && currentSequenceId) {
        await stepsRef.current.saveTemplates();
      }

      wallsToast.success("Success", isSequenceCreated ? "Sequence created successfully" : "Sequence updated successfully");

      // Reset change tracking
      setHasTemplateChanges(false);
      setHasChanges(false);
      
      if (pendingClose) {
        onClose();
        setPendingClose(false);
        setShowUnsavedChangesDialog(false);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Error saving sequence:", error);
      wallsToast.error("Error", "Failed to save sequence");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    // Check if there are unsaved changes
    if (hasChanges) {
      setShowUnsavedChangesDialog(true);
      setPendingClose(true);
    } else {
      onClose();
    }
  };

  const handleRevertChanges = () => {
    // Reset form data to initial values
    setFormData({
      name: '',
      description: '',
      status: 'draft',
      stop_on_reply: true,
      daily_limit: null,
      is_campaign: false,
      use_case: 'general',
    });
    setHasTemplateChanges(false);
    setHasChanges(false);
    
    // Force remount of Steps component to reset template editors
    setStepsRemountKey(prev => prev + 1);
    
    if (pendingClose) {
      onClose();
      setPendingClose(false);
    }
  };

  // Check for changes
  useEffect(() => {
    const hasBasicInfoChanges = 
      formData.name !== '' ||
      formData.description !== '' ||
      formData.stop_on_reply !== true ||
      formData.daily_limit !== null ||
      (formData.use_case || 'general') !== 'general';

    setHasChanges(hasBasicInfoChanges || hasTemplateChanges);
  }, [formData, hasTemplateChanges]);

  const handleSheetClose = (open: boolean) => {
    if (!open) {
      // Check if there are unsaved changes
      if (hasChanges) {
        setShowUnsavedChangesDialog(true);
        setPendingClose(true);
      } else {
        onClose();
      }
    }
  };

  // Auto-create sequence when switching to steps tab (if not created yet)
  useEffect(() => {
    const autoCreateSequence = async () => {
      if (activeTab === 'steps' && !sequenceId && formData.name.trim()) {
        const newSequenceId = await createSequence();
        if (newSequenceId) {
          setSequenceId(newSequenceId);
          setIsSequenceCreated(true);
        }
      }
    };

    autoCreateSequence();
  }, [activeTab, sequenceId, formData.name]);

  return (
    <Sheet open={isOpen} onOpenChange={handleSheetClose}>
      <SheetContent 
        side="right" 
        className={cn("overflow-y-auto p-0 [&>button]:hidden shadow-2xl rounded-none bg-gray-50 border border-neutral-200/80", isMaximized ? "w-full" : "w-3/4")}
        style={{
          transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        }}
      >
        <motion.div 
          className="flex flex-col h-full"
          layout
          transition={{
            duration: 0.3,
            ease: "easeInOut"
          }}
        >
          <div className="flex-1 w-full px-6 pt-6 pb-8">
        <div className="mb-4 flex items-center justify-between relative z-[2]">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <div className="flex items-center gap-4 min-w-0">
                <h1
                  className="text-5xl font-black text-foreground leading-tight mt-1 min-w-0 truncate"
                  title={formData.name || "New Sequence"}
                >
                  {formData.name || "New Sequence"}
                </h1>
                <div className="flex-1 min-w-8 shrink border-t border-black h-[1px]" />
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="relative group">
                    <button
                      onClick={() => setIsMaximized(!isMaximized)}
                      disabled={isSubmitting}
                      className="relative z-10 p-3 bg-neutral-100/80 backdrop-blur-md rounded-full shadow-inner border border-neutral-200/50 transition-all duration-300 cursor-pointer hover:bg-neutral-100 hover:shadow-inner hover:border-neutral-200 hover:scale-95 hover:shadow-[inset_0_4px_8px_rgba(0,0,0,0.15)] disabled:opacity-50"
                    >
                      {isMaximized ? (
                        <Minimize className="h-[18px] w-[18px] text-black" strokeWidth={1.5} />
                      ) : (
                        <Expand className="h-[18px] w-[18px] text-black" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                  <div className="relative group">
                    <button
                      onClick={handleCloseClick}
                      disabled={isSubmitting}
                      className="relative z-10 p-3 bg-neutral-100/80 backdrop-blur-md rounded-full shadow-inner border border-neutral-200/50 transition-all duration-300 cursor-pointer hover:bg-neutral-100 hover:shadow-inner hover:border-neutral-200 hover:scale-95 hover:shadow-[inset_0_4px_8px_rgba(0,0,0,0.15)] disabled:opacity-50"
                    >
                      <X className="h-[18px] w-[18px] text-black" strokeWidth={1.5} />
                    </button>
                  </div>

                  {formData.name.trim() && !sequenceId && (
                    <div className="relative group animate-in fade-in slide-in-from-left-2 duration-200">
                      <button
                        onClick={async () => {
                          setIsSubmitting(true);
                          // Auto-create sequence and navigate to steps
                          const newSequenceId = await createSequence();
                          if (newSequenceId) {
                            setSequenceId(newSequenceId);
                            setIsSequenceCreated(true);
                            setActiveTab('steps');
                          }
                          setIsSubmitting(false);
                        }}
                        disabled={isSubmitting}
                        className="relative z-10 p-3 bg-neutral-100/80 backdrop-blur-md rounded-full shadow-inner border border-neutral-200/50 transition-all duration-300 cursor-pointer hover:bg-neutral-100 hover:shadow-inner hover:border-neutral-200 hover:scale-95 hover:shadow-[inset_0_4px_8px_rgba(0,0,0,0.15)] disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-[18px] w-[18px] text-black animate-spin" strokeWidth={1.5} />
                        ) : (
                          <ArrowRight className="h-[18px] w-[18px] text-black" strokeWidth={1.5} />
                        )}
                      </button>
                    </div>
                  )}
                  {hasChanges && sequenceId && (
                    <div className="relative group animate-in fade-in slide-in-from-left-2 duration-200">
                      <button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="relative z-10 p-3 bg-neutral-100/80 backdrop-blur-md rounded-full shadow-inner border border-neutral-200/50 transition-all duration-300 cursor-pointer hover:bg-neutral-100 hover:shadow-inner hover:border-neutral-200 hover:scale-95 hover:shadow-[inset_0_4px_8px_rgba(0,0,0,0.15)] disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-[18px] w-[18px] text-black animate-spin" strokeWidth={1.5} />
                        ) : (
                          <Save className="h-[18px] w-[18px] text-black" strokeWidth={1.5} />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs underneath description */}
        <div className="flex space-x-1 items-center -ml-2 mt-8">
                {tabs.map((tab) => (
                  <Button 
                    key={tab.id}
                    variant="ghost"
                    className={cn(
                      "relative px-4 py-2 group hover:bg-transparent font-light flex items-center gap-2",
                      activeTab === tab.id 
                        ? "text-neutral-700" 
                        : "text-neutral-700 hover:text-neutral-700"
                    )}
                    onClick={async () => {
                      // If clicking steps tab and sequence doesn't exist yet, create it first
                      if (tab.id === 'steps' && !sequenceId && formData.name.trim()) {
                        setIsSubmitting(true);
                        const newSequenceId = await createSequence();
                        if (newSequenceId) {
                          setSequenceId(newSequenceId);
                          setIsSequenceCreated(true);
                        }
                        setIsSubmitting(false);
                      }
                      setActiveTab(tab.id);
                    }}
                    disabled={(!sequenceId && tab.id === 'schedule') || (tab.id === 'steps' && !formData.name.trim())}
                  >
                    <span>{tab.name}</span>
                    <div className={cn(
                      "absolute bottom-0 left-0 h-0.5 bg-neutral-700 transition-all duration-300",
                      activeTab === tab.id ? "w-4/5 mx-auto right-0" : "w-0 group-hover:w-4/5 group-hover:mx-auto group-hover:right-0"
                    )} />
                  </Button>
                ))}
              </div>

        <div className="space-y-8 relative z-[2]">
          <div className="mt-6">
            {activeTab === 'general' && (
              <General
                formData={formData}
                handleInputChange={handleInputChange}
                handleSelectChange={handleSelectChange}
                sequenceId={sequenceId}
                sequenceOwnerId={sequenceOwnerId}
              />
            )}
            {activeTab === 'steps' && sequenceId && (
              <Steps
                key={stepsRemountKey}
                ref={stepsRef}
                sequenceId={sequenceId}
                onTemplateChange={(hasChanges) => setHasTemplateChanges(hasChanges)}
              />
            )}
            {activeTab === 'steps' && !sequenceId && (
              <div className="bg-gray-50 rounded-[30px] p-6">
                <div className="text-center py-8">
                  <p className="text-sm font-light text-muted-foreground">
                    Please enter a sequence name and save to start adding steps.
                  </p>
                </div>
              </div>
            )}
            {activeTab === 'schedule' && sequenceId && (
              <Schedule
                sequenceId={sequenceId}
                formData={formData}
                handleSelectChange={handleSelectChange}
              />
            )}
            {activeTab === 'schedule' && !sequenceId && (
              <div className="bg-gray-50 rounded-[30px] p-6">
                <div className="text-center py-8">
                  <p className="text-sm font-light text-muted-foreground">
                    Please create the sequence first to configure schedule.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
          </div>
        </motion.div>
      </SheetContent>
      <Toaster />
      
      {/* Unsaved Changes Dialog */}
      <UnsavedChangesPopup
        isOpen={showUnsavedChangesDialog}
        onClose={() => {
          setShowUnsavedChangesDialog(false);
          setPendingClose(false);
        }}
        onSave={handleSave}
        onRevert={handleRevertChanges}
        isSaving={isSubmitting}
      />
    </Sheet>
  );
}

