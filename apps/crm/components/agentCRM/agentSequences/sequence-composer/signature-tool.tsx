"use client";

import { Button } from "@/components/ui/button";
import { Signature as SignatureIcon } from "lucide-react";
import { EditorRef } from '@/components/agentCRM/emailComposer/components/editor/editor';

interface SignatureToolProps {
  editorRef: React.RefObject<EditorRef>;
}

export function SignatureTool({ editorRef }: SignatureToolProps) {
  const insertSignature = () => {
    const editor = editorRef.current?.getEditor();
    if (!editor) return;

    // Move cursor to end of document
    editor.commands.setTextSelection(editor.state.doc.content.size);

    // Add two newlines before signature if content exists
    if (editor.state.doc.textContent) {
      editor.commands.enter();
      editor.commands.enter();
    }

    // Insert signature placeholder
    editor
      .chain()
      .focus()
      .insertContent('{{sender.signature}}')
      .run();
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="w-10 h-10 p-0 text-slate-600 hover:bg-transparent flex items-center justify-center shadow-none relative group flex-shrink-0"
      onClick={insertSignature}
      title="Insert signature"
    >
      <div className="relative">
        <div className="relative z-10 p-3 rounded-full transition-all duration-300 ease-in-out group-hover:bg-gray-50 group-hover:border group-hover:border-neutral-200 group-hover:shadow-[inset_0_4px_8px_rgba(0,0,0,0.15)] group-hover:scale-95">
          <SignatureIcon className="h-[18px] w-[18px] stroke-[1.5] text-neutral-500" />
        </div>
      </div>
    </Button>
  );
}

