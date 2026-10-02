"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowLeft, ArrowUp, Bold, Check, ChevronDown, ChevronLeft, Code2, Eye, Folder, Image, Italic, Layers, LayoutTemplate, Link2, List, ListOrdered, Mail, MessageCircleMore, Minus, MousePointerClick, Palette, Pencil, Plus, Redo2, Save, Search, Send, Settings2, Share, Smartphone, Sparkles, Strikethrough, Type, Underline, Undo2, Upload, UploadCloud, X, ZoomIn, ZoomOut } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@walls/utils";

import { EMAIL_UPLOAD_DRAG_MIME, EmailUploadsPanel, type EmailUploadAsset } from "./email-uploads-panel";
import { KenooAIPanel } from "./kenoo-ai-panel";

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
type ImageLayer = "foreground" | "background";
type LayerTarget =
  | { type: "text"; editorKey: string }
  | { type: "image"; imageKey: string }
  | { type: "button" };

type LayerItem = {
  key: string;
  label: string;
  target: LayerTarget;
};

const DEFAULT_HERO_EYEBROW = '<img src="/favicon.ico" alt="Kenoo" style="display:inline-block;width:96px;height:auto;max-height:40px;object-fit:contain" />';

type CanvasUploadImage = EmailUploadAsset & {
  key: string;
  section: EmailSectionKey;
  left: number;
  top: number;
  width: number;
  height: number;
};

type BuilderSnapshot = {
  name: string;
  description: string;
  subject: string;
  heroEyebrow: string;
  heroLogoUrl: string | null;
  heroHeadline: string;
  heroDescription: string;
  heroButtonLabel: string;
  buttonColor: string;
  buttonTextColor: string;
  buttonWidth: string;
  buttonHeight: string;
  buttonRadius: string;
  buttonFontFamily: string;
  buttonFontSize: string;
  buttonFontWeight: string;
  bodyHeading: string;
  bodyDescription: string;
  imagePlaceholder: string;
  sectionColors: Record<EmailSectionKey, string>;
  sectionHeights: Record<EmailSectionKey, string>;
  hiddenSections: EmailSectionKey[];
  sectionOrder: EmailSectionKey[];
  actionUrl: string;
  imageUrl: string;
  buttonPosition: { x: number; y: number };
  textPositions: Record<string, { x: number; y: number }>;
  imagePositions?: Record<string, { x: number; y: number }>;
  imageSizes?: Record<string, { width: number; height: number }>;
  imageRotations?: Record<string, number>;
  imageLayers?: Record<string, ImageLayer>;
  canvasUploads?: CanvasUploadImage[];
};

const textFontSizes = [
  { command: "1", label: "10", pixels: 10 },
  { command: "2", label: "12", pixels: 12 },
  { command: "3", label: "14", pixels: 14 },
  { command: "4", label: "18", pixels: 18 },
  { command: "5", label: "24", pixels: 24 },
  { command: "6", label: "32", pixels: 32 },
  { command: "7", label: "40", pixels: 40 },
] as const;

function visibleImageSize(image: HTMLImageElement) {
  const width = image.getBoundingClientRect().width;
  const height = image.getBoundingClientRect().height;
  const fit = window.getComputedStyle(image).objectFit;
  if ((fit !== "contain" && fit !== "scale-down") || !image.naturalWidth || !image.naturalHeight) {
    return { width, height };
  }
  const ratio = image.naturalWidth / image.naturalHeight;
  const visibleWidth = Math.min(width, height * ratio);
  return { width: visibleWidth, height: visibleWidth / ratio };
}

function setCanvasTopWorkspace(overflow: number) {
  const scroller = document.querySelector<HTMLElement>("main");
  const workspace = scroller?.firstElementChild;
  if (!scroller || !(workspace instanceof HTMLElement)) return;
  const currentPadding = Number.parseFloat(window.getComputedStyle(workspace).paddingTop) || 40;
  const nextPadding = 40 + Math.ceil(Math.max(0, overflow));
  if (Math.abs(nextPadding - currentPadding) < 1) return;
  workspace.style.paddingTop = nextPadding === 40 ? "" : `${nextPadding}px`;
  scroller.scrollTop += nextPadding - currentPadding;
}

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

function ToolbarDropdown({ id, openId, setOpenId, label, value, options, onChange, width = "w-[118px]", editable = false }: { id: string; openId: string | null; setOpenId: (id: string | null) => void; label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void; width?: string; editable?: boolean }) {
  const open = openId === id;
  const selected = options.find((option) => option.value === value) ?? options[0];
  const [draftValue, setDraftValue] = React.useState(selected?.label ?? "");

  function commitDraft(rawValue: string) {
    const numericValue = Number.parseFloat(rawValue);
    if (!editable || !Number.isFinite(numericValue)) {
      setDraftValue(selected?.label ?? "");
      return;
    }
    const closest = options.reduce((current, option) => Math.abs(Number(option.label) - numericValue) < Math.abs(Number(current.label) - numericValue) ? option : current, options[0]);
    setDraftValue(closest.label);
    onChange(closest.value);
  }

  return <div className={`relative ${width}`}>{editable ? <div className="flex h-8 items-center rounded-lg bg-[#f5f6f7] focus-within:ring-2 focus-within:ring-[#dff3f6]"><input aria-label={label} inputMode="numeric" value={draftValue} onChange={(event) => setDraftValue(event.target.value.replace(/[^0-9]/g, ""))} onBlur={(event) => commitDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commitDraft(event.currentTarget.value); event.currentTarget.blur(); } }} className="min-w-0 flex-1 bg-transparent px-2.5 text-[11px] text-[#444] outline-none" /><button type="button" aria-label={`Choose ${label}`} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpenId(open ? null : id)} className="flex h-full shrink-0 items-center gap-1.5 border-l border-[#e1e3e5] px-2.5 text-[#666] transition hover:bg-[#edf8fa] hover:text-[#4d9eae]"><ChevronDown className={cn("h-3 w-3 transition-transform", open ? "rotate-180" : "")} /></button></div> : <button type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpenId(open ? null : id)} className="flex h-8 w-full items-center justify-between gap-2 rounded-lg bg-[#f5f6f7] px-2.5 text-[11px] text-[#444] outline-none transition hover:bg-[#edf8fa] hover:text-[#4d9eae]"><span className="truncate" style={id === "font" ? { fontFamily: selected?.value } : undefined}>{selected?.label}</span><ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", open ? "rotate-180" : "")} /></button>}{open ? <div role="listbox" aria-label={label} className="absolute left-0 top-[calc(100%+6px)] z-[60] min-w-full overflow-hidden rounded-xl border border-[#e1e4e7] bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.16)]">{options.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => { onChange(option.value); setDraftValue(option.label); setOpenId(null); }} className={cn("flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[11px] transition", option.value === value ? "bg-[#edf8fa] font-medium text-[#4d9eae]" : "text-[#444] hover:bg-[#f5f6f7]")} style={id === "font" ? { fontFamily: option.value } : undefined}>{option.label}{option.value === value ? <Check className="h-3 w-3" /> : null}</button>)}</div> : null}</div>;
}

export function CreateTemplatePage({ channel, initialFormat, templateId: initialTemplateId }: { channel: string; initialFormat?: string; templateId?: string }) {
  const router = useRouter();
  const [resolvedChannel, setResolvedChannel] = React.useState(channel.toLowerCase());
  const key = resolvedChannel as keyof typeof channelDetails;
  const details = channelDetails[key] ?? channelDetails.email;
  const Icon = details.icon;
  const isPush = key === "push";
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const initialEmailFormat = key === "email" && initialFormat === "html" ? "html" : key === "email" && initialFormat === "plain" ? "plain" : key === "email" ? null : "plain";
  const [emailFormat, setEmailFormat] = React.useState<"plain" | "html" | null>(initialEmailFormat);
  const [subject, setSubject] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [heroEyebrow, setHeroEyebrow] = React.useState(DEFAULT_HERO_EYEBROW);
  const [heroLogoUrl, setHeroLogoUrl] = React.useState<string | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const [heroHeadline, setHeroHeadline] = React.useState("Make something people remember.");
  const [heroDescription, setHeroDescription] = React.useState("Build a beautiful email with the same thoughtful details your customers expect from Kenoo.");
  const [heroButtonLabel, setHeroButtonLabel] = React.useState("Shop the collection");
  const [buttonColor, setButtonColor] = React.useState("#6eadc0");
  const [buttonTextColor, setButtonTextColor] = React.useState("#ffffff");
  const [buttonWidth, setButtonWidth] = React.useState("auto");
  const [buttonHeight, setButtonHeight] = React.useState("44");
  const [buttonRadius, setButtonRadius] = React.useState("12");
  const [buttonFontFamily, setButtonFontFamily] = React.useState("Arial");
  const [buttonFontSize, setButtonFontSize] = React.useState("3");
  const [buttonFontWeight, setButtonFontWeight] = React.useState("600");
  const [bodyHeading, setBodyHeading] = React.useState("A little more context goes here");
  const [bodyDescription, setBodyDescription] = React.useState("Click any section to select it. Use the design sidebar to change its order.");
  const [imagePlaceholder, setImagePlaceholder] = React.useState("Drop an image here");
  const [sectionColors, setSectionColors] = React.useState<Record<EmailSectionKey, string>>({ hero: "#f7f4eb", text: "#ffffff", image: "#f4fbfc", divider: "#ffffff" });
  const [sectionHeights, setSectionHeights] = React.useState<Record<EmailSectionKey, string>>({ hero: "360", text: "190", image: "220", divider: "64" });
  // Images are placed into the section the user selected. Keep the legacy
  // image block available for older templates, but don't show it in new ones.
  const [hiddenSections, setHiddenSections] = React.useState<EmailSectionKey[]>(["image"]);
  const [sectionOrder, setSectionOrder] = React.useState<EmailSectionKey[]>(["hero", "text", "divider", "image"]);
  const [actionUrl, setActionUrl] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [templateId, setTemplateId] = React.useState<string | null>(initialTemplateId ?? null);
  const [templateLoaded, setTemplateLoaded] = React.useState(!initialTemplateId);
  const [saveStatus, setSaveStatus] = React.useState<"creating" | "saving" | "saved" | "error">("saved");
  const [historyState, setHistoryState] = React.useState({ canUndo: false, canRedo: false });
  const [aiThreadId, setAiThreadId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [sendTestOpen, setSendTestOpen] = React.useState(false);
  const [testEmail, setTestEmail] = React.useState("");
  const [sendingTest, setSendingTest] = React.useState(false);
  const [testSendError, setTestSendError] = React.useState<string | null>(null);
  const [testSendSuccess, setTestSendSuccess] = React.useState(false);
  const [editorMode, setEditorMode] = React.useState<(typeof emailEditorModes)[number]["value"]>("editing");
  const [editorModeOpen, setEditorModeOpen] = React.useState(false);
  const [selectedBlock, setSelectedBlock] = React.useState<"hero" | "text" | "image" | "button" | "divider">("hero");
  const [canvasSelectionActive, setCanvasSelectionActive] = React.useState(false);
  const buttonPositionRef = React.useRef({ x: 0, y: 0 });
  const textPositionsRef = React.useRef<Record<string, { x: number; y: number }>>({});
  const [buttonPosition, setButtonPosition] = React.useState({ x: 0, y: 0 });
  const [textPositions, setTextPositions] = React.useState<Record<string, { x: number; y: number }>>({});
  const [selectedTextKey, setSelectedTextKey] = React.useState<string | null>(null);
  const [selectedImageKey, setSelectedImageKey] = React.useState<string | null>(null);
  const [imageSelectionVersion, setImageSelectionVersion] = React.useState(0);
  const [editingTextKey, setEditingTextKey] = React.useState<string | null>(null);
  const imagePositionsRef = React.useRef<Record<string, { x: number; y: number }>>({});
  const [imagePositions, setImagePositions] = React.useState<Record<string, { x: number; y: number }>>({});
  const [imageSizes, setImageSizes] = React.useState<Record<string, { width: number; height: number }>>({});
  const [imageRotations, setImageRotations] = React.useState<Record<string, number>>({});
  const [imageLayers, setImageLayers] = React.useState<Record<string, ImageLayer>>({});
  const [canvasUploads, setCanvasUploads] = React.useState<CanvasUploadImage[]>([]);
  const [zoom, setZoom] = React.useState(100);
  const canvasRef = React.useRef<HTMLElement>(null);
  const zoomInputRef = React.useRef<HTMLInputElement>(null);
  const zoomLabelRef = React.useRef<HTMLSpanElement>(null);
  const zoomFrameRef = React.useRef<number | null>(null);
  const pendingZoomRef = React.useRef<number | null>(null);
  const [activeSidebarTool, setActiveSidebarTool] = React.useState<"add" | "layouts" | "uploads" | "folders" | "ai" | "design" | null>(null);
  const [layersOpen, setLayersOpen] = React.useState(false);
  const templateNameMeasureRef = React.useRef<HTMLSpanElement>(null);
  const editorModeRef = React.useRef<HTMLDivElement>(null);
  const activeTextEditorRef = React.useRef<HTMLElement | null>(null);
  const savedTextSelectionRef = React.useRef<Range | null>(null);
  const textToolbarRef = React.useRef<HTMLDivElement>(null);
  const [templateNameWidth, setTemplateNameWidth] = React.useState(110);
  const [textToolbarOpen, setTextToolbarOpen] = React.useState(false);
  const [textFontFamily, setTextFontFamily] = React.useState("Arial");
  const [textFontSize, setTextFontSize] = React.useState("3");
  const [textFontWeight, setTextFontWeight] = React.useState("400");
  const [textLineHeight, setTextLineHeight] = React.useState("Auto");
  const [textLetterSpacing, setTextLetterSpacing] = React.useState("0%");
  const [textColor, setTextColor] = React.useState("#333333");
  const [openTextDropdown, setOpenTextDropdown] = React.useState<string | null>(null);
  const heroEyebrowMarkup = React.useMemo(() => ({ __html: heroEyebrow }), [heroEyebrow]);
  const isPreviewMode = editorMode === "viewing";
  const historyRef = React.useRef<{ past: BuilderSnapshot[]; future: BuilderSnapshot[]; last: BuilderSnapshot | null; restoring: boolean }>({ past: [], future: [], last: null, restoring: false });
  const templateIdRef = React.useRef<string | null>(initialTemplateId ?? null);
  const templateLoadedRef = React.useRef(!initialTemplateId);
  const creatingTemplateRef = React.useRef(false);

  React.useEffect(() => {
    // Branding is only a starting default. An existing template's saved HTML wins.
    if (initialTemplateId || heroLogoUrl) return;
    let cancelled = false;
    void fetch("/api/branding")
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as { branding?: { dark_logo_url?: string | null } };
        if (response.ok && !cancelled) {
          const logoUrl = payload.branding?.dark_logo_url ?? null;
          if (logoUrl) setHeroEyebrow((current) => current === DEFAULT_HERO_EYEBROW ? `<img src="${logoUrl}" alt="Account logo" style="display:inline-block;width:180px;height:auto;max-height:48px;object-fit:contain" />` : current);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [heroLogoUrl, initialTemplateId]);

  React.useEffect(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/gif,image/webp";
    input.className = "hidden";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (file) void replaceHeroLogo(file);
      input.value = "";
    });
    document.body.appendChild(input);
    logoInputRef.current = input;
    return () => {
      input.remove();
      logoInputRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (emailFormat !== "html") return;
    const editorImage = (target: EventTarget | null) => target instanceof HTMLImageElement && target.closest("main section") ? target : null;
    const onMouseDown = (event: MouseEvent) => {
      if (isPreviewMode || !editorImage(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const onClick = (event: MouseEvent) => {
      if (isPreviewMode) return;
      const image = editorImage(event.target);
      if (!image) return;
      event.preventDefault();
      event.stopPropagation();
      const images = Array.from(document.querySelectorAll<HTMLImageElement>("main section img"));
      const imageKey = image.dataset.imageKey ?? (image.closest('[data-editor-key="hero-eyebrow"]') ? "hero-logo" : `image-${images.indexOf(image)}`);
      const measured = visibleImageSize(image);
      const canvasZoom = zoom / 100;
      const width = measured.width / canvasZoom;
      const height = measured.height / canvasZoom;
      if (width && height) setImageSizes((current) => current[imageKey] ? current : ({ ...current, [imageKey]: { width, height } }));
      setSelectedImageKey(imageKey);
      setImageSelectionVersion((current) => current + 1);
      setSelectedTextKey(null);
      setEditingTextKey(null);
      setTextToolbarOpen(false);
      activeTextEditorRef.current = null;
      savedTextSelectionRef.current = null;
      const section = image.closest<HTMLElement>("[data-section-key]")?.dataset.sectionKey;
      setSelectedBlock(section === "text" || section === "image" || section === "divider" ? section : "hero");
      setCanvasSelectionActive(true);
      setActiveSidebarTool("design");
    };
    const onDoubleClick = (event: MouseEvent) => {
      const image = editorImage(event.target);
      if (!image?.closest('[data-editor-key="hero-eyebrow"]') || isPreviewMode) return;
      event.preventDefault();
      event.stopPropagation();
      logoInputRef.current?.click();
    };
    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("dblclick", onDoubleClick, true);
    return () => {
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("dblclick", onDoubleClick, true);
    };
  }, [emailFormat, isPreviewMode, zoom]);

  React.useEffect(() => {
    if (!initialTemplateId) return;
    let cancelled = false;
    void fetch(`/api/templates/${initialTemplateId}`)
      .then(async (response) => {
        const result = await response.json().catch(() => ({})) as { template?: { channel?: string; name?: string; description?: string | null; subject?: string | null; title?: string | null; text_content?: string | null; html_content?: string | null; action_url?: string | null; image_url?: string | null; metadata?: { builder?: BuilderSnapshot } }; error?: string };
        if (!response.ok || !result.template) throw new Error(result.error ?? "Unable to load template");
        if (cancelled) return;
        const template = result.template;
        if (template.channel) setResolvedChannel(template.channel);
        setName(template.name ?? "");
        setDescription(template.description ?? "");
        setSubject(template.subject ?? "");
        setTitle(template.title ?? "");
        setMessage(template.text_content ?? "");
        setActionUrl(template.action_url ?? "");
        setImageUrl(template.image_url ?? "");
        if (template.channel === "email") setEmailFormat(template.html_content ? "html" : "plain");
        const builder = template.metadata?.builder;
        if (builder) applyBuilderSnapshot(builder);
        templateLoadedRef.current = true;
        setTemplateLoaded(true);
      })
      .catch((caught) => { if (!cancelled) { templateLoadedRef.current = true; setError(caught instanceof Error ? caught.message : "Unable to load template"); setTemplateLoaded(true); } });
    return () => { cancelled = true; };
  }, [initialTemplateId]);

  React.useEffect(() => {
    if (key === "email" && emailFormat === null && templateLoadedRef.current) router.replace("/templates");
  }, [emailFormat, initialTemplateId, key, router]);

  const builderSnapshot = React.useMemo<BuilderSnapshot>(() => ({
    name,
    description,
    subject,
    heroEyebrow,
    heroLogoUrl,
    heroHeadline,
    heroDescription,
    heroButtonLabel,
    buttonColor,
    buttonTextColor,
    buttonWidth,
    buttonHeight,
    buttonRadius,
    buttonFontFamily,
    buttonFontSize,
    buttonFontWeight,
    bodyHeading,
    bodyDescription,
    imagePlaceholder,
    sectionColors,
    sectionHeights,
    hiddenSections,
    sectionOrder,
    actionUrl,
    imageUrl,
    buttonPosition,
    textPositions,
    imagePositions,
    imageSizes,
    imageRotations,
    imageLayers,
    canvasUploads,
  }), [name, description, subject, heroEyebrow, heroLogoUrl, heroHeadline, heroDescription, heroButtonLabel, buttonColor, buttonTextColor, buttonWidth, buttonHeight, buttonRadius, buttonFontFamily, buttonFontSize, buttonFontWeight, bodyHeading, bodyDescription, imagePlaceholder, sectionColors, sectionHeights, hiddenSections, sectionOrder, actionUrl, imageUrl, buttonPosition, textPositions, imagePositions, imageSizes, imageRotations, imageLayers, canvasUploads]);

  function updateHistoryControls() {
    setHistoryState({ canUndo: historyRef.current.past.length > 0, canRedo: historyRef.current.future.length > 0 });
  }

  React.useEffect(() => {
    const history = historyRef.current;
    if (history.last === null) {
      history.last = builderSnapshot;
      updateHistoryControls();
      return;
    }
    if (JSON.stringify(history.last) === JSON.stringify(builderSnapshot)) return;
    if (history.restoring) {
      history.restoring = false;
      history.last = builderSnapshot;
      updateHistoryControls();
      return;
    }
    history.past.push(history.last);
    history.future = [];
    history.last = builderSnapshot;
    updateHistoryControls();
  }, [builderSnapshot]);

  function applyBuilderSnapshot(snapshot: BuilderSnapshot) {
    historyRef.current.restoring = true;
    setName(snapshot.name);
    setDescription(snapshot.description);
    setSubject(snapshot.subject);
    setHeroEyebrow(snapshot.heroEyebrow);
    setHeroLogoUrl(snapshot.heroLogoUrl ?? null);
    setHeroHeadline(snapshot.heroHeadline);
    setHeroDescription(snapshot.heroDescription);
    setHeroButtonLabel(snapshot.heroButtonLabel);
    setButtonColor(snapshot.buttonColor);
    setButtonTextColor(snapshot.buttonTextColor);
    setButtonWidth(snapshot.buttonWidth);
    setButtonHeight(snapshot.buttonHeight);
    setButtonRadius(snapshot.buttonRadius);
    setButtonFontFamily(snapshot.buttonFontFamily);
    setButtonFontSize(snapshot.buttonFontSize);
    setButtonFontWeight(snapshot.buttonFontWeight);
    setBodyHeading(snapshot.bodyHeading);
    setBodyDescription(snapshot.bodyDescription);
    setImagePlaceholder(snapshot.imagePlaceholder);
    setSectionColors(snapshot.sectionColors);
    setSectionHeights(snapshot.sectionHeights);
    // Older templates always exposed the dedicated image placeholder. Keep
    // existing uploaded images visible, but retire the empty placeholder.
    const savedUploads = snapshot.canvasUploads ?? [];
    setHiddenSections(snapshot.hiddenSections.includes("image") || savedUploads.some((upload) => upload.section === "image")
      ? snapshot.hiddenSections
      : [...snapshot.hiddenSections, "image"]);
    setSectionOrder(snapshot.sectionOrder);
    setActionUrl(snapshot.actionUrl);
    setImageUrl(snapshot.imageUrl);
    buttonPositionRef.current = snapshot.buttonPosition;
    setButtonPosition(snapshot.buttonPosition);
    textPositionsRef.current = snapshot.textPositions;
    setTextPositions(snapshot.textPositions);
    imagePositionsRef.current = snapshot.imagePositions ?? {};
    setImagePositions(snapshot.imagePositions ?? {});
    setImageSizes(snapshot.imageSizes ?? {});
    setImageRotations(snapshot.imageRotations ?? {});
    setImageLayers(snapshot.imageLayers ?? {});
    setCanvasUploads(savedUploads);
  }

  async function replaceHeroLogo(file: File) {
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    try {
      const response = await fetch("/api/template-uploads", { method: "POST", body: formData });
      const payload = await response.json().catch(() => ({})) as { upload?: { public_url?: string }; error?: string };
      if (!response.ok || !payload.upload?.public_url) throw new Error(payload.error ?? "Unable to upload logo");
      setHeroLogoUrl(payload.upload.public_url);
      setHeroEyebrow(`<img src="${payload.upload.public_url}" alt="Account logo" style="display:inline-block;width:180px;height:auto;max-height:48px;object-fit:contain" />`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upload logo");
    } finally {
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  function undoBuilderChange() {
    const history = historyRef.current;
    const previous = history.past.pop();
    if (!previous || !history.last) return;
    history.future.push(history.last);
    history.last = previous;
    applyBuilderSnapshot(previous);
    updateHistoryControls();
  }

  function redoBuilderChange() {
    const history = historyRef.current;
    const next = history.future.pop();
    if (!next || !history.last) return;
    history.past.push(history.last);
    history.last = next;
    applyBuilderSnapshot(next);
    updateHistoryControls();
  }

  React.useEffect(() => {
    if (emailFormat !== "html" || !templateLoaded) return;
    let cancelled = false;
    const payload = {
      name,
      description,
      channel: key,
      subject,
      textContent: "",
      htmlContent: '<div data-kenoo-template="true"></div>',
      metadata: { builder: builderSnapshot },
    };
    if (!templateIdRef.current && !initialTemplateId && !creatingTemplateRef.current) {
      creatingTemplateRef.current = true;
      setSaveStatus("creating");
      void fetch("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        .then(async (response) => {
          const result = await response.json().catch(() => ({})) as { template?: { id?: string; name?: string }; error?: string };
          if (!response.ok || !result.template?.id) throw new Error(result.error ?? "Unable to create template");
          if (cancelled) return;
          templateIdRef.current = result.template.id;
          setTemplateId(result.template.id);
          if (result.template.name) setName(result.template.name);
          if (aiThreadId) {
            await fetch(`/api/ai/threads/${aiThreadId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: result.template.id }) });
          }
          setSaveStatus("saved");
          router.replace(`/templates/${result.template.id}`);
        })
        .catch((caught) => { if (!cancelled) { setError(caught instanceof Error ? caught.message : "Unable to create template"); setSaveStatus("error"); } })
        .finally(() => { creatingTemplateRef.current = false; });
      return () => { cancelled = true; };
    }
    if (!templateIdRef.current) return;
    const timer = window.setTimeout(() => {
      setSaveStatus("saving");
      void fetch(`/api/templates/${templateIdRef.current}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        .then((response) => { if (!response.ok) throw new Error("Unable to autosave template"); setSaveStatus("saved"); })
        .catch((caught) => { setError(caught instanceof Error ? caught.message : "Unable to autosave template"); setSaveStatus("error"); });
    }, 650);
    return () => { window.clearTimeout(timer); };
  }, [emailFormat, key, name, description, subject, builderSnapshot, aiThreadId, initialTemplateId, templateLoaded]);

  function applyCanvasZoom(nextZoom: number) {
    const clampedZoom = Math.min(150, Math.max(50, nextZoom));
    pendingZoomRef.current = clampedZoom;
    if (zoomFrameRef.current !== null) return;
    zoomFrameRef.current = window.requestAnimationFrame(() => {
      zoomFrameRef.current = null;
      const frameZoom = pendingZoomRef.current;
      if (frameZoom === null) return;
      canvasRef.current?.style.setProperty("transform", `scale(${frameZoom / 100})`);
      if (zoomLabelRef.current) zoomLabelRef.current.textContent = `${frameZoom}%`;
    });
  }

  function commitCanvasZoom() {
    const nextZoom = pendingZoomRef.current;
    if (nextZoom === null) return;
    if (zoomFrameRef.current !== null) {
      window.cancelAnimationFrame(zoomFrameRef.current);
      zoomFrameRef.current = null;
    }
    pendingZoomRef.current = null;
    setZoom(nextZoom);
  }

  React.useEffect(() => {
    canvasRef.current = document.querySelector<HTMLElement>('main div[class*="max-w-[640px]"]');
    zoomInputRef.current = document.querySelector<HTMLInputElement>('input[aria-label="Zoom level"]');
    zoomLabelRef.current = zoomInputRef.current?.parentElement?.querySelector<HTMLSpanElement>(":scope > span:last-child") ?? null;
    if (zoomInputRef.current) zoomInputRef.current.value = String(zoom);
    if (zoomLabelRef.current) zoomLabelRef.current.textContent = `${zoom}%`;
    canvasRef.current?.style.setProperty("transform", `scale(${zoom / 100})`);
  }, [zoom]);

  React.useEffect(() => {
    const zoomInput = document.querySelector<HTMLInputElement>('input[aria-label="Zoom level"]');
    const canvas = document.querySelector<HTMLElement>('main div[class*="max-w-[640px]"]');
    const zoomLabel = zoomInput?.parentElement?.querySelector<HTMLSpanElement>(":scope > span:last-child");
    if (!zoomInput || !canvas) return;

    zoomInput.step = "1";
    canvas.style.willChange = "transform";
    const handleInput = (event: Event) => {
      event.stopPropagation();
      applyCanvasZoom(Number((event.currentTarget as HTMLInputElement).value));
    };
    const commitInput = () => {
      const nextZoom = Number(zoomInput.value);
      if (!Number.isFinite(nextZoom)) return;
      pendingZoomRef.current = nextZoom;
      commitCanvasZoom();
      if (zoomLabel) zoomLabel.textContent = `${nextZoom}%`;
    };
    zoomInput.addEventListener("input", handleInput);
    zoomInput.addEventListener("pointerup", commitInput);
    zoomInput.addEventListener("keyup", commitInput);
    zoomInput.addEventListener("blur", commitInput);
    return () => {
      zoomInput.removeEventListener("input", handleInput);
      zoomInput.removeEventListener("pointerup", commitInput);
      zoomInput.removeEventListener("keyup", commitInput);
      zoomInput.removeEventListener("blur", commitInput);
    };
  }, []);

  React.useEffect(() => () => {
    if (zoomFrameRef.current !== null) window.cancelAnimationFrame(zoomFrameRef.current);
  }, []);

  React.useEffect(() => {
    document.body.classList.toggle("email-template-preview-mode", isPreviewMode);
    if (!isPreviewMode) return () => document.body.classList.remove("email-template-preview-mode");
    const frame = window.requestAnimationFrame(() => {
      setActiveSidebarTool(null);
      setCanvasSelectionActive(false);
      setEditingTextKey(null);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.classList.remove("email-template-preview-mode");
    };
  }, [isPreviewMode]);

  React.useEffect(() => {
    if (emailFormat !== "html") return;
    const buttonText = document.querySelector<HTMLElement>('main section [data-editor-key="hero-button"]');
    if (!buttonText) return;
    const buttonFontSizePixels = textFontSizes.find((option) => option.command === buttonFontSize)?.pixels ?? 14;
    buttonText.contentEditable = "false";
    buttonText.style.fontFamily = buttonFontFamily;
    buttonText.style.fontSize = `${buttonFontSizePixels}px`;
    buttonText.style.fontWeight = buttonFontWeight;
    buttonText.style.color = buttonTextColor;
    const selectButton = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setSelectedBlock("button");
      setSelectedTextKey(null);
      setSelectedImageKey(null);
      setEditingTextKey(null);
      setTextToolbarOpen(false);
      setActiveSidebarTool("design");
      setCanvasSelectionActive(true);
    };
    buttonText.addEventListener("click", selectButton);
    return () => buttonText.removeEventListener("click", selectButton);
  }, [buttonFontFamily, buttonFontSize, buttonFontWeight, buttonTextColor, emailFormat]);

  React.useLayoutEffect(() => {
    if (emailFormat !== "html") return;
    const canvas = document.querySelector("main section");
    if (!(canvas instanceof HTMLElement)) return;
    canvas.style.display = "flex";
    canvas.style.flexDirection = "column";
    canvas.style.overflow = isPreviewMode ? "" : "visible";
    const blocks = Array.from(canvas.children).filter((child): child is HTMLElement => child instanceof HTMLElement).slice(0, 4);
    const blockKeys: EmailSectionKey[] = ["hero", "text", "image", "divider"];
    const zoomScale = zoom / 100;
    const canvasImages = Array.from(canvas.querySelectorAll<HTMLImageElement>("img"));
    canvasImages.forEach((image, index) => {
      const imageKey = image.dataset.imageKey ?? (image.closest('[data-editor-key="hero-eyebrow"]') ? "hero-logo" : `image-${index}`);
      const size = imageSizes[imageKey];
      const position = imagePositionsRef.current[imageKey];
      if (size) {
        image.style.width = `${size.width}px`;
        image.style.height = `${size.height}px`;
        image.style.maxWidth = "none";
        image.style.maxHeight = "none";
      }
      image.style.transform = `translate(${position?.x ?? 0}px, ${position?.y ?? 0}px) rotate(${imageRotations[imageKey] ?? 0}deg)`;
    });
    const hero = blocks[0];
    const heroButton = hero?.querySelector<HTMLElement>("button");
    if (heroButton) heroButton.style.transform = `translate(${buttonPositionRef.current.x}px, ${buttonPositionRef.current.y}px)`;
    canvas.querySelectorAll<HTMLElement>("[data-editor-key]").forEach((editor) => {
      const position = textPositionsRef.current[editor.dataset.editorKey ?? ""];
      if (position) editor.style.transform = `translate(${position.x}px, ${position.y}px)`;
    });

    function makeHandle(label: string) {
      const handle = document.createElement("div");
      handle.className = "email-template-drag-handle";
      handle.setAttribute("role", "button");
      handle.setAttribute("tabindex", "0");
      handle.setAttribute("aria-label", `Drag to move ${label}`);
      handle.innerHTML = '<span aria-hidden="true">⋮⋮</span><span>Drag to move</span>';
      handle.addEventListener("click", (event) => event.stopPropagation());
      return handle;
    }

    const cleanups = blocks.map((block, index) => {
      const sectionKey = blockKeys[index];
      block.classList.add("email-template-sortable-block");
      block.setAttribute("data-section-key", sectionKey);
      block.style.order = String(sectionOrder.indexOf(sectionKey));
      if (isPreviewMode || !canvasSelectionActive || selectedBlock !== sectionKey || selectedTextKey || selectedImageKey) return () => {};

      return () => {
        block.style.transform = "";
      };
    });
    let nudgeSelected: ((x: number, y: number) => void) | null = null;
    let buttonCleanup = () => {};
    if (!isPreviewMode && canvasSelectionActive && selectedBlock === "button" && hero && heroButton) {
      const handle = makeHandle("button");
      handle.title = "Arrow keys move 1 px. Hold Command (Ctrl on Windows) while dragging to disable snapping";
      handle.classList.add("email-template-button-drag-handle");
      hero.appendChild(handle);
      const verticalGuide = document.createElement("div");
      verticalGuide.className = "email-template-center-guide email-template-center-guide-vertical";
      verticalGuide.setAttribute("aria-hidden", "true");
      const horizontalGuide = document.createElement("div");
      horizontalGuide.className = "email-template-center-guide email-template-center-guide-horizontal";
      horizontalGuide.setAttribute("aria-hidden", "true");
      hero.append(verticalGuide, horizontalGuide);
      const placeHandle = () => {
        handle.style.left = `${heroButton.offsetLeft + heroButton.offsetWidth / 2 + buttonPositionRef.current.x}px`;
        handle.style.top = `${Math.max(4, heroButton.offsetTop + buttonPositionRef.current.y - 30)}px`;
      };
      placeHandle();
      nudgeSelected = (dx, dy) => {
        const current = buttonPositionRef.current;
        const x = Math.max(16 - heroButton.offsetLeft, Math.min(hero.clientWidth - heroButton.offsetLeft - heroButton.offsetWidth - 16, current.x + dx));
        const y = Math.max(32 - heroButton.offsetTop, Math.min(hero.clientHeight - heroButton.offsetTop - heroButton.offsetHeight - 16, current.y + dy));
        buttonPositionRef.current = { x, y };
        setButtonPosition({ x, y });
        heroButton.style.transform = `translate(${x}px, ${y}px)`;
        placeHandle();
      };
      let startX = 0;
      let startY = 0;
      let origin = { x: 0, y: 0 };
      const onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        startX = event.clientX;
        startY = event.clientY;
        origin = { ...buttonPositionRef.current };
        heroButton.style.transitionProperty = "none";
        handle.setPointerCapture(event.pointerId);
        handle.classList.add("email-template-drag-handle-active");
      };
      const onPointerMove = (event: PointerEvent) => {
        if (!handle.hasPointerCapture(event.pointerId)) return;
        event.preventDefault();
        const rawX = Math.max(16 - heroButton.offsetLeft, Math.min(hero.clientWidth - heroButton.offsetLeft - heroButton.offsetWidth - 16, origin.x + (event.clientX - startX) / zoomScale));
        const rawY = Math.max(32 - heroButton.offsetTop, Math.min(hero.clientHeight - heroButton.offsetTop - heroButton.offsetHeight - 16, origin.y + (event.clientY - startY) / zoomScale));
        const centerX = hero.clientWidth / 2 - heroButton.offsetLeft - heroButton.offsetWidth / 2;
        const centerY = hero.clientHeight / 2 - heroButton.offsetTop - heroButton.offsetHeight / 2;
        const snapDistance = 10 / zoomScale;
        const disableSnap = event.metaKey || event.ctrlKey;
        const snapX = !disableSnap && Math.abs(rawX - centerX) <= snapDistance;
        const snapY = !disableSnap && Math.abs(rawY - centerY) <= snapDistance;
        const x = snapX ? centerX : rawX;
        const y = snapY ? centerY : rawY;
        verticalGuide.classList.toggle("email-template-center-guide-visible", snapX);
        horizontalGuide.classList.toggle("email-template-center-guide-visible", snapY);
        buttonPositionRef.current = { x, y };
        heroButton.style.transform = `translate(${x}px, ${y}px)`;
        placeHandle();
      };
      const finishDrag = (event: PointerEvent) => {
        if (!handle.hasPointerCapture(event.pointerId)) return;
        handle.releasePointerCapture(event.pointerId);
        handle.classList.remove("email-template-drag-handle-active");
        verticalGuide.classList.remove("email-template-center-guide-visible");
        horizontalGuide.classList.remove("email-template-center-guide-visible");
        heroButton.style.removeProperty("transition-property");
        if (event.type === "pointercancel") {
          buttonPositionRef.current = origin;
          setButtonPosition(origin);
          heroButton.style.transform = `translate(${origin.x}px, ${origin.y}px)`;
          placeHandle();
        }
        setButtonPosition({ ...buttonPositionRef.current });
      };
      handle.addEventListener("pointerdown", onPointerDown);
      handle.addEventListener("pointermove", onPointerMove);
      handle.addEventListener("pointerup", finishDrag);
      handle.addEventListener("pointercancel", finishDrag);
      buttonCleanup = () => {
        handle.removeEventListener("pointerdown", onPointerDown);
        handle.removeEventListener("pointermove", onPointerMove);
        handle.removeEventListener("pointerup", finishDrag);
        handle.removeEventListener("pointercancel", finishDrag);
        handle.remove();
        verticalGuide.remove();
        horizontalGuide.remove();
      };
    }
    let textCleanup = () => {};
    const selectedEditor = Array.from(canvas.querySelectorAll<HTMLElement>("[data-editor-key]")).find((editor) => editor.dataset.editorKey === selectedTextKey);
    const textBlock = selectedEditor?.closest<HTMLElement>("[data-section-key]");
    if (!isPreviewMode && canvasSelectionActive && selectedTextKey && selectedEditor && textBlock?.dataset.sectionKey === selectedBlock) {
      selectedEditor.setAttribute("data-selected-text", "true");
      const outline = document.createElement("div");
      outline.className = "email-template-text-selection-outline";
      outline.setAttribute("aria-hidden", "true");
      textBlock.appendChild(outline);
      const handle = makeHandle("text");
      handle.title = "Arrow keys move 1 px. Hold Command (Ctrl on Windows) while dragging to disable snapping";
      handle.classList.add("email-template-text-drag-handle");
      textBlock.appendChild(handle);
      const verticalGuide = document.createElement("div");
      verticalGuide.className = "email-template-center-guide email-template-center-guide-vertical";
      verticalGuide.setAttribute("aria-hidden", "true");
      const horizontalGuide = document.createElement("div");
      horizontalGuide.className = "email-template-center-guide email-template-center-guide-horizontal";
      horizontalGuide.setAttribute("aria-hidden", "true");
      textBlock.append(verticalGuide, horizontalGuide);
      const position = textPositionsRef.current[selectedTextKey] ?? { x: 0, y: 0 };
      const textBounds = () => {
        const range = document.createRange();
        range.selectNodeContents(selectedEditor);
        const bounds = range.getBoundingClientRect();
        return bounds.width && bounds.height ? bounds : selectedEditor.getBoundingClientRect();
      };
      const placeHandle = () => {
        const bounds = textBounds();
        const parentBounds = textBlock.getBoundingClientRect();
        handle.style.left = `${(bounds.left + bounds.width / 2 - parentBounds.left) / zoomScale}px`;
        handle.style.top = `${Math.max(4, (bounds.top - parentBounds.top) / zoomScale - 30)}px`;
        outline.style.left = `${(bounds.left - parentBounds.left) / zoomScale - 4}px`;
        outline.style.top = `${(bounds.top - parentBounds.top) / zoomScale - 4}px`;
        outline.style.width = `${bounds.width / zoomScale + 8}px`;
        outline.style.height = `${bounds.height / zoomScale + 8}px`;
      };
      placeHandle();
      nudgeSelected = (dx, dy) => {
        const current = textPositionsRef.current[selectedTextKey] ?? { x: 0, y: 0 };
        const bounds = textBounds();
        const parentBounds = textBlock.getBoundingClientRect();
        const minX = current.x + (parentBounds.left + 12 * zoomScale - bounds.left) / zoomScale;
        const maxX = current.x + (parentBounds.right - 12 * zoomScale - bounds.right) / zoomScale;
        const minY = current.y + (parentBounds.top + 12 * zoomScale - bounds.top) / zoomScale;
        const maxY = current.y + (parentBounds.bottom - 12 * zoomScale - bounds.bottom) / zoomScale;
        const x = Math.max(minX, Math.min(maxX, current.x + dx));
        const y = Math.max(minY, Math.min(maxY, current.y + dy));
        textPositionsRef.current[selectedTextKey] = { x, y };
        setTextPositions({ ...textPositionsRef.current });
        selectedEditor.style.transform = `translate(${x}px, ${y}px)`;
        placeHandle();
      };
      const resizeObserver = new ResizeObserver(placeHandle);
      resizeObserver.observe(selectedEditor);
      selectedEditor.addEventListener("input", placeHandle);
      let startX = 0;
      let startY = 0;
      let origin = position;
      let originBounds = textBounds();
      let parentBounds = textBlock.getBoundingClientRect();
      const onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        startX = event.clientX;
        startY = event.clientY;
        origin = { ...(textPositionsRef.current[selectedTextKey] ?? { x: 0, y: 0 }) };
        originBounds = textBounds();
        parentBounds = textBlock.getBoundingClientRect();
        handle.setPointerCapture(event.pointerId);
        handle.classList.add("email-template-drag-handle-active");
      };
      const onPointerMove = (event: PointerEvent) => {
        if (!handle.hasPointerCapture(event.pointerId)) return;
        event.preventDefault();
        const minX = origin.x + (parentBounds.left + 12 * zoomScale - originBounds.left) / zoomScale;
        const maxX = origin.x + (parentBounds.right - 12 * zoomScale - originBounds.right) / zoomScale;
        const minY = origin.y + (parentBounds.top + 12 * zoomScale - originBounds.top) / zoomScale;
        const maxY = origin.y + (parentBounds.bottom - 12 * zoomScale - originBounds.bottom) / zoomScale;
        const rawX = Math.max(minX, Math.min(maxX, origin.x + (event.clientX - startX) / zoomScale));
        const rawY = Math.max(minY, Math.min(maxY, origin.y + (event.clientY - startY) / zoomScale));
        const offsetX = (originBounds.left + originBounds.width / 2 - parentBounds.left - parentBounds.width / 2) / zoomScale;
        const offsetY = (originBounds.top + originBounds.height / 2 - parentBounds.top - parentBounds.height / 2) / zoomScale;
        const centerX = origin.x - offsetX;
        const centerY = origin.y - offsetY;
        const disableSnap = event.metaKey || event.ctrlKey;
        const snapX = !disableSnap && centerX >= minX && centerX <= maxX && Math.abs(rawX - centerX) <= 10 / zoomScale;
        const snapY = !disableSnap && centerY >= minY && centerY <= maxY && Math.abs(rawY - centerY) <= 10 / zoomScale;
        const x = snapX ? centerX : rawX;
        const y = snapY ? centerY : rawY;
        verticalGuide.classList.toggle("email-template-center-guide-visible", snapX);
        horizontalGuide.classList.toggle("email-template-center-guide-visible", snapY);
        textPositionsRef.current[selectedTextKey] = { x, y };
        selectedEditor.style.transform = `translate(${x}px, ${y}px)`;
        placeHandle();
      };
      const finishDrag = (event: PointerEvent) => {
        if (!handle.hasPointerCapture(event.pointerId)) return;
        handle.releasePointerCapture(event.pointerId);
        handle.classList.remove("email-template-drag-handle-active");
        verticalGuide.classList.remove("email-template-center-guide-visible");
        horizontalGuide.classList.remove("email-template-center-guide-visible");
        if (event.type === "pointercancel") {
          textPositionsRef.current[selectedTextKey] = origin;
          setTextPositions({ ...textPositionsRef.current });
          selectedEditor.style.transform = `translate(${origin.x}px, ${origin.y}px)`;
          placeHandle();
        }
        setTextPositions({ ...textPositionsRef.current });
      };
      handle.addEventListener("pointerdown", onPointerDown);
      handle.addEventListener("pointermove", onPointerMove);
      handle.addEventListener("pointerup", finishDrag);
      handle.addEventListener("pointercancel", finishDrag);
      textCleanup = () => {
        resizeObserver.disconnect();
        selectedEditor.removeEventListener("input", placeHandle);
        handle.removeEventListener("pointerdown", onPointerDown);
        handle.removeEventListener("pointermove", onPointerMove);
        handle.removeEventListener("pointerup", finishDrag);
        handle.removeEventListener("pointercancel", finishDrag);
        handle.remove();
        outline.remove();
        selectedEditor.removeAttribute("data-selected-text");
        verticalGuide.remove();
        horizontalGuide.remove();
      };
    }
    let imageCleanup = () => {};
    const selectedImage = selectedImageKey ? canvasImages.find((image, index) => (image.dataset.imageKey ?? (image.closest('[data-editor-key="hero-eyebrow"]') ? "hero-logo" : `image-${index}`)) === selectedImageKey) : null;
    const imageBlock = selectedImage?.closest<HTMLElement>("[data-section-key]");
    if (!isPreviewMode && canvasSelectionActive && selectedImageKey && selectedImage && imageBlock) {
      const outline = document.createElement("div");
      outline.className = "email-template-image-selection-outline";
      outline.setAttribute("aria-hidden", "true");
      const handle = makeHandle("image");
      handle.title = "Hold Command (Ctrl on Windows) while dragging to disable snapping";
      handle.classList.add("email-template-image-drag-handle");
      const verticalGuide = document.createElement("div");
      verticalGuide.className = "email-template-center-guide email-template-center-guide-vertical";
      verticalGuide.setAttribute("aria-hidden", "true");
      const horizontalGuide = document.createElement("div");
      horizontalGuide.className = "email-template-center-guide email-template-center-guide-horizontal";
      horizontalGuide.setAttribute("aria-hidden", "true");
      const corners = (["top-left", "top-right", "bottom-right", "bottom-left"] as const).map((corner) => {
        const grip = document.createElement("div");
        grip.className = `email-template-image-resize-handle email-template-image-resize-${corner}`;
        grip.setAttribute("role", "button");
        grip.setAttribute("tabindex", "0");
        grip.setAttribute("aria-label", `Resize image from ${corner.replace("-", " ")}`);
        grip.title = "Drag to resize image";
        return { corner, grip };
      });
      imageBlock.append(verticalGuide, horizontalGuide, outline, handle, ...corners.map(({ grip }) => grip));
      const getBounds = () => imageBlock.getBoundingClientRect();
      const rotation = imageRotations[selectedImageKey] ?? 0;
      const angle = rotation * Math.PI / 180;
      const rotatedCorner = (width: number, height: number, signX: number, signY: number, centerX: number, centerY: number) => ({
        x: centerX + (signX * width / 2 * Math.cos(angle) - signY * height / 2 * Math.sin(angle)) * zoomScale,
        y: centerY + (signX * width / 2 * Math.sin(angle) + signY * height / 2 * Math.cos(angle)) * zoomScale,
      });
      const placeControls = () => {
        const bounds = selectedImage.getBoundingClientRect();
        const parentBounds = getBounds();
        const centerX = bounds.left + bounds.width / 2;
        const centerY = bounds.top + bounds.height / 2;
        const styles = window.getComputedStyle(selectedImage);
        const width = Number.parseFloat(styles.width) || selectedImage.offsetWidth;
        const height = Number.parseFloat(styles.height) || selectedImage.offsetHeight;
        outline.style.left = `${(centerX - parentBounds.left) / zoomScale - width / 2}px`;
        outline.style.top = `${(centerY - parentBounds.top) / zoomScale - height / 2}px`;
        outline.style.width = `${width}px`;
        outline.style.height = `${height}px`;
        outline.style.transform = `rotate(${rotation}deg)`;
        const top = rotatedCorner(width, height, 0, -1, centerX, centerY);
        handle.style.left = `${(top.x - parentBounds.left) / zoomScale}px`;
        handle.style.top = `${(top.y - parentBounds.top) / zoomScale - 30}px`;
        corners.forEach(({ corner, grip }) => {
          const point = rotatedCorner(width, height, corner.endsWith("left") ? -1 : 1, corner.startsWith("top") ? -1 : 1, centerX, centerY);
          grip.style.left = `${(point.x - parentBounds.left) / zoomScale}px`;
          grip.style.top = `${(point.y - parentBounds.top) / zoomScale}px`;
        });
        const canvasBounds = canvas.getBoundingClientRect();
        const handleBounds = handle.getBoundingClientRect();
        setCanvasTopWorkspace((canvasBounds.top - handleBounds.top) / zoomScale);
      };
      placeControls();
      const size = imageSizes[selectedImageKey] ?? { width: selectedImage.offsetWidth, height: selectedImage.offsetHeight };
      selectedImage.style.maxWidth = "none";
      selectedImage.style.maxHeight = "none";
      const position = imagePositionsRef.current[selectedImageKey] ?? { x: 0, y: 0 };
      const resizeObserver = new ResizeObserver(placeControls);
      resizeObserver.observe(selectedImage);
      let startX = 0;
      let startY = 0;
      let originPosition = position;
      let originSize = size;
      let originBounds = selectedImage.getBoundingClientRect();
      let fixedCorner = { x: 0, y: 0 };
      let movingImage = false;
      const beginPointer = (event: PointerEvent, target: HTMLElement, corner?: string) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        startX = event.clientX;
        startY = event.clientY;
        originPosition = imagePositionsRef.current[selectedImageKey] ?? { x: 0, y: 0 };
        originSize = imageSizes[selectedImageKey] ?? { width: selectedImage.offsetWidth, height: selectedImage.offsetHeight };
        originBounds = selectedImage.getBoundingClientRect();
        movingImage = !corner;
        if (corner) {
          const bounds = selectedImage.getBoundingClientRect();
          fixedCorner = rotatedCorner(originSize.width, originSize.height, corner.endsWith("left") ? 1 : -1, corner.startsWith("top") ? 1 : -1, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
        }
        target.setPointerCapture(event.pointerId);
        target.classList.add("email-template-drag-handle-active");
      };
      const moveImage = (event: PointerEvent) => {
        if (!(event.currentTarget as HTMLElement).hasPointerCapture(event.pointerId)) return;
        event.preventDefault();
        const parentBounds = getBounds();
        const rawX = originPosition.x + (event.clientX - startX) / zoomScale;
        const rawY = originPosition.y + (event.clientY - startY) / zoomScale;
        const centerX = originPosition.x + (parentBounds.left + parentBounds.width / 2 - originBounds.left - originBounds.width / 2) / zoomScale;
        const centerY = originPosition.y + (parentBounds.top + parentBounds.height / 2 - originBounds.top - originBounds.height / 2) / zoomScale;
        const disableSnap = event.metaKey || event.ctrlKey;
        const snapX = !disableSnap && Math.abs(rawX - centerX) <= 10 / zoomScale;
        const snapY = !disableSnap && Math.abs(rawY - centerY) <= 10 / zoomScale;
        const nextX = snapX ? centerX : rawX;
        const nextY = snapY ? centerY : rawY;
        verticalGuide.classList.toggle("email-template-center-guide-visible", snapX);
        horizontalGuide.classList.toggle("email-template-center-guide-visible", snapY);
        imagePositionsRef.current[selectedImageKey] = { x: nextX, y: nextY };
        selectedImage.style.transform = `translate(${nextX}px, ${nextY}px) rotate(${rotation}deg)`;
        placeControls();
      };
      const resizeImage = (event: PointerEvent, corner: string, grip: HTMLElement) => {
        if (!grip.hasPointerCapture(event.pointerId)) return;
        event.preventDefault();
        const ratio = originSize.height / Math.max(1, originSize.width);
        const dx = (event.clientX - startX) / zoomScale;
        const dy = (event.clientY - startY) / zoomScale;
        const localX = dx * Math.cos(angle) + dy * Math.sin(angle);
        const localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
        const signX = corner.endsWith("left") ? -1 : 1;
        const signY = corner.startsWith("top") ? -1 : 1;
        const deltaWidth = (localX * signX + localY * signY / ratio) / 2;
        const nextWidth = Math.max(32, Math.min(1200, originSize.width + deltaWidth));
        const nextSize = { width: nextWidth, height: nextWidth * ratio };
        selectedImage.style.width = `${nextSize.width}px`;
        selectedImage.style.height = `${nextSize.height}px`;
        selectedImage.style.maxWidth = "none";
        selectedImage.style.maxHeight = "none";
        selectedImage.style.transform = `translate(${originPosition.x}px, ${originPosition.y}px) rotate(${rotation}deg)`;
        const bounds = selectedImage.getBoundingClientRect();
        const opposite = rotatedCorner(nextSize.width, nextSize.height, -signX, -signY, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
        const nextPosition = { x: originPosition.x + (fixedCorner.x - opposite.x) / zoomScale, y: originPosition.y + (fixedCorner.y - opposite.y) / zoomScale };
        imagePositionsRef.current[selectedImageKey] = nextPosition;
        selectedImage.style.transform = `translate(${nextPosition.x}px, ${nextPosition.y}px) rotate(${rotation}deg)`;
        placeControls();
      };
      const finishImagePointer = (event: PointerEvent) => {
        const target = event.currentTarget as HTMLElement;
        if (!target.hasPointerCapture(event.pointerId)) return;
        target.releasePointerCapture(event.pointerId);
        target.classList.remove("email-template-drag-handle-active");
        verticalGuide.classList.remove("email-template-center-guide-visible");
        horizontalGuide.classList.remove("email-template-center-guide-visible");
        if (event.type === "pointercancel") {
          imagePositionsRef.current[selectedImageKey] = originPosition;
          selectedImage.style.width = `${originSize.width}px`;
          selectedImage.style.height = `${originSize.height}px`;
          selectedImage.style.transform = `translate(${originPosition.x}px, ${originPosition.y}px) rotate(${rotation}deg)`;
          setImagePositions({ ...imagePositionsRef.current });
          setImageSizes((current) => ({ ...current, [selectedImageKey]: originSize }));
        } else {
          const styles = window.getComputedStyle(selectedImage);
          const finishedSize = { width: Number.parseFloat(styles.width), height: Number.parseFloat(styles.height) };
          const targetBlock = movingImage && canvasUploads.some((upload) => upload.key === selectedImageKey)
            ? blocks.find((block) => {
              const bounds = block.getBoundingClientRect();
              return event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
            })
            : null;
          const targetSection = targetBlock?.dataset.sectionKey as EmailSectionKey | undefined;
          if (targetBlock && targetSection && targetBlock !== imageBlock) {
            const bounds = targetBlock.getBoundingClientRect();
            const nextLeft = Math.max(0, Math.min(targetBlock.clientWidth - finishedSize.width, (event.clientX - bounds.left) / zoomScale - finishedSize.width / 2));
            const nextTop = Math.max(0, Math.min(targetBlock.clientHeight - finishedSize.height, (event.clientY - bounds.top) / zoomScale - finishedSize.height / 2));
            imagePositionsRef.current[selectedImageKey] = { x: 0, y: 0 };
            setCanvasUploads((current) => current.map((upload) => upload.key === selectedImageKey ? { ...upload, section: targetSection, left: nextLeft, top: nextTop, width: finishedSize.width, height: finishedSize.height } : upload));
            setHiddenSections((current) => current.filter((section) => section !== targetSection));
            setSelectedBlock(targetSection);
          }
          setImagePositions({ ...imagePositionsRef.current });
          setImageSizes((current) => ({ ...current, [selectedImageKey]: finishedSize }));
        }
        movingImage = false;
        placeControls();
      };
      const beginMove = (event: PointerEvent) => beginPointer(event, handle);
      handle.addEventListener("pointerdown", beginMove);
      handle.addEventListener("pointermove", moveImage);
      handle.addEventListener("pointerup", finishImagePointer);
      handle.addEventListener("pointercancel", finishImagePointer);
      const beginImageMove = (event: PointerEvent) => beginPointer(event, selectedImage);
      selectedImage.addEventListener("pointerdown", beginImageMove);
      selectedImage.addEventListener("pointermove", moveImage);
      selectedImage.addEventListener("pointerup", finishImagePointer);
      selectedImage.addEventListener("pointercancel", finishImagePointer);
      const resizeListeners = corners.map(({ corner, grip }) => {
        const onDown = (event: PointerEvent) => beginPointer(event, grip, corner);
        const onMove = (event: PointerEvent) => resizeImage(event, corner, grip);
        grip.addEventListener("pointerdown", onDown);
        grip.addEventListener("pointermove", onMove);
        grip.addEventListener("pointerup", finishImagePointer);
        grip.addEventListener("pointercancel", finishImagePointer);
        return () => {
          grip.removeEventListener("pointerdown", onDown);
          grip.removeEventListener("pointermove", onMove);
          grip.removeEventListener("pointerup", finishImagePointer);
          grip.removeEventListener("pointercancel", finishImagePointer);
          grip.remove();
        };
      });
      imageCleanup = () => {
        resizeObserver.disconnect();
        handle.removeEventListener("pointerdown", beginMove);
        handle.removeEventListener("pointermove", moveImage);
        handle.removeEventListener("pointerup", finishImagePointer);
        handle.removeEventListener("pointercancel", finishImagePointer);
        selectedImage.removeEventListener("pointerdown", beginImageMove);
        selectedImage.removeEventListener("pointermove", moveImage);
        selectedImage.removeEventListener("pointerup", finishImagePointer);
        selectedImage.removeEventListener("pointercancel", finishImagePointer);
        resizeListeners.forEach((cleanup) => cleanup());
        outline.remove();
        handle.remove();
        verticalGuide.remove();
        horizontalGuide.remove();
        setCanvasTopWorkspace(0);
      };
    }
    const onArrowKey = (event: KeyboardEvent) => {
      if (!nudgeSelected || (selectedTextKey !== null && editingTextKey === selectedTextKey) || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const delta = event.key === "ArrowLeft" ? [-1, 0] : event.key === "ArrowRight" ? [1, 0] : event.key === "ArrowUp" ? [0, -1] : event.key === "ArrowDown" ? [0, 1] : null;
      if (!delta) return;
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, [role='textbox']")) return;
      if (document.activeElement && document.activeElement !== document.body && !canvas.contains(document.activeElement)) return;
      const editable = target instanceof Element ? target.closest('[contenteditable="true"]') : null;
      if (editable && editable !== selectedEditor) return;
      event.preventDefault();
      nudgeSelected(delta[0], delta[1]);
    };
    document.addEventListener("keydown", onArrowKey);
    return () => {
      document.removeEventListener("keydown", onArrowKey);
      textCleanup();
      imageCleanup();
      buttonCleanup();
      cleanups.forEach((cleanup) => cleanup());
      blocks.forEach((block) => {
        block.classList.remove("email-template-sortable-block", "email-template-sortable-block-dragging", "email-template-drop-before", "email-template-drop-after");
        block.removeAttribute("data-section-key");
        block.style.order = "";
      });
      canvas.style.display = "";
      canvas.style.flexDirection = "";
      canvas.style.overflow = "";
    };
  }, [canvasSelectionActive, canvasUploads, editingTextKey, emailFormat, heroEyebrow, imagePositions, imageRotations, imageSelectionVersion, imageSizes, isPreviewMode, sectionOrder, selectedBlock, selectedImageKey, selectedTextKey, zoom]);

  function toggleSidebarTool(tool: NonNullable<typeof activeSidebarTool>) {
    setActiveSidebarTool((current) => current === tool ? null : tool);
  }

  async function insertUpload(upload: EmailUploadAsset, section: EmailSectionKey = selectedBlock === "button" ? "hero" : selectedBlock, point?: { x: number; y: number }) {
    if (!upload.public_url || isPreviewMode) return;
    const canvas = document.querySelector<HTMLElement>("main section");
    const sectionIndex = { hero: 0, text: 1, image: 2, divider: 3 }[section];
    const block = canvas?.children[sectionIndex] as HTMLElement | undefined;
    const natural = new window.Image();
    natural.src = upload.public_url;
    await natural.decode().catch(() => undefined);
    const aspect = natural.naturalWidth && natural.naturalHeight ? natural.naturalWidth / natural.naturalHeight : 4 / 3;
    const availableWidth = Math.max(64, (block?.clientWidth ?? 640) - 48);
    const availableHeight = Math.max(64, (block?.clientHeight ?? Number(sectionHeights[section])) - 32);
    const width = Math.max(32, Math.min(280, natural.naturalWidth || 280, availableWidth, availableHeight * aspect));
    const height = width / aspect;
    const left = Math.max(0, Math.min((block?.clientWidth ?? 640) - width, (point?.x ?? (block?.clientWidth ?? 640) / 2) - width / 2));
    const top = Math.max(0, Math.min((block?.clientHeight ?? Number(sectionHeights[section])) - height, (point?.y ?? (block?.clientHeight ?? Number(sectionHeights[section])) / 2) - height / 2));
    const key = `upload-${crypto.randomUUID()}`;
    setCanvasUploads((current) => [...current, { ...upload, key, section, left, top, width, height }]);
    setImageSizes((current) => ({ ...current, [key]: { width, height } }));
    setHiddenSections((current) => current.filter((item) => item !== section));
    setSelectedImageKey(key);
    setSelectedBlock(section);
    setSelectedTextKey(null);
    setCanvasSelectionActive(true);
    setActiveSidebarTool("design");
  }

  function removeSelectedUpload() {
    if (!selectedImageKey || !canvasUploads.some((upload) => upload.key === selectedImageKey)) return;
    const key = selectedImageKey;
    setCanvasUploads((current) => current.filter((upload) => upload.key !== key));
    setImagePositions((current) => { const next = { ...current }; delete next[key]; imagePositionsRef.current = next; return next; });
    setImageSizes((current) => { const next = { ...current }; delete next[key]; return next; });
    setImageRotations((current) => { const next = { ...current }; delete next[key]; return next; });
    setImageLayers((current) => { const next = { ...current }; delete next[key]; return next; });
    setSelectedImageKey(null);
  }

  function renderCanvasUploads(section: EmailSectionKey) {
    return canvasUploads.filter((upload) => upload.section === section).map((upload) => {
      const layer = imageLayers[upload.key] ?? "foreground";
      return <div key={upload.key} className="email-template-upload-layer pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: layer === "background" ? 0 : 10 }}><img data-image-key={upload.key} data-image-layer={layer} src={upload.public_url} alt={upload.original_name} draggable={false} className="pointer-events-auto" style={{ position: "absolute", left: upload.left, top: upload.top, width: upload.width, height: upload.height, maxWidth: "none", maxHeight: "none", objectFit: "contain", cursor: "grab", touchAction: "none" }} /></div>;
    });
  }

  function dragUploadOverCanvas(event: React.DragEvent<HTMLElement>) {
    if (!event.dataTransfer.types.includes(EMAIL_UPLOAD_DRAG_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function dropUploadOnCanvas(event: React.DragEvent<HTMLElement>) {
    const data = event.dataTransfer.getData(EMAIL_UPLOAD_DRAG_MIME);
    if (!data) return;
    event.preventDefault();
    event.stopPropagation();
    let upload: EmailUploadAsset;
    try { upload = JSON.parse(data) as EmailUploadAsset; } catch { return; }
    if (typeof upload.id !== "string" || typeof upload.original_name !== "string" || typeof upload.public_url !== "string") return;
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-section-key]") : null;
    const sectionKey = target?.dataset.sectionKey;
    const section: EmailSectionKey = sectionKey === "hero" || sectionKey === "text" || sectionKey === "image" || sectionKey === "divider"
      ? sectionKey
      : selectedBlock === "button" ? "hero" : selectedBlock;
    const block = target ?? event.currentTarget.children[{ hero: 0, text: 1, image: 2, divider: 3 }[section]] as HTMLElement;
    const bounds = block.getBoundingClientRect();
    void insertUpload(upload, section, { x: (event.clientX - bounds.left) / (zoom / 100), y: (event.clientY - bounds.top) / (zoom / 100) });
  }

  function rememberTextSelection(editor: HTMLElement) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    activeTextEditorRef.current = editor;
    savedTextSelectionRef.current = range.cloneRange();
  }

  function syncTextFormatControls(editor: HTMLElement) {
    const styles = window.getComputedStyle(editor);
    const family = styles.fontFamily.split(",")[0]?.trim().replace(/["']/g, "") ?? "Arial";
    const normalizedFamily = family.toLowerCase();
    const supportedFamily = ["Geist", "Arial", "Georgia", "Tahoma", "Verdana", "Trebuchet MS"].find((font) => normalizedFamily === font.toLowerCase() || normalizedFamily.includes(font.toLowerCase()));
    setTextFontFamily(supportedFamily ?? "Arial");
    setTextFontWeight(styles.fontWeight || "400");
    const pixels = Number.parseFloat(styles.fontSize);
    const closestSize = textFontSizes.reduce((closest, option) => Math.abs(option.pixels - pixels) < Math.abs(closest.pixels - pixels) ? option : closest, textFontSizes[0]);
    setTextFontSize(closestSize.command);
    const color = styles.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (color) setTextColor(`#${[color[1], color[2], color[3]].map((channel) => Number(channel).toString(16).padStart(2, "0")).join("")}`);
  }

  function prepareTextSelection(event: React.MouseEvent<HTMLElement>) {
    if (event.detail === 1 && editingTextKey !== event.currentTarget.dataset.editorKey) event.preventDefault();
  }

  function selectTextContainer(event: React.MouseEvent<HTMLElement>, block: EmailSectionKey) {
    event.stopPropagation();
    if (event.detail > 1) return;
    const editor = event.currentTarget;
    const editorKey = editor.dataset.editorKey;
    if (!editorKey || editingTextKey === editorKey) return;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    activeTextEditorRef.current = editor;
    const range = document.createRange();
    range.selectNodeContents(editor);
    savedTextSelectionRef.current = range;
    setEditingTextKey(null);
    setSelectedImageKey(null);
    setSelectedTextKey(editorKey);
    setSelectedBlock(block);
    setCanvasSelectionActive(true);
    setActiveSidebarTool("design");
    setTextToolbarOpen(true);
    syncTextFormatControls(editor);
  }

  function beginTextEditing(event: React.MouseEvent<HTMLElement>, block: EmailSectionKey) {
    event.stopPropagation();
    const editor = event.currentTarget;
    const editorKey = editor.dataset.editorKey;
    if (!editorKey) return;
    const { clientX, clientY } = event;
    activeTextEditorRef.current = editor;
    setSelectedTextKey(editorKey);
    setSelectedImageKey(null);
    setSelectedBlock(block);
    setCanvasSelectionActive(true);
    setActiveSidebarTool("design");
    setTextToolbarOpen(true);
    setEditingTextKey(editorKey);
    syncTextFormatControls(editor);
    window.requestAnimationFrame(() => {
      editor.focus();
      const range = document.caretRangeFromPoint(clientX, clientY);
      const caret = range && editor.contains(range.startContainer) ? range : document.createRange();
      if (caret !== range) {
        caret.selectNodeContents(editor);
        caret.collapse(false);
      }
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(caret);
      rememberTextSelection(editor);
    });
  }

  function commitTextEditorContent(editor: HTMLElement) {
    const editorContent = editor.innerHTML;
    switch (editor.dataset.editorKey) {
      case "hero-eyebrow": setHeroEyebrow(editorContent); break;
      case "hero-headline": setHeroHeadline(editorContent); break;
      case "hero-description": setHeroDescription(editorContent); break;
      case "hero-button": setHeroButtonLabel(editorContent); break;
      case "body-heading": setBodyHeading(editorContent); break;
      case "body-description": setBodyDescription(editorContent); break;
      case "image-placeholder": setImagePlaceholder(editorContent); break;
    }
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function restoreTextSelection(editor: HTMLElement) {
    const selection = window.getSelection();
    if (!selection) return null;
    const savedSelection = savedTextSelectionRef.current;
    if (savedSelection && editor.contains(savedSelection.commonAncestorContainer)) {
      selection.removeAllRanges();
      selection.addRange(savedSelection);
    }
    return selection;
  }

  function applyTextWeight(weight: string) {
    const editor = activeTextEditorRef.current;
    if (!editor) return;
    const keepEditing = editingTextKey === editor.dataset.editorKey;
    editor.focus();
    const selection = restoreTextSelection(editor);
    if (!selection?.rangeCount) return;
    editor.querySelectorAll<HTMLElement>("[style*='font-weight']").forEach((element) => element.style.removeProperty("font-weight"));
    editor.querySelectorAll("b, strong").forEach((element) => {
      const parent = element.parentNode;
      if (!parent) return;
      while (element.firstChild) parent.insertBefore(element.firstChild, element);
      parent.removeChild(element);
    });
    editor.style.fontWeight = weight;
    savedTextSelectionRef.current = selection.getRangeAt(0).cloneRange();
    setTextFontWeight(weight);
    commitTextEditorContent(editor);
    if (!keepEditing) {
      editor.blur();
      selection.removeAllRanges();
    }
  }

  function applyTextCommand(command: string, value?: string) {
    const editor = activeTextEditorRef.current;
    if (!editor) return;
    const keepEditing = editingTextKey === editor.dataset.editorKey;
    editor.focus();
    const selection = restoreTextSelection(editor);
    document.execCommand(command, false, value ?? "");
    savedTextSelectionRef.current = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    commitTextEditorContent(editor);
    if (!keepEditing) {
      editor.blur();
      selection?.removeAllRanges();
    }
  }

  function addTextLink() {
    const url = window.prompt("Enter a link URL");
    if (url?.trim()) applyTextCommand("createLink", url.trim());
  }

  function setTextMetric(property: "lineHeight" | "letterSpacing", value: string) {
    const editor = activeTextEditorRef.current;
    if (!editor) return;
    editor.style[property] = value === "Auto" ? "" : property === "letterSpacing" ? `${value.replace("%", "")}%` : value;
  }

  const textFormattingToolbar = textToolbarOpen ? <div ref={textToolbarRef} role="toolbar" aria-label="Text formatting" className="min-h-full bg-white text-[#222]">
    <div className="border-b border-[#e9eaec] px-5 py-5"><p className="mb-4 text-[14px] font-semibold tracking-[-0.01em]">Layout</p><div className="grid grid-cols-2 gap-3"><div><span className="mb-1.5 block text-[11px] text-[#8b8f94]">Width</span><div className="flex h-9 items-center rounded-lg bg-[#f5f5f5] px-3 text-[12px] text-[#85898d]"><span>Auto</span></div></div><div><span className="mb-1.5 block text-[11px] text-[#8b8f94]">Height</span><div className="flex h-9 items-center rounded-lg bg-[#f5f5f5] px-3 text-[12px] text-[#85898d]"><span>Auto</span></div></div></div></div>
    <div className="border-b border-[#e9eaec] px-5 py-5"><div className="mb-4 flex items-center justify-between"><p className="text-[14px] font-semibold tracking-[-0.01em]">Typography</p><span className="text-[18px] leading-none text-[#555]">⁙</span></div><div className="space-y-3"><ToolbarDropdown id="font" openId={openTextDropdown} setOpenId={setOpenTextDropdown} label="Font family" value={textFontFamily} width="w-full" options={[{ value: "Geist", label: "Geist" }, { value: "Arial", label: "Arial" }, { value: "Georgia", label: "Georgia" }, { value: "Tahoma", label: "Tahoma" }, { value: "Verdana", label: "Verdana" }, { value: "Trebuchet MS", label: "Trebuchet" }]} onChange={(value) => { setTextFontFamily(value); applyTextCommand("fontName", value); }} /><div className="grid grid-cols-2 gap-3"><ToolbarDropdown id="weight" openId={openTextDropdown} setOpenId={setOpenTextDropdown} label="Font weight" value={textFontWeight} width="w-full" options={[{ value: "300", label: "Light" }, { value: "400", label: "Regular" }, { value: "500", label: "Medium" }, { value: "600", label: "Semibold" }, { value: "700", label: "Bold" }]} onChange={(value) => { setTextFontWeight(value); applyTextWeight(value); }} /><ToolbarDropdown key={`font-size-${textFontSize}`} id="font-size" openId={openTextDropdown} setOpenId={setOpenTextDropdown} label="Font size" value={textFontSize} width="w-full" editable options={textFontSizes.map((option) => ({ value: option.command, label: String(option.pixels) }))} onChange={(value) => { setTextFontSize(value); applyTextCommand("fontSize", value); }} /></div><div className="grid grid-cols-2 gap-3"><ScrubField label="Line height" value={textLineHeight} onChange={(value) => { setTextLineHeight(value); setTextMetric("lineHeight", value); }} prefix="A̅" placeholder="Auto" /><ScrubField label="Letter spacing" value={textLetterSpacing} onChange={(value) => { setTextLetterSpacing(value); setTextMetric("letterSpacing", value); }} prefix="|A|" suffix="%" min={-20} max={100} /></div><div><span className="mb-1.5 block text-[11px] text-[#8b8f94]">Alignment</span><div className="flex h-9 overflow-hidden rounded-lg bg-[#f5f6f7]">{([[AlignLeft, "justifyLeft", "Align left"], [AlignCenter, "justifyCenter", "Align center"], [AlignRight, "justifyRight", "Align right"]] as const).map(([ButtonIcon, command, label]) => <button key={command} type="button" aria-label={label} onClick={() => applyTextCommand(command)} className="flex flex-1 items-center justify-center text-[#777] transition hover:bg-white hover:text-[#4d9eae]"><ButtonIcon className="h-4 w-4" /></button>)}</div></div></div></div>
    <div className="border-b border-[#e9eaec] px-5 py-5"><div className="mb-4 flex items-center justify-between"><p className="text-[14px] font-semibold tracking-[-0.01em]">Fill</p><span className="text-[20px] font-light leading-none text-[#555]">＋</span></div><FigmaColorRow label="Text color" color={textColor} onChange={(color) => { setTextColor(color); applyTextCommand("foreColor", color); }} /></div>
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
      if (target instanceof Element && target.closest(".email-template-drag-handle")) return;
      if (activeEditor?.contains(target) || textToolbarRef.current?.contains(target)) return;
      setTextToolbarOpen(false);
      setEditingTextKey(null);
      activeTextEditorRef.current = null;
      savedTextSelectionRef.current = null;
      if (!(target instanceof Element) || !target.closest("aside")) {
        setActiveSidebarTool(null);
        setCanvasSelectionActive(false);
      }
    }

    document.addEventListener("mousedown", handleTextToolbarOutsideClick);
    return () => document.removeEventListener("mousedown", handleTextToolbarOutsideClick);
  }, [textToolbarOpen]);

  React.useEffect(() => {
    function clearTextSelectionOnCanvasClick(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest("main") && !target.closest("[data-editor-key], .email-template-drag-handle, .email-template-image-resize-handle")) {
        setSelectedTextKey(null);
        setEditingTextKey(null);
        if (!target.closest("img")) setSelectedImageKey(null);
      }
    }
    document.addEventListener("mousedown", clearTextSelectionOnCanvasClick);
    return () => document.removeEventListener("mousedown", clearTextSelectionOnCanvasClick);
  }, []);

  const selectedSectionLabel = selectedBlock === "hero" ? "Hero section" : selectedBlock === "text" ? "Text section" : selectedBlock === "image" ? "Image section" : selectedBlock === "button" ? "Hero button" : "Divider";
  const selectedSection = selectedBlock === "button" ? "hero" : selectedBlock;
  const selectedSectionIndex = sectionOrder.indexOf(selectedSection);
  const visibleSectionOrder = sectionOrder.filter((section) => !hiddenSections.includes(section));
  const visibleSectionIndex = visibleSectionOrder.indexOf(selectedSection);
  const canMoveSectionUp = visibleSectionIndex > 0;
  const canMoveSectionDown = visibleSectionIndex >= 0 && visibleSectionIndex < visibleSectionOrder.length - 1;

  function moveSelectedSection(direction: -1 | 1) {
    if (selectedBlock === "button" || selectedSectionIndex < 0 || visibleSectionIndex < 0) return;
    const neighboringSection = visibleSectionOrder[visibleSectionIndex + direction];
    if (!neighboringSection) return;
    setSectionOrder((current) => {
      const next = [...current];
      const neighboringIndex = next.indexOf(neighboringSection);
      [next[selectedSectionIndex], next[neighboringIndex]] = [next[neighboringIndex], next[selectedSectionIndex]];
      return next;
    });
  }
  const buttonControls = <>
    <div className="border-b border-[#e5e6e8] px-5 py-5">
      <p className="mb-4 text-[14px] font-semibold tracking-[-0.01em]">Button content</p>
      <label className="block"><span className="mb-1.5 block text-[11px] text-[#8b8f94]">Text</span><input value={heroButtonLabel.replace(/<[^>]*>/g, "")} onChange={(event) => setHeroButtonLabel(event.target.value)} placeholder="Button label" className="h-9 w-full rounded-lg bg-[#f5f5f5] px-3 text-[12px] text-[#222] outline-none transition focus:bg-[#eeeeef] focus:ring-2 focus:ring-[#dff3f6]" /></label>
      <div className="mt-4 space-y-3">
        <ToolbarDropdown id="button-font" openId={openTextDropdown} setOpenId={setOpenTextDropdown} label="Button font family" value={buttonFontFamily} width="w-full" options={[{ value: "Geist", label: "Geist" }, { value: "Arial", label: "Arial" }, { value: "Georgia", label: "Georgia" }, { value: "Tahoma", label: "Tahoma" }, { value: "Verdana", label: "Verdana" }, { value: "Trebuchet MS", label: "Trebuchet" }]} onChange={setButtonFontFamily} />
        <div className="grid grid-cols-2 gap-3">
          <ToolbarDropdown id="button-weight" openId={openTextDropdown} setOpenId={setOpenTextDropdown} label="Button font weight" value={buttonFontWeight} width="w-full" options={[{ value: "400", label: "Regular" }, { value: "500", label: "Medium" }, { value: "600", label: "Semibold" }, { value: "700", label: "Bold" }]} onChange={setButtonFontWeight} />
          <ToolbarDropdown key={`button-font-size-${buttonFontSize}`} id="button-font-size" openId={openTextDropdown} setOpenId={setOpenTextDropdown} label="Button font size" value={buttonFontSize} width="w-full" editable options={textFontSizes.map((option) => ({ value: option.command, label: String(option.pixels) }))} onChange={setButtonFontSize} />
        </div>
      </div>
      <div className="mt-4"><p className="mb-2 text-[11px] text-[#8b8f94]">Text color</p><FigmaColorRow label="Button text color" color={buttonTextColor} onChange={setButtonTextColor} /></div>
    </div>
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
  const selectedImageSize = selectedImageKey ? imageSizes[selectedImageKey] : null;
  const selectedImageIsUpload = Boolean(selectedImageKey && canvasUploads.some((upload) => upload.key === selectedImageKey));
  const selectedImageLayer = selectedImageKey ? imageLayers[selectedImageKey] ?? "foreground" : "foreground";
  const imageControls = selectedImageKey ? <>
    <div className="border-b border-[#e5e6e8] px-5 py-5">
      <p className="mb-4 text-[14px] font-semibold tracking-[-0.01em]">Dimensions</p>
      <div className="grid grid-cols-2 gap-3">
        <ScrubField label="Width" value={String(Math.round(selectedImageSize?.width ?? 0))} onChange={(value) => { const width = Number(value); if (Number.isFinite(width) && width >= 1) setImageSizes((current) => ({ ...current, [selectedImageKey]: { width: Math.min(1200, width), height: current[selectedImageKey]?.height ?? 1 } })); }} min={1} max={1200} prefix="W" suffix="px" />
        <ScrubField label="Height" value={String(Math.round(selectedImageSize?.height ?? 0))} onChange={(value) => { const height = Number(value); if (Number.isFinite(height) && height >= 1) setImageSizes((current) => ({ ...current, [selectedImageKey]: { width: current[selectedImageKey]?.width ?? 1, height: Math.min(1200, height) } })); }} min={1} max={1200} prefix="H" suffix="px" />
      </div>
      <div className="mt-5 border-t border-[#eef0f1] pt-5">
        <ScrubField label="Rotation" value={String(imageRotations[selectedImageKey] ?? 0)} onChange={(value) => { const rotation = Number(value); if (Number.isFinite(rotation)) setImageRotations((current) => ({ ...current, [selectedImageKey]: Math.max(-180, Math.min(180, rotation)) })); }} min={-180} max={180} suffix="°" />
      </div>
    </div>
    {selectedImageIsUpload ? <div className="border-b border-[#e5e6e8] px-5 py-5"><p className="mb-3 text-[14px] font-semibold tracking-[-0.01em]">Layer</p><div className="grid grid-cols-2 gap-2 rounded-lg bg-[#f5f5f5] p-1"><button type="button" aria-pressed={selectedImageLayer === "foreground"} onClick={() => setImageLayers((current) => ({ ...current, [selectedImageKey]: "foreground" }))} className={cn("h-8 rounded-md text-[11px] font-medium transition", selectedImageLayer === "foreground" ? "bg-white text-[#4d9eae] shadow-sm" : "text-[#777] hover:text-[#444]")}>Foreground</button><button type="button" aria-pressed={selectedImageLayer === "background"} onClick={() => setImageLayers((current) => ({ ...current, [selectedImageKey]: "background" }))} className={cn("h-8 rounded-md text-[11px] font-medium transition", selectedImageLayer === "background" ? "bg-white text-[#4d9eae] shadow-sm" : "text-[#777] hover:text-[#444]")}>Background</button></div><p className="mt-2 text-[11px] leading-5 text-[#8b8f94]">Background images stay behind this section’s content.</p></div> : null}
    {selectedImageKey === "hero-logo" ? <div className="px-5 py-5"><button type="button" onClick={() => logoInputRef.current?.click()} className="h-9 w-full rounded-lg border border-[#dfe4e6] text-[11px] font-medium text-[#555] transition hover:bg-[#f5fafb]">Replace image</button></div> : null}
    {canvasUploads.some((upload) => upload.key === selectedImageKey) ? <div className="px-5 py-5"><button type="button" onClick={removeSelectedUpload} className="h-9 w-full rounded-lg border border-red-200 text-[11px] font-medium text-red-600 transition hover:bg-red-50">Delete image</button></div> : null}
  </> : null;
  const selectedSectionControls = <div className="mt-0 min-h-full bg-white text-[#222]"><div className="flex items-center justify-between border-b border-[#e9eaec] px-5 py-4"><div><p className="text-[14px] font-semibold tracking-[-0.01em] text-[#222]">{selectedImageKey ? "Image" : textToolbarOpen ? "Text formatting" : selectedSectionLabel}</p></div>{!textToolbarOpen && !selectedImageKey && selectedBlock !== "button" ? <span className="h-2.5 w-2.5 rounded-full ring-2 ring-[#f1f2f3]" style={{ backgroundColor: sectionColors[selectedSection] }} /> : null}</div>
{selectedImageKey ? imageControls : null}
{!selectedImageKey && textToolbarOpen ? textFormattingToolbar : null}
{!textToolbarOpen && !selectedImageKey && selectedBlock === "button" ? buttonControls : null}
{!textToolbarOpen && !selectedImageKey && selectedBlock !== "button" ? <div className="border-b border-[#e9eaec] px-5 py-5"><p className="mb-4 text-[14px] font-semibold tracking-[-0.01em]">Layout</p><ScrubField label="Height" value={sectionHeights[selectedSection]} onChange={(value) => setSectionHeights((current) => ({ ...current, [selectedSection]: value }))} min={48} max={1200} prefix="H" suffix="px" /></div> : null}
{!textToolbarOpen && !selectedImageKey && selectedBlock !== "button" ? <div className="border-b border-[#e9eaec] px-5 py-5"><p className="mb-3 text-[14px] font-semibold tracking-[-0.01em]">Section order</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => moveSelectedSection(-1)} disabled={!canMoveSectionUp} className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#dfe4e6] text-[11px] font-medium text-[#555] transition hover:bg-[#f5fafb] hover:text-[#4d9eae] disabled:cursor-not-allowed disabled:opacity-35"><ArrowUp className="h-3.5 w-3.5" />Above</button><button type="button" onClick={() => moveSelectedSection(1)} disabled={!canMoveSectionDown} className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#dfe4e6] text-[11px] font-medium text-[#555] transition hover:bg-[#f5fafb] hover:text-[#4d9eae] disabled:cursor-not-allowed disabled:opacity-35"><ArrowDown className="h-3.5 w-3.5" />Below</button></div></div> : null}
<div className={cn("border-b border-[#e9eaec] px-5 py-5", selectedImageKey || selectedBlock === "button" || textToolbarOpen ? "hidden" : "")}><p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b9095]">Section fill</p><FigmaColorRow label="Section fill" color={sectionColors[selectedSection]} onChange={(color) => setSectionColors((current) => ({ ...current, [selectedSection]: color }))} /></div><div className={cn("px-5 py-4", selectedImageKey || selectedBlock === "button" || textToolbarOpen ? "hidden" : "")}><button type="button" onClick={() => { setHiddenSections((current) => current.includes(selectedSection) ? current : [...current, selectedSection]); setActiveSidebarTool(null); }} className="flex h-9 w-full items-center justify-center rounded-lg border border-red-200 bg-white text-[11px] font-medium text-red-600 transition hover:bg-red-50">Delete section</button></div></div>;

  async function saveTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payloadBody = { name, description, channel: key, subject, title, textContent: message, htmlContent: emailFormat === "html" ? message : "", actionUrl, imageUrl };
    const response = await fetch(initialTemplateId ? `/api/templates/${initialTemplateId}` : "/api/templates", { method: initialTemplateId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadBody) });
    const payload = await response.json().catch(() => ({})) as { error?: string; template?: { id?: string } };
    if (!response.ok) {
      setError(payload.error ?? "Unable to save template");
      setSaving(false);
      return;
    }
    if (aiThreadId && payload.template?.id) {
      await fetch(`/api/ai/threads/${aiThreadId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: payload.template.id }) });
    }
    router.push("/templates");
  }

  async function sendTestEmail() {
    if (!testEmail.trim() || sendingTest) return;
    setSendingTest(true);
    setTestSendError(null);
    setTestSendSuccess(false);
    try {
      const response = await fetch("/api/templates/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail, templateName: name, html: getExportEmailHtml() }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to send test email");
      setTestSendSuccess(true);
    } catch (caught) {
      setTestSendError(caught instanceof Error ? caught.message : "Unable to send test email");
    } finally {
      setSendingTest(false);
    }
  }

  function getExportEmailHtml() {
    const source = document.querySelector<HTMLElement>("main section");
    if (!source) return "";

    const clone = source.cloneNode(true) as HTMLElement;
    const sourceElements = [source, ...Array.from(source.querySelectorAll<HTMLElement>("*"))];
    const cloneElements = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];
    const inlineProperties = ["backgroundColor", "color", "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textAlign", "width", "minHeight", "height", "padding", "margin", "border", "borderRadius", "boxShadow", "boxSizing", "display", "justifyContent", "alignItems", "objectFit", "maxWidth", "position", "zIndex", "left", "top", "transform", "overflow"] as const;
    const editorChrome = sourceElements.flatMap((element, index) => element.matches(".email-template-drag-handle, .email-template-center-guide, .email-template-text-selection-outline, .email-template-image-selection-outline, .email-template-image-resize-handle") ? [cloneElements[index]] : []);

    cloneElements.forEach((element, index) => {
      const original = sourceElements[index];
      if (!original) return;
      const computed = window.getComputedStyle(original);
      element.removeAttribute("class");
      element.removeAttribute("contenteditable");
      element.removeAttribute("data-editor-key");
      element.removeAttribute("data-image-key");
      element.removeAttribute("role");
      element.removeAttribute("tabindex");
      inlineProperties.forEach((property) => {
        const value = computed[property];
        if (value) element.style.setProperty(property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`), value);
      });
    });

    editorChrome.forEach((element) => element.remove());

    clone.querySelectorAll("button").forEach((button) => {
      button.removeAttribute("type");
      button.removeAttribute("onclick");
    });

    return `<div style="background:#ffffff;margin:0 auto;max-width:640px;overflow:hidden">${clone.innerHTML}</div>`;
  }

  async function copyEmailHtml() {
    const html = getExportEmailHtml();
    if (!html) return;
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([cloneTextFromHtml(html)], { type: "text/plain" }) })]);
      } else {
        await navigator.clipboard?.writeText(html);
      }
    } catch {
      await navigator.clipboard?.writeText(html).catch(() => undefined);
    }
  }

  function cloneTextFromHtml(html: string) {
    const container = document.createElement("div");
    container.innerHTML = html;
    return container.textContent ?? "";
  }

  function printEmailAsPdf() {
    const html = getExportEmailHtml();
    if (!html) return;
    const printWindow = window.open("", "_blank", "width=900,height=1000");
    if (!printWindow) {
      return;
    }
    const safeTitle = (name || "Email").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
    printWindow.document.write(`<!doctype html><html><head><title>${safeTitle}</title><style>@page{margin:0.5in}html,body{margin:0;padding:0;background:#fff}body{font-family:Arial,sans-serif;color:#222}@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>${html}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  }

  React.useEffect(() => {
    if (emailFormat !== "html") return;
    const shareButton = Array.from(document.querySelectorAll<HTMLButtonElement>("header button")).find((button) => button.textContent?.trim() === "Share");
    const parent = shareButton?.parentElement;
    if (!shareButton || !parent) return;
    parent.classList.add("relative");

    let menu: HTMLDivElement | null = null;
    const closeMenu = () => { menu?.remove(); menu = null; };
    const handleShareClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (menu) { closeMenu(); return; }
      menu = document.createElement("div");
      menu.setAttribute("role", "menu");
      menu.setAttribute("aria-label", "Share email");
      menu.className = "absolute right-0 top-[calc(100%+10px)] z-40 w-[230px] rounded-2xl border border-[#e4e7e9] bg-white p-1.5 shadow-[0_14px_36px_rgba(15,23,42,0.14)]";
      const actions = [
        { label: "Save as PDF", description: "Open print and save options", action: printEmailAsPdf },
        { label: "Copy HTML", description: "Copy the email markup", action: () => void copyEmailHtml() },
      ];
      actions.forEach(({ label, description, action }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("role", "menuitem");
        button.className = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] text-[#444] transition hover:bg-[#f4f5f7]";
        button.innerHTML = `<span><span class="block font-medium">${label}</span><span class="mt-0.5 block text-[11px] text-[#999]">${description}</span></span>`;
        button.addEventListener("click", (actionEvent) => { actionEvent.stopPropagation(); action(); closeMenu(); });
        menu?.append(button);
      });
      parent.append(menu);
    };
    const handleDocumentClick = () => closeMenu();
    shareButton.addEventListener("click", handleShareClick, true);
    document.addEventListener("click", handleDocumentClick);
    return () => { shareButton.removeEventListener("click", handleShareClick, true); document.removeEventListener("click", handleDocumentClick); closeMenu(); };
  }, [emailFormat, name]);

  const layerLabel: Record<EmailSectionKey, string> = { hero: "Hero", text: "Text", image: "Image", divider: "Divider" };
  const layerChildren = (section: EmailSectionKey): LayerItem[] => {
    const builtIn: LayerItem[] = section === "hero" ? [
      { key: "hero-logo", label: "Logo", target: { type: "image", imageKey: "hero-logo" } },
      { key: "hero-headline", label: "Heading", target: { type: "text", editorKey: "hero-headline" } },
      { key: "hero-description", label: "Description", target: { type: "text", editorKey: "hero-description" } },
      { key: "hero-button", label: "Button", target: { type: "button" } },
    ] : section === "text" ? [
      { key: "body-heading", label: "Heading", target: { type: "text", editorKey: "body-heading" } },
      { key: "body-description", label: "Description", target: { type: "text", editorKey: "body-description" } },
    ] : section === "image" && !canvasUploads.some((upload) => upload.section === "image") ? [
      { key: "image-placeholder", label: "Image placeholder", target: { type: "text", editorKey: "image-placeholder" } },
    ] : [];
    return [
      ...builtIn,
      ...canvasUploads.filter((upload) => upload.section === section).map((upload) => ({ key: upload.key, label: upload.original_name, target: { type: "image" as const, imageKey: upload.key } })),
    ];
  };
  const selectLayer = (section: EmailSectionKey, target?: LayerTarget) => {
    setSelectedTextKey(null);
    setSelectedImageKey(null);
    setEditingTextKey(null);
    setTextToolbarOpen(false);
    activeTextEditorRef.current = null;
    savedTextSelectionRef.current = null;
    setCanvasSelectionActive(true);

    if (!target) {
      setSelectedBlock(section);
      return;
    }

    setActiveSidebarTool("design");
    if (target.type === "button") {
      setSelectedBlock("button");
      return;
    }

    setSelectedBlock(section);
    if (target.type === "image") {
      setSelectedImageKey(target.imageKey);
      setImageSelectionVersion((current) => current + 1);
      return;
    }

    setSelectedTextKey(target.editorKey);
    setTextToolbarOpen(true);
    const editor = document.querySelector<HTMLElement>(`main section [data-editor-key="${target.editorKey}"]`);
    if (!editor) return;
    activeTextEditorRef.current = editor;
    const range = document.createRange();
    range.selectNodeContents(editor);
    savedTextSelectionRef.current = range;
    syncTextFormatControls(editor);
  };
  const layersPanel = <AnimatePresence>{layersOpen ? <motion.aside initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} aria-label="Layers" className="absolute inset-y-0 right-0 z-50 flex w-[280px] flex-col border-l border-[#e2e6e9] bg-white shadow-[-12px_0_30px_rgba(15,23,42,0.08)]"><div className="flex h-14 shrink-0 items-center justify-between border-b border-[#e9ecef] px-4"><div className="flex items-center gap-2 text-[13px] font-semibold text-[#222]"><Layers className="h-4 w-4 text-[#4d9eae]" />Layers</div><button type="button" onClick={() => setLayersOpen(false)} aria-label="Close layers" className="rounded-lg p-1.5 text-[#777] transition hover:bg-[#f3f5f6] hover:text-[#222]"><X className="h-4 w-4" /></button></div><div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">{sectionOrder.map((section) => { const selected = canvasSelectionActive && selectedBlock === section && !selectedTextKey && !selectedImageKey; const children = layerChildren(section); return <div key={section} className="mb-1"><button type="button" aria-pressed={selected} onClick={() => selectLayer(section)} className={cn("flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[12px] transition", selected ? "bg-[#edf8fa] font-semibold text-[#3d8f9d]" : "font-medium text-[#3f4548] hover:bg-[#f5f6f7]")}><ChevronDown className="h-3.5 w-3.5 text-[#9aa1a5]" /><LayoutTemplate className="h-3.5 w-3.5 text-[#6eadc0]" /><span className="flex-1">{layerLabel[section]}</span>{hiddenSections.includes(section) ? <span className="text-[10px] font-normal text-[#a0a5a8]">Hidden</span> : null}</button>{children.length ? <div className="ml-5 border-l border-[#edf0f1] py-1">{children.map((item) => { const itemSelected = canvasSelectionActive && (item.target.type === "button" ? selectedBlock === "button" : item.target.type === "text" ? selectedBlock === section && selectedTextKey === item.target.editorKey : selectedBlock === section && selectedImageKey === item.target.imageKey); const ItemIcon = item.target.type === "image" ? Image : item.target.type === "button" ? MousePointerClick : Type; return <button key={item.key} type="button" aria-pressed={itemSelected} onClick={() => selectLayer(section, item.target)} className={cn("flex h-8 w-full items-center gap-2 rounded-r-lg px-3 text-left text-[11px] transition", itemSelected ? "bg-[#edf8fa] font-medium text-[#3d8f9d]" : "text-[#72787b] hover:bg-[#f5f6f7] hover:text-[#444]")}><span className="flex h-4 w-4 items-center justify-center text-[#98a0a4]"><ItemIcon className="h-3.5 w-3.5" /></span><span className="truncate">{item.label}</span></button>; })}</div> : null}</div>; })}</div></motion.aside> : null}</AnimatePresence>;

  if (initialTemplateId && !templateLoaded) return <div className="flex min-h-full items-center justify-center bg-kenoo-white text-[13px] text-[#999]">Loading template…</div>;
  if (key === "email" && emailFormat === null) return null;

  if (key === "email" && emailFormat === "html") return <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-[#f4f5f7] text-[#222]"><header className="relative flex h-[68px] shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-white px-4 text-[#222] shadow-[0_4px_18px_rgba(15,23,42,0.06)] sm:px-6"><span ref={templateNameMeasureRef} aria-hidden="true" className="pointer-events-none absolute -z-10 whitespace-pre text-[15px] font-semibold tracking-[-0.02em]">{name || "Template 1"}</span><div className="flex min-w-0 items-center gap-5"><button type="button" onClick={() => setEmailFormat(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f4f5f7] text-[#666] transition hover:bg-[#edf8fa] hover:text-[#4d9eae]" aria-label="Change email format"><ArrowLeft className="h-4 w-4" /></button><div className="hidden items-center gap-5 sm:flex"><input value={name} onChange={(event) => setName(event.target.value)} aria-label="Template name" placeholder="Template 1" style={{ width: templateNameWidth }} className="h-9 rounded-xl border border-transparent bg-transparent px-2 text-[15px] font-semibold tracking-[-0.02em] text-[#222] outline-none transition hover:border-[#c9cdd1] hover:bg-white focus:border-[#969ba1] focus:bg-white" /><span className="h-7 w-px bg-[#e5e7eb]" /><div ref={editorModeRef} className="relative"><button type="button" aria-haspopup="menu" aria-expanded={editorModeOpen} onClick={() => setEditorModeOpen((open) => !open)} className="flex items-center gap-2 rounded-lg bg-[#f4f5f7] px-3 py-2 text-[12px] font-medium text-[#555] transition hover:bg-[#edf8fa] hover:text-[#4d9eae]"><Pencil className="h-4 w-4" />{emailEditorModes.find((mode) => mode.value === editorMode)?.label}<ChevronDown className={cn("h-3.5 w-3.5 transition-transform", editorModeOpen ? "rotate-180" : "")} /></button>{editorModeOpen ? <div role="menu" aria-label="Editor mode" className="absolute left-0 top-[calc(100%+10px)] z-40 w-[236px] rounded-2xl border border-[#e4e7e9] bg-white p-1.5 shadow-[0_14px_36px_rgba(15,23,42,0.14)]">{emailEditorModes.map((mode) => { const ModeIcon = mode.icon; const selected = editorMode === mode.value; return <button key={mode.value} type="button" role="menuitemradio" aria-checked={selected} onClick={() => { setEditorMode(mode.value); setEditorModeOpen(false); }} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition", selected ? "bg-[#edf8fa] text-[#4d9eae]" : "text-[#444] hover:bg-[#f4f5f7]")}><span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", selected ? "bg-white text-[#4d9eae]" : "bg-[#f4f5f7] text-[#777]")}><ModeIcon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-[12px] font-medium">{mode.label}</span><span className="mt-0.5 block text-[11px] text-[#999]">{mode.description}</span></span>{selected ? <Check className="h-4 w-4 shrink-0" /> : null}</button>; })}</div> : null}</div><span className="h-7 w-px bg-[#e5e7eb]" /><button type="button" onClick={undoBuilderChange} disabled={!historyState.canUndo} aria-label="Undo" className="disabled:opacity-30"><Undo2 className="h-4 w-4 text-[#9aa0a6]" /></button><button type="button" onClick={redoBuilderChange} disabled={!historyState.canRedo} aria-label="Redo" className="disabled:opacity-30"><Redo2 className="h-4 w-4 text-[#9aa0a6]" /></button><span className="h-7 w-px bg-[#e5e7eb]" /></div><input value={name} onChange={(event) => setName(event.target.value)} aria-label="Template name" placeholder="Template 1" style={{ width: templateNameWidth }} className="h-9 min-w-0 max-w-[calc(100vw-160px)] rounded-xl border border-transparent bg-transparent px-2 text-[14px] font-semibold text-[#222] outline-none transition hover:border-[#c9cdd1] hover:bg-white focus:border-[#969ba1] focus:bg-white sm:hidden" /></div><div className="flex shrink-0 items-center gap-2"><div className="relative"><button type="button" onClick={() => setSendTestOpen((open) => !open)} className="flex items-center gap-2 rounded-xl bg-neutral-100 px-3.5 py-2.5 text-[12px] font-semibold text-neutral-950 transition hover:bg-neutral-200"><span>Send test</span></button>{sendTestOpen ? <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-[280px] rounded-2xl border border-[#e4e7e9] bg-white p-3 shadow-[0_14px_36px_rgba(15,23,42,0.14)]"><label className="block text-left"><span className="mb-1.5 block text-[11px] font-medium text-[#777]">Send a test email to</span><input type="email" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder="you@example.com" className="h-9 w-full rounded-lg border border-[#dfe4e6] bg-white px-2.5 text-[12px] text-[#333] outline-none placeholder:text-[#aaa] focus:border-[#8fcbd5] focus:ring-2 focus:ring-[#dff3f6]" /></label><button type="button" onClick={() => void sendTestEmail()} disabled={!testEmail.trim() || sendingTest} className="mt-2.5 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#222] text-[12px] font-medium text-white transition hover:bg-[#3a3a3a] disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-3.5 w-3.5" /> {sendingTest ? "Sending…" : testSendSuccess ? "Sent" : "Send test email"}</button>{testSendError ? <p className="mt-2 text-[11px] text-red-600">{testSendError}</p> : null}</div> : null}</div><button type="button" onClick={() => { const shareUrl = window.location.href; void navigator.clipboard?.writeText(shareUrl); }} className="inline-flex items-center gap-2 rounded-xl bg-[#222] px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#3a3a3a]">Share <Share className="h-3.5 w-3.5" /></button></div></header><div className="relative flex min-h-0 flex-1"><aside className="hidden w-[76px] shrink-0 flex-col items-center gap-2 border-r border-[#e2e4e9] bg-white py-4 sm:flex"><button type="button" onClick={() => toggleSidebarTool("add")} className={cn("flex w-[60px] flex-col items-center gap-1.5 rounded-2xl py-3 text-[10px] font-medium transition", activeSidebarTool === "add" ? "bg-[#edf8fa] text-[#4d9eae]" : "text-[#999] hover:bg-[#f5f6f8] hover:text-[#555]")}><Plus className="h-5 w-5" /><span>Add</span></button><button type="button" onClick={() => toggleSidebarTool("layouts")} className={cn("flex w-[60px] flex-col items-center gap-1.5 rounded-2xl py-3 text-[10px] transition", activeSidebarTool === "layouts" ? "bg-[#edf8fa] font-medium text-[#4d9eae]" : "text-[#999] hover:bg-[#f5f6f8] hover:text-[#555]")}><LayoutTemplate className="h-5 w-5" /><span>Layouts</span></button><button type="button" onClick={() => toggleSidebarTool("uploads")} className={cn("flex w-[60px] flex-col items-center gap-1.5 rounded-2xl py-3 text-[10px] transition", activeSidebarTool === "uploads" ? "bg-[#edf8fa] font-medium text-[#4d9eae]" : "text-[#999] hover:bg-[#f5f6f8] hover:text-[#555]")}><Upload className="h-5 w-5" /><span>Uploads</span></button><button type="button" onClick={() => toggleSidebarTool("folders")} className={cn("flex w-[60px] flex-col items-center gap-1.5 rounded-2xl py-3 text-[10px] transition", activeSidebarTool === "folders" ? "bg-[#edf8fa] font-medium text-[#4d9eae]" : "text-[#999] hover:bg-[#f5f6f8] hover:text-[#555]")}><Folder className="h-5 w-5" /><span>Folders</span></button><button type="button" onClick={() => toggleSidebarTool("ai")} className={cn("flex w-[60px] flex-col items-center gap-1.5 rounded-2xl py-3 text-[10px] transition", activeSidebarTool === "ai" ? "bg-[#edf8fa] font-medium text-[#4d9eae]" : "text-[#999] hover:bg-[#f5f6f8] hover:text-[#555]")}><Sparkles className="h-5 w-5" /><span>Kenoo AI</span></button><button type="button" onClick={() => toggleSidebarTool("design")} className={cn("flex w-[60px] flex-col items-center gap-1.5 rounded-2xl py-3 text-[10px] transition", activeSidebarTool === "design" ? "bg-[#edf8fa] font-medium text-[#4d9eae]" : "text-[#999] hover:bg-[#f5f6f8] hover:text-[#555]")}><Settings2 className="h-5 w-5" /><span>Design</span></button></aside><AnimatePresence initial={false}>{activeSidebarTool ? <motion.aside key="email-sidebar-panel" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className={cn("absolute inset-y-0 left-[76px] z-30 hidden w-[360px] overflow-y-auto border-r border-[#e2e4e9] bg-white shadow-[8px_0_24px_rgba(15,23,42,0.08)] lg:block", activeSidebarTool === "design" ? "" : "p-4")}><>
{activeSidebarTool === "add" ? <><div className="mt-5 grid grid-cols-2 gap-2.5"><button type="button" onClick={() => { setSelectedBlock("text"); setActiveSidebarTool("design"); }} className="flex h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#e8eaee] bg-[#fbfbfc] text-[11px] text-[#666] transition hover:-translate-y-0.5 hover:border-[#a8d7df] hover:bg-[#f1fbfc]"><Type className="h-5 w-5 text-[#60aebc]" />Text</button><button type="button" onClick={() => { setSelectedBlock("image"); setActiveSidebarTool("design"); }} className="flex h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#e8eaee] bg-[#fbfbfc] text-[11px] text-[#666] transition hover:-translate-y-0.5 hover:border-[#a8d7df] hover:bg-[#f1fbfc]"><Image className="h-5 w-5 text-[#60aebc]" />Image</button><button type="button" onClick={() => setSelectedBlock("button")} className="flex h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#e8eaee] bg-[#fbfbfc] text-[11px] text-[#666] transition hover:-translate-y-0.5 hover:border-[#a8d7df] hover:bg-[#f1fbfc]"><MousePointerClick className="h-5 w-5 text-[#60aebc]" />Button</button><button type="button" onClick={() => { setSelectedBlock("divider"); setActiveSidebarTool("design"); }} className="flex h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#e8eaee] bg-[#fbfbfc] text-[11px] text-[#666] transition hover:-translate-y-0.5 hover:border-[#a8d7df] hover:bg-[#f1fbfc]"><Minus className="h-5 w-5 text-[#60aebc]" />Divider</button></div><div className="mt-6 rounded-2xl bg-[#f5fafb] p-3.5"><p className="text-[11px] font-medium text-[#4d9eae]">Tip</p><p className="mt-1 text-[11px] leading-5 text-[#7d9298]">Select a block on the canvas to edit its content and styling.</p></div><div className="mt-5 border-t border-[#eef0f1] pt-5"><p className="text-[13px] font-semibold text-[#222]">Email settings</p><label className="mt-4 block"><span className="mb-1.5 block text-[11px] font-medium text-[#777]">Description</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional" className="form-input" /></label><div className="mt-4"><p className="mb-2 text-[11px] font-medium text-[#777]">Selected block</p><div className="flex items-center justify-between rounded-xl bg-[#f5fafb] px-3 py-2.5 text-[12px] text-[#4d9eae]"><span className="capitalize">{selectedBlock}</span><span className="h-2 w-2 rounded-full bg-[#6eadc0]" /></div></div><div className="mt-4"><p className="mb-2 text-[11px] font-medium text-[#777]">Canvas background</p><div className="flex gap-2"><button type="button" className="h-8 w-8 rounded-lg bg-[#f7f4eb] ring-2 ring-[#6eadc0] ring-offset-2" /><button type="button" className="h-8 w-8 rounded-lg bg-white ring-1 ring-[#e5e7e9]" /><button type="button" className="h-8 w-8 rounded-lg bg-[#edf8fa]" /></div></div></div></> : activeSidebarTool === "uploads" || activeSidebarTool === "folders" ? <EmailUploadsPanel key={activeSidebarTool} initialView={activeSidebarTool === "folders" ? "folders" : "images"} onInsert={(upload) => void insertUpload(upload)} /> : activeSidebarTool === "design" ? selectedSectionControls : activeSidebarTool === "ai" ? <KenooAIPanel templateId={templateId} onThreadIdChange={setAiThreadId} /> : <div className="mt-5 rounded-2xl border border-dashed border-[#dce8ea] bg-[#fbfdfd] p-4"><p className="text-[12px] font-medium text-[#444]">{activeSidebarTool === "layouts" ? "Choose a starting point" : "Describe what you want to create"}</p><p className="mt-2 text-[11px] leading-5 text-[#8a9294]">{activeSidebarTool === "layouts" ? "Pick a template layout to give your email a strong first structure." : "Use Kenoo AI to help draft content and suggest layouts."}</p><div className="mt-4 rounded-xl bg-[#f5fafb] px-3 py-2.5 text-[11px] font-medium text-[#6b969e]">More options coming soon</div></div>}</></motion.aside> : null}</AnimatePresence>{activeSidebarTool ? <button type="button" onClick={() => setActiveSidebarTool(null)} aria-label="Close sidebar panel" className="absolute left-[436px] top-1/2 z-40 flex h-9 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#e1e5eb] bg-white text-[#333] shadow-[0_4px_14px_rgba(15,23,42,0.12)] transition hover:bg-[#f8fafb]"><ChevronLeft className="h-5 w-5" /></button> : null}<motion.main animate={{ x: activeSidebarTool ? 180 : 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} onClick={() => { setActiveSidebarTool(null); setCanvasSelectionActive(false); setSelectedBlock("hero"); }} className="relative min-w-0 flex-1 overflow-auto bg-[#f4f5f7] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><div className="flex min-h-full justify-center px-5 py-10 sm:px-10"><div className="relative w-full max-w-[640px]" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}><section onClick={(event) => event.stopPropagation()} onDragOver={dragUploadOverCanvas} onDrop={dropUploadOnCanvas} className="overflow-hidden border border-[#e4e6ea] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]"><div role="button" tabIndex={0} onClick={() => { setSelectedBlock("hero"); setActiveSidebarTool("design"); setCanvasSelectionActive(true); }} style={{ backgroundColor: sectionColors.hero, height: `${sectionHeights.hero}px`, display: hiddenSections.includes("hero") ? "none" : undefined }} className={cn("group relative block w-full px-10 pb-10 pt-12 text-center transition", canvasSelectionActive && selectedBlock === "hero" && !selectedTextKey && !selectedImageKey ? "ring-2 ring-inset ring-[var(--kenoo-sky)]" : "hover:brightness-[0.99]")}><p contentEditable suppressContentEditableWarning spellCheck="false" data-editor-key="hero-eyebrow" onInput={(event) => setHeroEyebrow(event.currentTarget.innerHTML)} onMouseDown={prepareTextSelection} onMouseUp={(event) => rememberTextSelection(event.currentTarget)} onKeyUp={(event) => rememberTextSelection(event.currentTarget)} className="cursor-text rounded-md outline-none focus:bg-white/60 focus:ring-2 focus:ring-[var(--kenoo-sky)]/40" onClick={(event) => selectTextContainer(event, "hero")} onDoubleClick={(event) => beginTextEditing(event, "hero")} dangerouslySetInnerHTML={heroEyebrowMarkup} /><h1 contentEditable suppressContentEditableWarning spellCheck="false" data-editor-key="hero-headline" onInput={(event) => setHeroHeadline(event.currentTarget.innerHTML)} onMouseDown={prepareTextSelection} onMouseUp={(event) => rememberTextSelection(event.currentTarget)} onKeyUp={(event) => rememberTextSelection(event.currentTarget)} className="mt-4 cursor-text rounded-md text-[35px] font-semibold leading-[1.08] tracking-[-0.06em] text-[#171717] outline-none focus:bg-white/60 focus:ring-2 focus:ring-[var(--kenoo-sky)]/40" onClick={(event) => selectTextContainer(event, "hero")} onDoubleClick={(event) => beginTextEditing(event, "hero")} dangerouslySetInnerHTML={{ __html: heroHeadline }} /><p contentEditable suppressContentEditableWarning spellCheck="false" data-editor-key="hero-description" onInput={(event) => setHeroDescription(event.currentTarget.innerHTML)} onMouseDown={prepareTextSelection} onMouseUp={(event) => rememberTextSelection(event.currentTarget)} onKeyUp={(event) => rememberTextSelection(event.currentTarget)} className="mx-auto mt-5 max-w-[400px] cursor-text rounded-md text-[13px] leading-6 text-[#727878] outline-none focus:bg-white/60 focus:ring-2 focus:ring-[var(--kenoo-sky)]/40" onClick={(event) => selectTextContainer(event, "hero")} onDoubleClick={(event) => beginTextEditing(event, "hero")} dangerouslySetInnerHTML={{ __html: heroDescription }} /><button type="button" onClick={(event) => { event.stopPropagation(); setSelectedBlock("button"); setActiveSidebarTool("design"); setCanvasSelectionActive(true); }} style={{ backgroundColor: buttonColor, color: buttonTextColor, width: buttonWidth === "auto" ? undefined : /^\d+$/.test(buttonWidth) ? buttonWidth + "px" : buttonWidth, minHeight: `${buttonHeight}px`, borderRadius: `${buttonRadius}px` }} className={cn("mt-7 rounded-xl px-6 py-3 text-[12px] font-semibold shadow-[0_8px_16px_rgba(110,173,192,0.28)] transition hover:brightness-95", canvasSelectionActive && selectedBlock === "button" ? "ring-2 ring-offset-2 ring-[var(--kenoo-sky)]" : "")}><span contentEditable suppressContentEditableWarning spellCheck="false" data-editor-key="hero-button" onInput={(event) => setHeroButtonLabel(event.currentTarget.innerHTML)} onMouseUp={(event) => rememberTextSelection(event.currentTarget)} onKeyUp={(event) => rememberTextSelection(event.currentTarget)} className="cursor-default rounded outline-none focus:ring-2 focus:ring-white/70"  dangerouslySetInnerHTML={{ __html: heroButtonLabel }} /></button>{renderCanvasUploads("hero")}</div><button type="button" onClick={() => { setSelectedBlock("text"); setActiveSidebarTool("design"); setCanvasSelectionActive(true); }} style={{ backgroundColor: sectionColors.text, height: `${sectionHeights.text}px`, display: hiddenSections.includes("text") ? "none" : undefined }} className={cn("relative block w-full border-t border-[#f0f0ed] px-10 py-9 text-left transition", canvasSelectionActive && selectedBlock === "text" && !selectedTextKey && !selectedImageKey ? "ring-2 ring-inset ring-[var(--kenoo-sky)]" : "hover:brightness-[0.99]")}><p contentEditable suppressContentEditableWarning spellCheck="false" data-editor-key="body-heading" onInput={(event) => setBodyHeading(event.currentTarget.innerHTML)} onMouseDown={prepareTextSelection} onMouseUp={(event) => rememberTextSelection(event.currentTarget)} onKeyUp={(event) => rememberTextSelection(event.currentTarget)} className="cursor-text rounded-md text-[15px] font-semibold text-[#252828] outline-none focus:bg-white focus:ring-2 focus:ring-[var(--kenoo-sky)]/40" onClick={(event) => selectTextContainer(event, "text")} onDoubleClick={(event) => beginTextEditing(event, "text")} dangerouslySetInnerHTML={{ __html: bodyHeading }} /><p contentEditable suppressContentEditableWarning spellCheck="false" data-editor-key="body-description" onInput={(event) => setBodyDescription(event.currentTarget.innerHTML)} onMouseDown={prepareTextSelection} onMouseUp={(event) => rememberTextSelection(event.currentTarget)} onKeyUp={(event) => rememberTextSelection(event.currentTarget)} className="mt-3 cursor-text rounded-md text-[12px] leading-6 text-[#747b7d] outline-none focus:bg-white focus:ring-2 focus:ring-[var(--kenoo-sky)]/40" onClick={(event) => selectTextContainer(event, "text")} onDoubleClick={(event) => beginTextEditing(event, "text")} dangerouslySetInnerHTML={{ __html: bodyDescription }} />{renderCanvasUploads("text")}</button><button type="button" onClick={() => { setSelectedBlock("image"); setActiveSidebarTool("design"); setCanvasSelectionActive(true); }} style={{ backgroundColor: sectionColors.image, height: `${sectionHeights.image}px`, display: hiddenSections.includes("image") ? "none" : undefined }} className={cn("relative block w-full border-t border-[#f0f0ed] p-6 transition", canvasSelectionActive && selectedBlock === "image" && !selectedTextKey && !selectedImageKey ? "ring-2 ring-inset ring-[var(--kenoo-sky)]" : "hover:brightness-[0.99]")}>{!canvasUploads.some((upload) => upload.section === "image") ? <div style={{ backgroundColor: sectionColors.image }} className="flex h-[170px] items-center justify-center rounded-xl border border-dashed border-[#c8dfe3] text-center text-[#65aab7]"><Image className="h-7 w-7" /><span contentEditable suppressContentEditableWarning spellCheck="false" data-editor-key="image-placeholder" onInput={(event) => setImagePlaceholder(event.currentTarget.innerHTML)} onMouseDown={prepareTextSelection} onMouseUp={(event) => rememberTextSelection(event.currentTarget)} onKeyUp={(event) => rememberTextSelection(event.currentTarget)} className="ml-3 cursor-text rounded outline-none focus:bg-white focus:ring-2 focus:ring-[var(--kenoo-sky)]/40" onClick={(event) => selectTextContainer(event, "image")} onDoubleClick={(event) => beginTextEditing(event, "image")} dangerouslySetInnerHTML={{ __html: imagePlaceholder }} /></div> : null}{renderCanvasUploads("image")}</button><button type="button" onClick={() => { setSelectedBlock("divider"); setActiveSidebarTool("design"); setCanvasSelectionActive(true); }} style={{ backgroundColor: sectionColors.divider, height: `${sectionHeights.divider}px`, display: hiddenSections.includes("divider") ? "none" : undefined }} className={cn("relative block w-full border-t border-[#f0f0ed] px-10 py-7 transition", canvasSelectionActive && selectedBlock === "divider" ? "ring-2 ring-inset ring-[var(--kenoo-sky)]" : "hover:brightness-[0.99]")}><div className="h-px bg-[#d8e5e7]" />{renderCanvasUploads("divider")}</button></section></div></div></motion.main>{layersPanel}</div><footer className="flex h-11 shrink-0 items-center justify-between border-t border-[#e2e4e9] bg-white px-4 text-[11px] text-[#92969d] sm:px-6"><div className="flex items-center gap-5"><span className="inline-flex items-center gap-1.5"><LayoutTemplate className="h-3.5 w-3.5" /> Email layout</span><span aria-hidden="true" className="hidden h-4 w-px bg-[#e5e7eb] sm:inline" /><span className="hidden sm:inline">{saveStatus === "creating" ? "Creating…" : saveStatus === "saving" ? "Autosaving…" : saveStatus === "error" ? "Autosave failed" : "Autosaved"}</span></div><div className="flex items-center gap-4"><div className="flex items-center gap-1 rounded-xl bg-[#f4f5f7] p-1"><button type="button" onClick={() => setZoom((value) => Math.max(50, value - 1))} className="rounded-lg p-1.5 text-[#777] transition hover:bg-white hover:text-[#4d9eae]" aria-label="Zoom out"><ZoomOut className="h-3.5 w-3.5" /></button><input type="range" min="50" max="150" step="1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="h-1 w-32 accent-[#6eadc0]" aria-label="Zoom level" /><button type="button" onClick={() => setZoom((value) => Math.min(150, value + 1))} className="rounded-lg p-1.5 text-[#777] transition hover:bg-white hover:text-[#4d9eae]" aria-label="Zoom in"><ZoomIn className="h-3.5 w-3.5" /></button><span className="min-w-[38px] px-1 text-center text-[11px] font-medium text-[#666]">{zoom}%</span></div><button type="button" onClick={() => setLayersOpen((open) => !open)} aria-expanded={layersOpen} className={cn("inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium transition", layersOpen ? "bg-[#edf8fa] text-[#4d9eae]" : "text-[#666] hover:bg-[#f3f5f6]")}><Layers className="h-3.5 w-3.5" />Layers</button></div></footer></div>;

  return <div className="min-h-full bg-kenoo-white"><div className="mx-auto max-w-[1000px] px-6 py-8 sm:px-10 lg:px-12"><Link href="/templates" className="inline-flex items-center gap-2 text-[12px] text-[#888] transition hover:text-[#333]"><ArrowLeft className="h-3.5 w-3.5" /> Back to templates</Link><header className="mt-8"><div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", details.color)}><Icon className="h-5 w-5" strokeWidth={1.6} /></div><p className="mb-2 mt-5 text-[12px] font-medium uppercase tracking-[0.1em] text-[#9b9b9b]">New {details.label.toLowerCase()} template</p><h1 className="text-[30px] font-semibold tracking-[-0.04em] text-[#111]">Create a {details.label} template</h1><p className="mt-2 max-w-xl text-[13px] font-light leading-6 text-[#858585]">{details.description}</p></header><form onSubmit={saveTemplate} className="mt-8 rounded-[28px] bg-white/80 p-6 shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] sm:p-8"><label className="block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Template name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder={isPush ? "e.g. Order ready" : "e.g. Appointment reminder"} className="form-input" /></label><label className="mt-5 block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Description <span className="font-normal text-[#aaa]">(optional)</span></span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is this template for?" className="form-input" /></label>{isPush ? <><label className="mt-5 block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Notification title</span><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Your order is ready" className="form-input" /></label><label className="mt-5 block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Message</span><textarea required value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Order #1234 is ready for pickup." className="min-h-28 w-full resize-y rounded-lg border border-[#dedede] bg-white px-3 py-2.5 text-[12px] leading-5 text-[#333] outline-none placeholder:text-[#aaa] focus:border-[#999] focus:ring-2 focus:ring-black/[0.04]" /></label><div className="mt-5 grid gap-5 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Action link <span className="font-normal text-[#aaa]">(optional)</span></span><input type="url" value={actionUrl} onChange={(event) => setActionUrl(event.target.value)} placeholder="https://app.example.com/orders/1234" className="form-input" /></label><label className="block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Image URL <span className="font-normal text-[#aaa]">(optional)</span></span><input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." className="form-input" /></label></div></> : <><label className="mt-5 block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Subject</span><input required={key === "email"} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="A quick note from us" className="form-input" /></label><label className="mt-5 block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Message</span><textarea required maxLength={1600} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={key === "email" ? "Write your plain-text email..." : "Hi {{first_name}}, just a quick reminder..."} className="min-h-36 w-full resize-y rounded-lg border border-[#dedede] bg-white px-3 py-2.5 text-[12px] leading-5 text-[#333] outline-none placeholder:text-[#aaa] focus:border-[#999] focus:ring-2 focus:ring-black/[0.04]" /><span className="mt-1.5 block text-right text-[11px] text-[#aaa]">{message.length}/1600</span></label></>}{error ? <p className="mt-4 text-[12px] text-red-500">{error}</p> : null}<div className="mt-6 flex justify-end gap-2"><Link href="/templates" className="rounded-lg px-3.5 py-2.5 text-[12px] font-medium text-[#666] transition hover:bg-[#f5f5f5]">Cancel</Link><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#111] px-3.5 py-2.5 text-[12px] font-medium text-white transition hover:bg-[#2a2a2a] disabled:cursor-wait disabled:opacity-60"><Save className="h-3.5 w-3.5" />{saving ? "Saving…" : "Save template"}</button></div></form></div></div>;
}
