"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlignCenter, AlignLeft, AlignRight, ArrowLeft, Bold, Check, ChevronDown, ChevronLeft, Code2, Eye, Folder, Image, Italic, LayoutTemplate, Link2, List, ListOrdered, Mail, MessageCircleMore, Minus, MousePointerClick, Palette, Pencil, Plus, Redo2, Save, Search, Send, Settings2, Smartphone, Sparkles, Strikethrough, Type, Underline, Undo2, Upload, UploadCloud, ZoomIn, ZoomOut } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@walls/utils";

import { EmailUploadsPanel } from "./email-uploads-panel";

const channelDetails = {
  email: { label: "Email", description: "Build a rich message with a subject line and formatted content.", icon: Mail, color: "bg-[#edf5ff] text-[#4776b8]" },
  sms: { label: "SMS", description: "Write a concise message for direct, personal communication.", icon: MessageCircleMore, color: "bg-[#eef8f2] text-[#238252]" },
  push: { label: "Push", description: "Create a notification that brings people back to your product.", icon: Smartphone, color: "bg-[#f3f0ff] text-[#7258c9]" },
} as const;

const emailEditorModes = [
  { value: "editing", label: "Editing", description: "Make changes", icon: Pencil },
  { value: "suggesting", label: "Suggesting", description: "Propose changes", icon: LayoutTemplate },
  { value: "commenting", label: "Commenting", description: "Add feedback", icon: MessageCircleMore },
  { value: "viewing", label: "Viewing", description: "Read-only", icon: Eye },
] as const;

type EmailSectionKey = "hero" | "text" | "image" | "divider";

function FigmaColorRow({ label, color, onChange }: { label: string; color: string; onChange: (color: string) => void }) {
  return <div className="flex h-10 items-center rounded-xl bg-[#f4f5f6] px-2">
    <label className="relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[#dfe1e3] bg-white shadow-sm">
      <span className="h-5 w-5 rounded-[3px]" style={{ backgroundColor: color }} />
      <input type="color" aria-label={label} value={color} onChange={(event) => onChange(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
    </label>
    <span className="mx-2 h-6 w-px bg-white" />
    <input key={color} aria-label={`${label} hex code`} defaultValue={color.replace("#", "").toUpperCase()} maxLength={6} onChange={(event) => { const nextValue = event.target.value.replace(/^#/, "").replace(/[^0-9a-f]/gi, "").slice(0, 6).toUpperCase(); event.currentTarget.value = nextValue; if (/^[0-9A-F]{6}$/.test(nextValue)) onChange(`#${nextValue.toLowerCase()}`); }} onBlur={(event) => { if (!/^[0-9A-F]{6}$/i.test(event.currentTarget.value)) event.currentTarget.value = color.replace("#", "").toUpperCase(); }} className="min-w-0 flex-1 bg-transparent font-mono text-[12px] uppercase text-[#333] outline-none" />
  </div>;
}

function ScrubField({ label, value, onChange, min = 0, max = 1200, prefix, suffix, placeholder }: { label: string; value: string; onChange: (value: string) => void; min?: number; max?: number; prefix?: string; suffix?: string; placeholder?: string }) {
  const dragStartRef = React.useRef<{ y: number; value: number } | null>(null);

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragStartRef.current = { y: event.clientY, value: Number.parseFloat(value) || min };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragStartRef.current) return;
    const delta = Math.round((dragStartRef.current.y - event.clientY) / 2);
    onChange(String(Math.min(max, Math.max(min, dragStartRef.current.value + delta))));
  }

  function stopScrubbing(event: React.PointerEvent<HTMLButtonElement>) {
    dragStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return <label className="block"><span className="mb-1.5 block text-[11px] text-[#8b8f94]">{label}</span><div className="group flex h-9 items-center rounded-lg bg-[#f5f5f5] px-3 transition-colors focus-within:bg-[#eeeeef]"><span className="mr-2 text-[12px] text-[#85898d]">{prefix}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-[12px] text-[#222] outline-none placeholder:text-[#9b9da0]" /><span className="ml-1 text-[11px] text-[#85898d]">{suffix}</span><button type="button" aria-label={`Scrub ${label}`} title="Drag up or down to adjust" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={stopScrubbing} onPointerCancel={stopScrubbing} className="ml-2 flex h-6 w-5 cursor-ns-resize items-center justify-center rounded text-[13px] leading-none text-[#a1a4a8] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[#e1e2e4] hover:text-[#555]">↕</button></div></label>;
}

export function CreateTemplatePage({ channel, initialFormat }: { channel: string; initialFormat?: string }) {
  const router = useRouter();
  const key = channel.toLowerCase() as keyof typeof channelDetails;
  const details = channelDetails[key] ?? channelDetails.email;
  const Icon = details.icon;
  const isPush = key === "push";
  const [name, setName] = React.useState(key === "email" && initialFormat === "html" ? "Template 1" : "");
  const [description, setDescription] = React.useState("");
  const initialEmailFormat = key === "email" && initialFormat === "html" ? "html" : key === "email" && initialFormat === "plain" ? "plain" : key === "email" ? null : "plain";
  const [emailFormat, setEmailFormat] = React.useState<"plain" | "html" | null>(initialEmailFormat);
  const [subject, setSubject] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [heroEyebrow, setHeroEyebrow] = React.useState("A note for you");
  const [heroHeadline, setHeroHeadline] = React.useState("Make something people remember.");
  const [heroDescription, setHeroDescription] = React.useState("Build a beautiful email with the same thoughtful details your customers expect from Kenoo.");
  const [heroButtonLabel, setHeroButtonLabel] = React.useState("Shop the collection");
  const [buttonColor, setButtonColor] = React.useState("#6eadc0");
  const [buttonTextColor, setButtonTextColor] = React.useState("#ffffff");
  const [buttonWidth, setButtonWidth] = React.useState("auto");
  const [buttonHeight, setButtonHeight] = React.useState("44");
  const [buttonRadius, setButtonRadius] = React.useState("12");
  const [bodyHeading, setBodyHeading] = React.useState("A little more context goes here");
  const [bodyDescription, setBodyDescription] = React.useState("Click any section to select it. In the next pass, these blocks will become draggable, editable, and ready for real content.");
  const [imagePlaceholder, setImagePlaceholder] = React.useState("Drop an image here");
  const [sectionColors, setSectionColors] = React.useState<Record<EmailSectionKey, string>>({ hero: "#f7f4eb", text: "#ffffff", image: "#f4fbfc", divider: "#ffffff" });
  const [sectionHeights, setSectionHeights] = React.useState<Record<EmailSectionKey, string>>({ hero: "360", text: "190", image: "220", divider: "64" });
  const [hiddenSections, setHiddenSections] = React.useState<EmailSectionKey[]>([]);
  const [actionUrl, setActionUrl] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sendTestOpen, setSendTestOpen] = React.useState(false);
  const [testEmail, setTestEmail] = React.useState("");
  const [editorMode, setEditorMode] = React.useState<(typeof emailEditorModes)[number]["value"]>("editing");
  const [editorModeOpen, setEditorModeOpen] = React.useState(false);
  const [selectedBlock, setSelectedBlock] = React.useState<"hero" | "text" | "image" | "button" | "divider">("hero");
  const [canvasSelectionActive, setCanvasSelectionActive] = React.useState(true);
  const [zoom, setZoom] = React.useState(100);
  const [activeSidebarTool, setActiveSidebarTool] = React.useState<"add" | "layouts" | "uploads" | "folders" | "ai" | "design" | null>(null);
  const templateNameMeasureRef = React.useRef<HTMLSpanElement>(null);
  const editorModeRef = React.useRef<HTMLDivElement>(null);
  const activeTextEditorRef = React.useRef<HTMLElement | null>(null);
  const savedTextSelectionRef = React.useRef<Range | null>(null);
  const textToolbarRef = React.useRef<HTMLDivElement>(null);
  const [templateNameWidth, setTemplateNameWidth] = React.useState(110);
  const [textToolbarOpen, setTextToolbarOpen] = React.useState(false);
  const [textToolbarPosition, setTextToolbarPosition] = React.useState({ top: 0, left: 0 });

  function toggleSidebarTool(tool: NonNullable<typeof activeSidebarTool>) {
    setActiveSidebarTool((current) => current === tool ? null : tool);
  }

  function rememberTextSelection(editor: HTMLElement) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    activeTextEditorRef.current = editor;
    savedTextSelectionRef.current = range.cloneRange();
    const rect = range.getBoundingClientRect();
    if (rect.width || rect.height) {
      setTextToolbarPosition({ top: Math.max(76, rect.top - 58), left: Math.max(12, rect.left + rect.width / 2) });
    }
  }

  function activateTextEditor(event?: React.SyntheticEvent<HTMLElement>) {
    const editor = event?.currentTarget ?? activeTextEditorRef.current;
    if (!editor) return;
    activeTextEditorRef.current = editor;
    setTextToolbarOpen(true);
    const rect = editor.getBoundingClientRect();
    setTextToolbarPosition({ top: Math.max(76, rect.top - 58), left: Math.max(12, rect.left + rect.width / 2) });
    window.requestAnimationFrame(() => rememberTextSelection(editor));
  }

  function applyTextCommand(command: string, value?: string) {
    const editor = activeTextEditorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (savedTextSelectionRef.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedTextSelectionRef.current);
    }
    document.execCommand(command, false, value);
    savedTextSelectionRef.current = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "formatBlock" }));
  }

  function addTextLink() {
    const url = window.prompt("Enter a link URL");
    if (url?.trim()) applyTextCommand("createLink", url.trim());
  }

  const textFormattingToolbar = textToolbarOpen ? <div ref={textToolbarRef} role="toolbar" aria-label="Text formatting" onMouseDown={(event) => event.preventDefault()} className="fixed z-50 flex max-w-[calc(100vw-24px)] items-center gap-1 overflow-x-auto rounded-xl border border-[#dfe4e8] bg-white/95 p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.18)] backdrop-blur" style={{ top: textToolbarPosition.top, left: textToolbarPosition.left, transform: "translateX(-50%)" }}>
    <select aria-label="Font" defaultValue="Arial" onChange={(event) => applyTextCommand("fontName", event.target.value)} className="h-8 rounded-lg border-0 bg-[#f5f6f7] px-2 text-[11px] text-[#444] outline-none focus:ring-2 focus:ring-[#dff3f6]"><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Tahoma">Tahoma</option><option value="Verdana">Verdana</option><option value="Trebuchet MS">Trebuchet</option></select>
    <select aria-label="Font size" defaultValue="3" onChange={(event) => applyTextCommand("fontSize", event.target.value)} className="h-8 w-[58px] rounded-lg border-0 bg-[#f5f6f7] px-2 text-[11px] text-[#444] outline-none focus:ring-2 focus:ring-[#dff3f6]"><option value="1">10</option><option value="2">12</option><option value="3">14</option><option value="4">18</option><option value="5">24</option><option value="6">32</option><option value="7">40</option></select>
    <span className="mx-0.5 h-6 w-px bg-[#e5e7eb]" />
    {([[Bold, "bold", "Bold"], [Italic, "italic", "Italic"], [Underline, "underline", "Underline"], [Strikethrough, "strikeThrough", "Strikethrough"]] as const).map(([ButtonIcon, command, label]) => <button key={command} type="button" aria-label={label} title={label} onClick={() => applyTextCommand(command)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#555] transition hover:bg-[#edf8fa] hover:text-[#4d9eae]"><ButtonIcon className="h-4 w-4" /></button>)}
    <span className="mx-0.5 h-6 w-px bg-[#e5e7eb]" />
    {([[AlignLeft, "justifyLeft", "Align left"], [AlignCenter, "justifyCenter", "Align center"], [AlignRight, "justifyRight", "Align right"], [List, "insertUnorderedList", "Bulleted list"], [ListOrdered, "insertOrderedList", "Numbered list"]] as const).map(([ButtonIcon, command, label]) => <button key={command} type="button" aria-label={label} title={label} onClick={() => applyTextCommand(command)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#555] transition hover:bg-[#edf8fa] hover:text-[#4d9eae]"><ButtonIcon className="h-4 w-4" /></button>)}
    <label title="Text color" className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#555] transition hover:bg-[#edf8fa] hover:text-[#4d9eae]"><Palette className="h-4 w-4" /><input type="color" aria-label="Text color" defaultValue="#333333" onChange={(event) => applyTextCommand("foreColor", event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" /></label>
    <button type="button" aria-label="Insert link" title="Insert link" onClick={addTextLink} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#555] transition hover:bg-[#edf8fa] hover:text-[#4d9eae]"><Link2 className="h-4 w-4" /></button>
    <button type="button" aria-label="Clear formatting" title="Clear formatting" onClick={() => applyTextCommand("removeFormat")} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#555] transition hover:bg-[#edf8fa] hover:text-[#4d9eae]"><Code2 className="h-4 w-4" /></button>
  </div> : null;

  React.useLayoutEffect(() => {
    const measuredWidth = templateNameMeasureRef.current?.scrollWidth ?? 0;
    setTemplateNameWidth(Math.min(320, Math.max(100, measuredWidth + 20)));
  }, [name]);

  React.useEffect(() => {
    if (!editorModeOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!editorModeRef.current?.contains(event.target as Node)) setEditorModeOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setEditorModeOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [editorModeOpen]);

  React.useEffect(() => {
    if (!textToolbarOpen) return;

    function handleTextToolbarOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      const activeEditor = activeTextEditorRef.current;
      if (activeEditor?.contains(target) || textToolbarRef.current?.contains(target)) return;
      setTextToolbarOpen(false);
      activeTextEditorRef.current = null;
      savedTextSelectionRef.current = null;
    }

    document.addEventListener("mousedown", handleTextToolbarOutsideClick);
    return () => document.removeEventListener("mousedown", handleTextToolbarOutsideClick);
  }, [textToolbarOpen]);

  const selectedSectionLabel = selectedBlock === "hero" ? "Hero section" : selectedBlock === "text" ? "Text section" : selectedBlock === "image" ? "Image section" : selectedBlock === "button" ? "Hero button" : "Divider";
  const selectedSection = selectedBlock === "button" ? "hero" : selectedBlock;
  const buttonControls = <>
    <div className="border-b border-[#e5e6e8] px-5 py-5">
      <p className="mb-4 text-[14px] font-semibold tracking-[-0.01em]">Layout</p>
      <div className="grid grid-cols-2 gap-3">
        <ScrubField label="Width" value={buttonWidth} onChange={setButtonWidth} min={80} max={640} prefix="W" suffix="px" placeholder="Auto" />
        <ScrubField label="Height" value={buttonHeight} onChange={setButtonHeight} min={28} max={120} prefix="H" suffix="px" />
      </div>
    </div>
    <div className="border-b border-[#e5e6e8] px-5 py-5">
      <div className="mb-4 flex items-center justify-between"><p className="text-[14px] font-semibold tracking-[-0.01em]">Appearance</p><span className="text-[18px] leading-none text-[#555]">◌</span></div><ScrubField label="Corner radius" value={buttonRadius} onChange={setButtonRadius} min={0} max={48} prefix="⌜" suffix="px" />
    </div>
    <div className="border-b border-[#e5e6e8] px-5 py-5">
      <div className="mb-4 flex items-center justify-between"><p className="text-[14px] font-semibold tracking-[-0.01em]">Fill</p><span className="text-[20px] font-light leading-none text-[#555]">＋</span></div><p className="mb-2 text-[11px] text-[#8b8f94]">Button background</p><FigmaColorRow label="Button background" color={buttonColor} onChange={setButtonColor} /><p className="mb-2 mt-4 text-[11px] text-[#8b8f94]">Button text</p><FigmaColorRow label="Button text" color={buttonTextColor} onChange={setButtonTextColor} />
    </div>
    <div className="px-5 py-5"><label className="block"><span className="mb-1.5 block text-[11px] text-[#8b8f94]">Button URL</span><div className="flex h-9 items-center rounded-lg bg-[#f5f5f5] px-3 focus-within:bg-[#eeeeef]"><input type="url" value={actionUrl} onChange={(event) => setActionUrl(event.target.value)} placeholder="https://example.com" className="min-w-0 flex-1 bg-transparent text-[12px] text-[#222] outline-none placeholder:text-[#9b9da0]" /></div></label></div>
  </>;
  const selectedSectionControls = <div className="mt-0 min-h-full bg-white text-[#222]"><div className="flex items-center justify-between border-b border-[#e9eaec] px-5 py-4"><div><p className="text-[14px] font-semibold tracking-[-0.01em] text-[#222]">{selectedSectionLabel}</p></div>{selectedBlock !== "button" ? <span className="h-2.5 w-2.5 rounded-full ring-2 ring-[#f1f2f3]" style={{ backgroundColor: sectionColors[selectedSection] }} /> : null}</div>
{selectedBlock === "button" ? buttonControls : null}
{selectedBlock !== "button" ? <div className="border-b border-[#e9eaec] px-5 py-5"><p className="mb-4 text-[14px] font-semibold tracking-[-0.01em]">Layout</p><ScrubField label="Height" value={sectionHeights[selectedSection]} onChange={(value) => setSectionHeights((current) => ({ ...current, [selectedSection]: value }))} min={48} max={1200} prefix="H" suffix="px" /></div> : null}
<div className={cn("border-b border-[#e9eaec] px-5 py-5", selectedBlock === "button" ? "hidden" : "")}><p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b9095]">Section fill</p><FigmaColorRow label="Section fill" color={sectionColors[selectedSection]} onChange={(color) => setSectionColors((current) => ({ ...current, [selectedSection]: color }))} /></div><div className={cn("px-5 py-4", selectedBlock === "button" ? "hidden" : "")}><button type="button" onClick={() => { setHiddenSections((current) => current.includes(selectedSection) ? current : [...current, selectedSection]); setActiveSidebarTool(null); }} className="flex h-9 w-full items-center justify-center rounded-lg border border-red-200 bg-white text-[11px] font-medium text-red-600 transition hover:bg-red-50">Delete section</button></div></div>;

  async function saveTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, channel: key, subject, title, textContent: message, htmlContent: emailFormat === "html" ? message : "", actionUrl, imageUrl }) });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Unable to save template");
      setSaving(false);
      return;
    }
    router.push("/templates");
  }

  if (key === "email" && emailFormat === null) return <div className="min-h-full bg-kenoo-white"><div className="mx-auto max-w-[1000px] px-6 py-8 sm:px-10 lg:px-12"><Link href="/templates" className="inline-flex items-center gap-2 text-[12px] text-[#888] transition hover:text-[#333]"><ArrowLeft className="h-3.5 w-3.5" /> Back to templates</Link><header className="mt-8"><div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", details.color)}><Icon className="h-5 w-5" strokeWidth={1.6} /></div><p className="mb-2 mt-5 text-[12px] font-medium uppercase tracking-[0.1em] text-[#9b9b9b]">New email template</p><h1 className="text-[30px] font-semibold tracking-[-0.04em] text-[#111]">How would you like to create it?</h1><p className="mt-2 max-w-xl text-[13px] font-light leading-6 text-[#858585]">Choose the format that fits the message you want to send.</p></header><div className="mt-8 grid gap-4 sm:grid-cols-2"><button type="button" onClick={() => setEmailFormat("plain")} className="group rounded-[24px] border border-white/70 bg-white/75 p-6 text-left shadow-[0_8px_28px_rgba(15,23,42,0.09),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/90 hover:shadow-[0_14px_34px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,1)]"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5f5f5] text-[#555] text-[18px] font-medium">T</span><h2 className="mt-5 text-[15px] font-medium text-[#222]">Plain text</h2><p className="mt-2 text-[12px] leading-5 text-[#999]">A simple, personal email with a subject and message body.</p></button><button type="button" onClick={() => setEmailFormat("html")} className="group rounded-[24px] border border-white/70 bg-white/75 p-6 text-left shadow-[0_8px_28px_rgba(15,23,42,0.09),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/90 hover:shadow-[0_14px_34px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,1)]"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf5ff] text-[#4776b8] text-[18px] font-medium">✦</span><h2 className="mt-5 text-[15px] font-medium text-[#222]">HTML email</h2><p className="mt-2 text-[12px] leading-5 text-[#999]">Design a rich, visual email with sections, buttons, images, and more.</p></button></div></div></div>;

  if (key === "email" && emailFormat === "html") return <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-[#f4f5f7] text-[#222]"><header className="relative flex h-[68px] shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-white px-4 text-[#222] shadow-[0_4px_18px_rgba(15,23,42,0.06)] sm:px-6"><span ref={templateNameMeasureRef} aria-hidden="true" className="pointer-events-none absolute -z-10 whitespace-pre text-[15px] font-semibold tracking-[-0.02em]">{name || "Template 1"}</span><div className="flex min-w-0 items-center gap-5"><button type="button" onClick={() => setEmailFormat(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f4f5f7] text-[#666] transition hover:bg-[#edf8fa] hover:text-[#4d9eae]" aria-label="Change email format"><ArrowLeft className="h-4 w-4" /></button><div className="hidden items-center gap-5 sm:flex"><span className="text-[15px] font-semibold tracking-[-0.02em] text-[#4d9eae]">Email studio</span><span className="h-7 w-px bg-[#e5e7eb]" /><div ref={editorModeRef} className="relative"><button type="button" aria-haspopup="menu" aria-expanded={editorModeOpen} onClick={() => setEditorModeOpen((open) => !open)} className="flex items-center gap-2 rounded-lg bg-[#f4f5f7] px-3 py-2 text-[12px] font-medium text-[#555] transition hover:bg-[#edf8fa] hover:text-[#4d9eae]"><Pencil className="h-4 w-4" />{emailEditorModes.find((mode) => mode.value === editorMode)?.label}<ChevronDown className={cn("h-3.5 w-3.5 transition-transform", editorModeOpen ? "rotate-180" : "")} /></button>{editorModeOpen ? <div role="menu" aria-label="Editor mode" className="absolute left-0 top-[calc(100%+10px)] z-40 w-[236px] rounded-2xl border border-[#e4e7e9] bg-white p-1.5 shadow-[0_14px_36px_rgba(15,23,42,0.14)]">{emailEditorModes.map((mode) => { const ModeIcon = mode.icon; const selected = editorMode === mode.value; return <button key={mode.value} type="button" role="menuitemradio" aria-checked={selected} onClick={() => { setEditorMode(mode.value); setEditorModeOpen(false); }} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition", selected ? "bg-[#edf8fa] text-[#4d9eae]" : "text-[#444] hover:bg-[#f4f5f7]")}><span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", selected ? "bg-white text-[#4d9eae]" : "bg-[#f4f5f7] text-[#777]")}><ModeIcon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-[12px] font-medium">{mode.label}</span><span className="mt-0.5 block text-[11px] text-[#999]">{mode.description}</span></span>{selected ? <Check className="h-4 w-4 shrink-0" /> : null}</button>; })}</div> : null}</div><span className="h-7 w-px bg-[#e5e7eb]" /><Undo2 className="h-4 w-4 text-[#9aa0a6]" /><Redo2 className="h-4 w-4 text-[#9aa0a6]" /><span className="h-7 w-px bg-[#e5e7eb]" /><input value={name} onChange={(event) => setName(event.target.value)} aria-label="Template name" placeholder="Template 1" style={{ width: templateNameWidth }} className="hidden h-9 rounded-xl border border-transparent bg-transparent px-2 text-[15px] font-semibold tracking-[-0.02em] text-[#222] outline-none transition hover:border-[#c9cdd1] hover:bg-white focus:border-[#969ba1] focus:bg-white sm:block" /></div><input value={name} onChange={(event) => setName(event.target.value)} aria-label="Template name" placeholder="Template 1" style={{ width: templateNameWidth }} className="h-9 min-w-0 max-w-[calc(100vw-160px)] rounded-xl border border-transparent bg-transparent px-2 text-[14px] font-semibold text-[#222] outline-none transition hover:border-[#c9cdd1] hover:bg-white focus:border-[#969ba1] focus:bg-white sm:hidden" /></div><div className="flex shrink-0 items-center gap-2"><span className="hidden text-[11px] text-[#999] md:inline">Unsaved draft</span><div className="relative"><button type="button" onClick={() => setSendTestOpen((open) => !open)} className="flex items-center gap-2 rounded-xl bg-[#edf8fa] px-3.5 py-2.5 text-[12px] font-semibold text-[#4d9eae] transition hover:bg-[#dff3f6]"><Send className="h-3.5 w-3.5" /> Send test</button>{sendTestOpen ? <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-[280px] rounded-2xl border border-[#e4e7e9] bg-white p-3 shadow-[0_14px_36px_rgba(15,23,42,0.14)]"><label className="block text-left"><span className="mb-1.5 block text-[11px] font-medium text-[#777]">Send a test email to</span><input type="email" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder="you@example.com" className="h-9 w-full rounded-lg border border-[#dfe4e6] bg-white px-2.5 text-[12px] text-[#333] outline-none placeholder:text-[#aaa] focus:border-[#8fcbd5] focus:ring-2 focus:ring-[#dff3f6]" /></label><button type="button" disabled={!testEmail.trim()} className="mt-2.5 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#222] text-[12px] font-medium text-white transition hover:bg-[#3a3a3a] disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-3.5 w-3.5" /> Send test email</button></div> : null}</div><button type="button" className="rounded-xl bg-[#222] px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#3a3a3a]">Save</button></div></header><div className="relative flex min-h-0 flex-1"><aside className="hidden w-[76px] shrink-0 flex-col items-center gap-2 border-r border-[#e2e4e9] bg-white py-4 sm:flex"><button type="button" onClick={() => toggleSidebarTool("add")} className={cn("flex w-[60px] flex-col items-center gap-1.5 rounded-2xl py-3 text-[10px] font-medium transition", activeSidebarTool === "add" ? "bg-[#edf8fa] text-[#4d9eae]" : "text-[#999] hover:bg-[#f5f6f8] hover:text-[#555]")}><Plus className="h-5 w-5" /><span>Add</span></button><button type="button" onClick={() => toggleSidebarTool("layouts")} className={cn("flex w-[60px] flex-col items-center gap-1.5 rounded-2xl py-3 text-[10px] transition", activeSidebarTool === "layouts" ? "bg-[#edf8fa] font-medium text-[#4d9eae]" : "text-[#999] hover:bg-[#f5f6f8] hover:text-[#555]")}><LayoutTemplate className="h-5 w-5" /><span>Layouts</span></button><button type="button" onClick={() => toggleSidebarTool("uploads")} className={cn("flex w-[60px] flex-col items-center gap-1.5 rounded-2xl py-3 text-[10px] transition", activeSidebarTool === "uploads" ? "bg-[#edf8fa] font-medium text-[#4d9eae]" : "text-[#999] hover:bg-[#f5f6f8] hover:text-[#555]")}><Upload className="h-5 w-5" /><span>Uploads</span></button><button type="button" onClick={() => toggleSidebarTool("folders")} className={cn("flex w-[60px] flex-col items-center gap-1.5 rounded-2xl py-3 text-[10px] transition", activeSidebarTool === "folders" ? "bg-[#edf8fa] font-medium text-[#4d9eae]" : "text-[#999] hover:bg-[#f5f6f8] hover:text-[#555]")}><Folder className="h-5 w-5" /><span>Folders</span></button><button type="button" onClick={() => toggleSidebarTool("ai")} className={cn("flex w-[60px] flex-col items-center gap-1.5 rounded-2xl py-3 text-[10px] transition", activeSidebarTool === "ai" ? "bg-[#edf8fa] font-medium text-[#4d9eae]" : "text-[#999] hover:bg-[#f5f6f8] hover:text-[#555]")}><Sparkles className="h-5 w-5" /><span>Kenoo AI</span></button><button type="button" onClick={() => toggleSidebarTool("design")} className={cn("flex w-[60px] flex-col items-center gap-1.5 rounded-2xl py-3 text-[10px] transition", activeSidebarTool === "design" ? "bg-[#edf8fa] font-medium text-[#4d9eae]" : "text-[#999] hover:bg-[#f5f6f8] hover:text-[#555]")}><Settings2 className="h-5 w-5" /><span>Design</span></button></aside><AnimatePresence initial={false}>{activeSidebarTool ? <motion.aside key="email-sidebar-panel" initial={{ width: 0, opacity: 0, x: -16 }} animate={{ width: 360, opacity: 1, x: 0 }} exit={{ width: 0, opacity: 0, x: -16 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className={cn("hidden shrink-0 overflow-y-auto border-r border-[#e2e4e9] bg-white lg:block", activeSidebarTool === "design" ? "" : "p-4")}><>
{activeSidebarTool === "add" ? <><div className="mt-5 grid grid-cols-2 gap-2.5"><button type="button" onClick={() => { setSelectedBlock("text"); setActiveSidebarTool("design"); }} className="flex h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#e8eaee] bg-[#fbfbfc] text-[11px] text-[#666] transition hover:-translate-y-0.5 hover:border-[#a8d7df] hover:bg-[#f1fbfc]"><Type className="h-5 w-5 text-[#60aebc]" />Text</button><button type="button" onClick={() => { setSelectedBlock("image"); setActiveSidebarTool("design"); }} className="flex h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#e8eaee] bg-[#fbfbfc] text-[11px] text-[#666] transition hover:-translate-y-0.5 hover:border-[#a8d7df] hover:bg-[#f1fbfc]"><Image className="h-5 w-5 text-[#60aebc]" />Image</button><button type="button" onClick={() => setSelectedBlock("button")} className="flex h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#e8eaee] bg-[#fbfbfc] text-[11px] text-[#666] transition hover:-translate-y-0.5 hover:border-[#a8d7df] hover:bg-[#f1fbfc]"><MousePointerClick className="h-5 w-5 text-[#60aebc]" />Button</button><button type="button" onClick={() => { setSelectedBlock("divider"); setActiveSidebarTool("design"); }} className="flex h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#e8eaee] bg-[#fbfbfc] text-[11px] text-[#666] transition hover:-translate-y-0.5 hover:border-[#a8d7df] hover:bg-[#f1fbfc]"><Minus className="h-5 w-5 text-[#60aebc]" />Divider</button></div><div className="mt-6 rounded-2xl bg-[#f5fafb] p-3.5"><p className="text-[11px] font-medium text-[#4d9eae]">Tip</p><p className="mt-1 text-[11px] leading-5 text-[#7d9298]">Select a block on the canvas to edit its content and styling.</p></div><div className="mt-5 border-t border-[#eef0f1] pt-5"><p className="text-[13px] font-semibold text-[#222]">Email settings</p><label className="mt-4 block"><span className="mb-1.5 block text-[11px] font-medium text-[#777]">Description</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional" className="form-input" /></label><div className="mt-4"><p className="mb-2 text-[11px] font-medium text-[#777]">Selected block</p><div className="flex items-center justify-between rounded-xl bg-[#f5fafb] px-3 py-2.5 text-[12px] text-[#4d9eae]"><span className="capitalize">{selectedBlock}</span><span className="h-2 w-2 rounded-full bg-[#6eadc0]" /></div></div><div className="mt-4"><p className="mb-2 text-[11px] font-medium text-[#777]">Canvas background</p><div className="flex gap-2"><button type="button" className="h-8 w-8 rounded-lg bg-[#f7f4eb] ring-2 ring-[#6eadc0] ring-offset-2" /><button type="button" className="h-8 w-8 rounded-lg bg-white ring-1 ring-[#e5e7e9]" /><button type="button" className="h-8 w-8 rounded-lg bg-[#edf8fa]" /></div></div></div></> : activeSidebarTool === "uploads" || activeSidebarTool === "folders" ? <EmailUploadsPanel key={activeSidebarTool} initialView={activeSidebarTool === "folders" ? "folders" : "images"} /> : activeSidebarTool === "design" ? selectedSectionControls : <div className="mt-5 rounded-2xl border border-dashed border-[#dce8ea] bg-[#fbfdfd] p-4"><p className="text-[12px] font-medium text-[#444]">{activeSidebarTool === "layouts" ? "Choose a starting point" : "Describe what you want to create"}</p><p className="mt-2 text-[11px] leading-5 text-[#8a9294]">{activeSidebarTool === "layouts" ? "Pick a template layout to give your email a strong first structure." : "Use Kenoo AI to help draft content and suggest layouts."}</p><div className="mt-4 rounded-xl bg-[#f5fafb] px-3 py-2.5 text-[11px] font-medium text-[#6b969e]">More options coming soon</div></div>}</></motion.aside> : null}</AnimatePresence>{activeSidebarTool ? <button type="button" onClick={() => setActiveSidebarTool(null)} aria-label="Close sidebar panel" className="absolute left-[436px] top-1/2 z-20 flex h-9 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#e1e5eb] bg-white text-[#333] shadow-[0_4px_14px_rgba(15,23,42,0.12)] transition hover:bg-[#f8fafb]"><ChevronLeft className="h-5 w-5" /></button> : null}<main onClick={() => { setActiveSidebarTool(null); setCanvasSelectionActive(false); }} className="relative min-w-0 flex-1 overflow-auto bg-[#f4f5f7] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{textFormattingToolbar}
<div className="flex min-h-full justify-center px-5 py-10 sm:px-10"><div className="relative w-full max-w-[640px]" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}><section onClick={(event) => event.stopPropagation()} className="overflow-hidden border border-[#e4e6ea] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]"><div role="button" tabIndex={0} onClick={() => { setSelectedBlock("hero"); setActiveSidebarTool("design"); setCanvasSelectionActive(true); }} style={{ backgroundColor: sectionColors.hero, height: `${sectionHeights.hero}px`, display: hiddenSections.includes("hero") ? "none" : undefined }} className={cn("group relative block w-full px-10 pb-10 pt-12 text-center transition", canvasSelectionActive && selectedBlock === "hero" ? "ring-2 ring-inset ring-[var(--kenoo-sky)]" : "hover:brightness-[0.99]")}><div className="mx-auto flex h-9 w-28 items-center justify-center rounded-lg bg-white/80 text-[10px] font-semibold tracking-[0.15em] text-[#5d777d]">YOUR BRAND</div><p contentEditable suppressContentEditableWarning spellCheck="false" onInput={(event) => setHeroEyebrow(event.currentTarget.innerHTML)} onFocus={() => { activateTextEditor(); setCanvasSelectionActive(true); }} onMouseUp={(event) => rememberTextSelection(event.currentTarget)} onKeyUp={(event) => rememberTextSelection(event.currentTarget)} className="mt-10 cursor-text rounded-md outline-none focus:bg-white/60 focus:ring-2 focus:ring-[var(--kenoo-sky)]/40" onClick={(event) => { event.stopPropagation(); setSelectedBlock("hero"); }} dangerouslySetInnerHTML={{ __html: heroEyebrow }} /><h1 contentEditable suppressContentEditableWarning spellCheck="false" onInput={(event) => setHeroHeadline(event.currentTarget.innerHTML)} onFocus={() => { activateTextEditor(); setCanvasSelectionActive(true); }} onMouseUp={(event) => rememberTextSelection(event.currentTarget)} onKeyUp={(event) => rememberTextSelection(event.currentTarget)} className="mt-4 cursor-text rounded-md text-[35px] font-semibold leading-[1.08] tracking-[-0.06em] text-[#171717] outline-none focus:bg-white/60 focus:ring-2 focus:ring-[var(--kenoo-sky)]/40" onClick={(event) => { event.stopPropagation(); setSelectedBlock("hero"); }} dangerouslySetInnerHTML={{ __html: heroHeadline }} /><p contentEditable suppressContentEditableWarning spellCheck="false" onInput={(event) => setHeroDescription(event.currentTarget.innerHTML)} onFocus={() => { activateTextEditor(); setCanvasSelectionActive(true); }} onMouseUp={(event) => rememberTextSelection(event.currentTarget)} onKeyUp={(event) => rememberTextSelection(event.currentTarget)} className="mx-auto mt-5 max-w-[400px] cursor-text rounded-md text-[13px] leading-6 text-[#727878] outline-none focus:bg-white/60 focus:ring-2 focus:ring-[var(--kenoo-sky)]/40" onClick={(event) => { event.stopPropagation(); setSelectedBlock("hero"); }} dangerouslySetInnerHTML={{ __html: heroDescription }} /><button type="button" onClick={(event) => { event.stopPropagation(); setSelectedBlock("button"); setActiveSidebarTool("design"); setCanvasSelectionActive(true); }} style={{ backgroundColor: buttonColor, color: buttonTextColor, width: buttonWidth === "auto" ? undefined : /^\d+$/.test(buttonWidth) ? buttonWidth + "px" : buttonWidth, minHeight: `${buttonHeight}px`, borderRadius: `${buttonRadius}px` }} className={cn("mt-7 rounded-xl px-6 py-3 text-[12px] font-semibold shadow-[0_8px_16px_rgba(110,173,192,0.28)] transition hover:brightness-95", canvasSelectionActive && selectedBlock === "button" ? "ring-2 ring-offset-2 ring-[var(--kenoo-sky)]" : "")}><span contentEditable suppressContentEditableWarning spellCheck="false" onInput={(event) => setHeroButtonLabel(event.currentTarget.innerHTML)} onFocus={() => { activateTextEditor(); setCanvasSelectionActive(true); }} onMouseUp={(event) => rememberTextSelection(event.currentTarget)} onKeyUp={(event) => rememberTextSelection(event.currentTarget)} className="cursor-text rounded outline-none focus:ring-2 focus:ring-white/70" onClick={(event) => { event.stopPropagation(); setSelectedBlock("button"); }} dangerouslySetInnerHTML={{ __html: heroButtonLabel }} /></button></div><button type="button" onClick={() => { setSelectedBlock("text"); setActiveSidebarTool("design"); setCanvasSelectionActive(true); }} style={{ backgroundColor: sectionColors.text, height: `${sectionHeights.text}px`, display: hiddenSections.includes("text") ? "none" : undefined }} className={cn("block w-full border-t border-[#f0f0ed] px-10 py-9 text-left transition", canvasSelectionActive && selectedBlock === "text" ? "ring-2 ring-inset ring-[var(--kenoo-sky)]" : "hover:brightness-[0.99]")}><p contentEditable suppressContentEditableWarning spellCheck="false" onInput={(event) => setBodyHeading(event.currentTarget.innerHTML)} onFocus={() => { activateTextEditor(); setCanvasSelectionActive(true); }} onMouseUp={(event) => rememberTextSelection(event.currentTarget)} onKeyUp={(event) => rememberTextSelection(event.currentTarget)} className="cursor-text rounded-md text-[15px] font-semibold text-[#252828] outline-none focus:bg-white focus:ring-2 focus:ring-[var(--kenoo-sky)]/40" onClick={(event) => { event.stopPropagation(); setSelectedBlock("text"); }} dangerouslySetInnerHTML={{ __html: bodyHeading }} /><p contentEditable suppressContentEditableWarning spellCheck="false" onInput={(event) => setBodyDescription(event.currentTarget.innerHTML)} onFocus={() => { activateTextEditor(); setCanvasSelectionActive(true); }} onMouseUp={(event) => rememberTextSelection(event.currentTarget)} onKeyUp={(event) => rememberTextSelection(event.currentTarget)} className="mt-3 cursor-text rounded-md text-[12px] leading-6 text-[#747b7d] outline-none focus:bg-white focus:ring-2 focus:ring-[var(--kenoo-sky)]/40" onClick={(event) => { event.stopPropagation(); setSelectedBlock("text"); }} dangerouslySetInnerHTML={{ __html: bodyDescription }} /></button><button type="button" onClick={() => { setSelectedBlock("image"); setActiveSidebarTool("design"); setCanvasSelectionActive(true); }} style={{ backgroundColor: sectionColors.image, height: `${sectionHeights.image}px`, display: hiddenSections.includes("image") ? "none" : undefined }} className={cn("block w-full border-t border-[#f0f0ed] p-6 transition", canvasSelectionActive && selectedBlock === "image" ? "ring-2 ring-inset ring-[var(--kenoo-sky)]" : "hover:brightness-[0.99]")}><div style={{ backgroundColor: sectionColors.image }} className="flex h-[170px] items-center justify-center rounded-xl border border-dashed border-[#c8dfe3] text-center text-[#65aab7]"><Image className="h-7 w-7" /><span contentEditable suppressContentEditableWarning spellCheck="false" onInput={(event) => setImagePlaceholder(event.currentTarget.innerHTML)} onFocus={() => { activateTextEditor(); setCanvasSelectionActive(true); }} onMouseUp={(event) => rememberTextSelection(event.currentTarget)} onKeyUp={(event) => rememberTextSelection(event.currentTarget)} className="ml-3 cursor-text rounded outline-none focus:bg-white focus:ring-2 focus:ring-[var(--kenoo-sky)]/40" onClick={(event) => { event.stopPropagation(); setSelectedBlock("image"); }} dangerouslySetInnerHTML={{ __html: imagePlaceholder }} /></div></button><button type="button" onClick={() => { setSelectedBlock("divider"); setActiveSidebarTool("design"); setCanvasSelectionActive(true); }} style={{ backgroundColor: sectionColors.divider, height: `${sectionHeights.divider}px`, display: hiddenSections.includes("divider") ? "none" : undefined }} className={cn("block w-full border-t border-[#f0f0ed] px-10 py-7 transition", canvasSelectionActive && selectedBlock === "divider" ? "ring-2 ring-inset ring-[var(--kenoo-sky)]" : "hover:brightness-[0.99]")}><div className="h-px bg-[#d8e5e7]" /></button></section></div></div></main></div><footer className="flex h-11 shrink-0 items-center justify-between border-t border-[#e2e4e9] bg-white px-4 text-[11px] text-[#92969d] sm:px-6"><div className="flex items-center gap-5"><span className="inline-flex items-center gap-1.5"><LayoutTemplate className="h-3.5 w-3.5" /> Email layout</span><span className="hidden sm:inline">Autosave on</span></div><div className="flex items-center gap-4"><div className="flex items-center gap-1 rounded-xl bg-[#f4f5f7] p-1"><button type="button" onClick={() => setZoom((value) => Math.max(50, value - 10))} className="rounded-lg p-1.5 text-[#777] transition hover:bg-white hover:text-[#4d9eae]" aria-label="Zoom out"><ZoomOut className="h-3.5 w-3.5" /></button><input type="range" min="50" max="150" step="10" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="h-1 w-32 accent-[#6eadc0]" aria-label="Zoom level" /><button type="button" onClick={() => setZoom((value) => Math.min(150, value + 10))} className="rounded-lg p-1.5 text-[#777] transition hover:bg-white hover:text-[#4d9eae]" aria-label="Zoom in"><ZoomIn className="h-3.5 w-3.5" /></button><span className="min-w-[38px] px-1 text-center text-[11px] font-medium text-[#666]">{zoom}%</span></div><span>Draft</span><span className="font-medium text-[#666]">1 / 1</span></div></footer></div>;

  return <div className="min-h-full bg-kenoo-white"><div className="mx-auto max-w-[1000px] px-6 py-8 sm:px-10 lg:px-12"><Link href="/templates" className="inline-flex items-center gap-2 text-[12px] text-[#888] transition hover:text-[#333]"><ArrowLeft className="h-3.5 w-3.5" /> Back to templates</Link><header className="mt-8"><div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", details.color)}><Icon className="h-5 w-5" strokeWidth={1.6} /></div><p className="mb-2 mt-5 text-[12px] font-medium uppercase tracking-[0.1em] text-[#9b9b9b]">New {details.label.toLowerCase()} template</p><h1 className="text-[30px] font-semibold tracking-[-0.04em] text-[#111]">Create a {details.label} template</h1><p className="mt-2 max-w-xl text-[13px] font-light leading-6 text-[#858585]">{details.description}</p></header><form onSubmit={saveTemplate} className="mt-8 rounded-[28px] bg-white/80 p-6 shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] sm:p-8"><label className="block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Template name</span><input required value={name} onChange={(event) => setName(event.target.value)} placeholder={isPush ? "e.g. Order ready" : "e.g. Appointment reminder"} className="form-input" /></label><label className="mt-5 block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Description <span className="font-normal text-[#aaa]">(optional)</span></span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is this template for?" className="form-input" /></label>{isPush ? <><label className="mt-5 block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Notification title</span><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Your order is ready" className="form-input" /></label><label className="mt-5 block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Message</span><textarea required value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Order #1234 is ready for pickup." className="min-h-28 w-full resize-y rounded-lg border border-[#dedede] bg-white px-3 py-2.5 text-[12px] leading-5 text-[#333] outline-none placeholder:text-[#aaa] focus:border-[#999] focus:ring-2 focus:ring-black/[0.04]" /></label><div className="mt-5 grid gap-5 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Action link <span className="font-normal text-[#aaa]">(optional)</span></span><input type="url" value={actionUrl} onChange={(event) => setActionUrl(event.target.value)} placeholder="https://app.example.com/orders/1234" className="form-input" /></label><label className="block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Image URL <span className="font-normal text-[#aaa]">(optional)</span></span><input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." className="form-input" /></label></div></> : <><label className="mt-5 block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Subject</span><input required={key === "email"} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="A quick note from us" className="form-input" /></label><label className="mt-5 block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Message</span><textarea required maxLength={1600} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={key === "email" ? "Write your plain-text email..." : "Hi {{first_name}}, just a quick reminder..."} className="min-h-36 w-full resize-y rounded-lg border border-[#dedede] bg-white px-3 py-2.5 text-[12px] leading-5 text-[#333] outline-none placeholder:text-[#aaa] focus:border-[#999] focus:ring-2 focus:ring-black/[0.04]" /><span className="mt-1.5 block text-right text-[11px] text-[#aaa]">{message.length}/1600</span></label></>}{error ? <p className="mt-4 text-[12px] text-red-500">{error}</p> : null}<div className="mt-6 flex justify-end gap-2"><Link href="/templates" className="rounded-lg px-3.5 py-2.5 text-[12px] font-medium text-[#666] transition hover:bg-[#f5f5f5]">Cancel</Link><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#111] px-3.5 py-2.5 text-[12px] font-medium text-white transition hover:bg-[#2a2a2a] disabled:cursor-wait disabled:opacity-60"><Save className="h-3.5 w-3.5" />{saving ? "Saving…" : "Save template"}</button></div></form></div></div>;
}
