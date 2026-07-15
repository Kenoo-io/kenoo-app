"use client";

import React from "react";
import { Dialog, DialogContent } from "./dialog";
import { Archive, X } from "lucide-react";

interface ArchiveStepPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onArchive: () => Promise<void>;
  isArchiving?: boolean;
}

export function ArchiveStepPopup({
  isOpen,
  onClose,
  onArchive,
  isArchiving = false,
}: ArchiveStepPopupProps) {
  const handleArchive = async () => {
    await onArchive();
    onClose();
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent 
        showCloseButton={false}
        className="sm:max-w-[400px] w-full bg-white/10 backdrop-blur-xl border border-white/30 shadow-2xl"
      >
        <div className="relative">
          <div className="mt-2 space-y-4">
            {/* Warning Icon and Message */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <Archive className="w-6 h-6 text-yellow-500" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Cannot Delete Step
                </h3>
                <p className="text-sm text-gray-600">
                  This step has active contact(s). Would you like to archive it instead? Archived steps won't be used for future contacts.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/30 flex items-center justify-center gap-2 hover:bg-white/20 transition-colors group shadow-lg"
                disabled={isArchiving}
              >
                <X className="w-4 h-4 text-gray-700 group-hover:text-red-600 transition-colors" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-red-600 transition-colors">Cancel</span>
              </button>
              <button
                onClick={handleArchive}
                disabled={isArchiving}
                className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/30 flex items-center justify-center gap-2 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg"
              >
                {isArchiving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium text-gray-700">Archiving...</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4 text-gray-700 group-hover:text-green-600 transition-colors" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-green-600 transition-colors">Archive</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

