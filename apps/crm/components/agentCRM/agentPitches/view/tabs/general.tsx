import React, { useRef, useEffect } from "react";
import { Input as BorderlessInput } from "@/components/ui/borderless-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link2 } from "lucide-react";

const fieldWrapperClass = "rounded-2xl bg-neutral-100 backdrop-blur-md shadow-inner border border-neutral-200/50 px-3 py-1";
const inputInnerClass = "border-0 focus-visible:ring-0 focus:ring-0 bg-transparent flex-1 w-full min-w-0 placeholder:text-neutral-400";
const labelClass = "text-xs font-normal text-neutral-400 tracking-wide block mb-1";

const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'walls', label: 'Walls' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'other', label: 'Other' },
];

function resizeTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  const oneLineHeight = 36;
  if (!el.value.trim()) {
    el.style.height = `${oneLineHeight}px`;
    return;
  }
  el.style.height = "auto";
  el.style.height = `${Math.max(oneLineHeight, el.scrollHeight)}px`;
}

interface GeneralTabProps {
  formData: any;
  handleInputChange: (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (field: string) => (value: string) => void;
}

export default function GeneralTab({ formData, handleInputChange, handleSelectChange }: GeneralTabProps) {
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    resizeTextarea(messageRef.current);
  }, [formData.message]);

  const ensureHttps = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  };

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
            {/* Company */}
            <div>
              <label className={labelClass}>Company</label>
              <div className={`${fieldWrapperClass} pl-1.5 pr-3 flex items-center gap-2`}>
                <span className="text-sm font-light text-foreground flex-1 truncate py-2 px-2">
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
              </div>
            </div>

            {/* Pitched To */}
            <div>
              <label className={labelClass}>Pitched To</label>
              <div className={`${fieldWrapperClass} pl-1.5 pr-3`}>
                <span className="text-sm font-light text-foreground flex-1 truncate py-2 px-2 block">
                  {formData.person
                    ? `${formData.person.first_name || ''} ${formData.person.last_name || ''}`.trim() || formData.person.email || '—'
                    : '—'}
                </span>
              </div>
            </div>

            {/* Sent By */}
            <div>
              <label className={labelClass}>Sent By</label>
              <div className={`${fieldWrapperClass} pl-1.5 pr-3`}>
                <span className="text-sm font-light text-foreground flex-1 truncate py-2 px-2 block">
                  {formData.agent
                    ? `${formData.agent.first_name || ''} ${formData.agent.last_name || ''}`.trim() || formData.agent.email || '—'
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Channel */}
            <div>
              <label className={labelClass}>Channel</label>
              <div className={`${fieldWrapperClass} pl-1.5 pr-2`}>
                <Select
                  value={formData.channel || 'email'}
                  onValueChange={handleSelectChange('channel')}
                >
                  <SelectTrigger className="border-0 focus:ring-0 focus-visible:ring-0 bg-transparent shadow-none h-9 px-2">
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
              </div>
            </div>

            {/* Date Pitched */}
            <div>
              <label className={labelClass}>Date Pitched</label>
              <div className={`${fieldWrapperClass} pl-1.5 pr-3`}>
                <BorderlessInput
                  type="datetime-local"
                  value={formData.timestamp ? formData.timestamp.slice(0, 16) : ''}
                  onChange={handleInputChange('timestamp')}
                  className={inputInnerClass}
                />
              </div>
            </div>

            {/* Created At */}
            <div>
              <label className={labelClass}>Created At</label>
              <div className={`${fieldWrapperClass} pl-1.5 pr-3`}>
                <span className="text-sm font-light text-foreground py-2 px-2 block">
                  {formData.createdAt
                    ? new Date(formData.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Message - full width */}
        <div className="mt-4">
          <label className={labelClass}>Message</label>
          <div className={`${fieldWrapperClass} pl-1.5 pr-3 flex items-start`}>
            <textarea
              ref={messageRef}
              value={formData.message ?? ''}
              onChange={(e) => {
                handleInputChange('message')(e);
                resizeTextarea(messageRef.current);
              }}
              onFocus={(e) => resizeTextarea(e.currentTarget)}
              placeholder="Pitch message..."
              className={`${inputInnerClass} text-sm text-foreground placeholder:text-neutral-400 h-9 min-h-9 max-h-[none] resize-none overflow-hidden px-3 leading-tight box-border w-full block m-0`}
              style={{ paddingTop: '0.625rem', paddingBottom: '0.625rem' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
