import React from "react";
import {
  FloatingLabelField,
  FloatingLabelInput,
  FloatingLabelTextarea,
  FloatingLabelValue,
  floatingSelectTriggerClass,
} from "@/components/ui/floating-label-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link2 } from "lucide-react";

const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'walls', label: 'Walls' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'other', label: 'Other' },
];

interface GeneralTabProps {
  formData: any;
  handleInputChange: (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (field: string) => (value: string) => void;
}

export default function GeneralTab({ formData, handleInputChange, handleSelectChange }: GeneralTabProps) {
  const ensureHttps = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  };

  const personName = formData.person
    ? `${formData.person.first_name || ''} ${formData.person.last_name || ''}`.trim() || formData.person.email || '—'
    : '—';
  const agentName = formData.agent
    ? `${formData.agent.first_name || ''} ${formData.agent.last_name || ''}`.trim() || formData.agent.email || '—'
    : '—';

  return (
    <div className="space-y-6">
      {/* Pitch Information */}
      <div className="bg-white/50 backdrop-blur-sm shadow-sm rounded-[30px] p-6">
        <div className="flex items-center mb-6">
          <h2 className="text-black font-black text-4xl">PITCH DETAILS</h2>
          <div className="flex-1 border-t border-black h-[1px] mx-4" />
        </div>

        <div className="grid grid-cols-2 gap-4 items-start">
          {/* Left Column */}
          <div className="space-y-4">
            <FloatingLabelValue
              label="Company"
              value={
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate">
                    {formData.company?.name || formData.companyWebsite || '—'}
                  </span>
                  {formData.companyWebsite && (
                    <a
                      href={ensureHttps(formData.companyWebsite)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0 text-neutral-500 hover:text-neutral-700 transition-colors"
                    >
                      <Link2 className="w-4 h-4" />
                    </a>
                  )}
                </span>
              }
            />

            <FloatingLabelValue label="Pitched To" value={personName} />

            <FloatingLabelValue label="Sent By" value={agentName} />
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <FloatingLabelField label="Channel" hasValue>
              <Select
                value={formData.channel || 'email'}
                onValueChange={handleSelectChange('channel')}
              >
                <SelectTrigger className={floatingSelectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {CHANNEL_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="rounded-xl">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FloatingLabelField>

            <FloatingLabelInput
              label="Date Pitched"
              type="datetime-local"
              alwaysFloated
              value={formData.timestamp ? formData.timestamp.slice(0, 16) : ''}
              onChange={handleInputChange('timestamp')}
            />

            <FloatingLabelValue
              label="Created At"
              value={
                formData.createdAt
                  ? new Date(formData.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—'
              }
            />
          </div>
        </div>

        {/* Message - full width */}
        <FloatingLabelTextarea
          containerClassName="mt-4"
          label="Message"
          value={formData.message ?? ''}
          onChange={handleInputChange('message')}
        />
      </div>
    </div>
  );
}
