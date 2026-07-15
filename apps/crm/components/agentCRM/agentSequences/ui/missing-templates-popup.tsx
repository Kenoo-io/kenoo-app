"use client";

import React from "react";
import { Dialog, DialogContent } from "./dialog";
import { AlertCircle, X, Edit } from "lucide-react";

interface MissingTemplatesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onEditSequence: () => void;
  sequenceName?: string | null;
}

export function MissingTemplatesPopup({
  isOpen,
  onClose,
  onEditSequence,
  sequenceName,
}: MissingTemplatesPopupProps) {
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
                <AlertCircle className="w-6 h-6 text-yellow-500" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Missing Email Templates
                </h3>
                <p className="text-sm text-gray-600">
                  All email steps must have message templates before you can activate a sequence.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/30 flex items-center justify-center gap-2 hover:bg-white/20 transition-colors group shadow-lg"
              >
                <X className="w-4 h-4 text-gray-700 group-hover:text-red-600 transition-colors" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-red-600 transition-colors">Close</span>
              </button>
              <button
                onClick={onEditSequence}
                className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/30 flex items-center justify-center gap-2 hover:bg-white/20 transition-colors group shadow-lg"
              >
                <Edit className="w-4 h-4 text-gray-700 group-hover:text-green-600 transition-colors" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-green-600 transition-colors">Edit Sequence</span>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

