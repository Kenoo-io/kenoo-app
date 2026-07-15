"use client";

import { AIWriterTool } from '@/components/agentCRM/emailComposer/components/editor/tools/aiWriter';
import { TextFormattingTool } from '@/components/agentCRM/emailComposer/components/editor/tools/textFormatting';
import { HyperlinkTool } from '@/components/agentCRM/emailComposer/components/editor/tools/hyperlink';
import { AttachmentsTool } from '@/components/agentCRM/emailComposer/components/editor/tools/attachments';
import { SignatureTool } from './signature-tool';
import { EditorRef } from '@/components/agentCRM/emailComposer/components/editor/editor';
import { FieldInserterButton } from './inserts';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ToolbarProps {
  editorRef: React.RefObject<EditorRef>;
  onChange: (content: string) => void;
  onSubjectChange: (subject: string) => void;
  recipientEmails: string[];
  onAttachmentsChange: (files: File[]) => void;
}

export function Toolbar({
  editorRef,
  onChange,
  onSubjectChange,
  recipientEmails,
  onAttachmentsChange,
}: ToolbarProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center space-x-1 p-2 border-t border-neutral-300">
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <AIWriterTool
                onChange={onChange}
                onSubjectChange={onSubjectChange}
                editorRef={editorRef}
                recipientEmails={recipientEmails}
                selectedCreators={[]}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>AI Writer</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <TextFormattingTool
                editor={editorRef.current?.getEditor() ?? null}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Text Stylizing</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <HyperlinkTool editorRef={editorRef} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Link</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <AttachmentsTool onAttachmentsChange={onAttachmentsChange} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Attachments</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <SignatureTool editorRef={editorRef} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Signature</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <FieldInserterButton editorRef={editorRef} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Insert Field</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
