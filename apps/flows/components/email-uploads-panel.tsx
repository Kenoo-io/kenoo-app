"use client";

import * as React from "react";
import { Image as ImageIcon, LoaderCircle, Search, Trash2, UploadCloud } from "lucide-react";

type Upload = {
  id: string;
  original_name: string;
  public_url: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

export function EmailUploadsPanel() {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = React.useState<Upload[]>([]);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/template-uploads")
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as { uploads?: Upload[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to load uploads");
        if (!cancelled) setUploads(payload.uploads ?? []);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load uploads");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    try {
      const response = await fetch("/api/template-uploads", { method: "POST", body: formData });
      const payload = await response.json().catch(() => ({})) as { upload?: Upload; error?: string };
      if (!response.ok || !payload.upload) throw new Error(payload.error ?? "Unable to upload image");
      setUploads((current) => [payload.upload!, ...current]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function deleteUpload(upload: Upload) {
    setDeletingId(upload.id);
    setError(null);
    try {
      const response = await fetch(`/api/template-uploads/${upload.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to delete image");
      setUploads((current) => current.filter((item) => item.id !== upload.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete image");
    } finally {
      setDeletingId(null);
    }
  }

  const filteredUploads = uploads.filter((upload) => upload.original_name.toLowerCase().includes(query.trim().toLowerCase()));

  return <div className="mt-1">
    <label className="flex h-11 items-center gap-2.5 rounded-xl border border-[#ded8f4] bg-white px-3 text-[#777] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <Search className="h-4 w-4 shrink-0 text-[#222]" />
      <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search uploads" placeholder="Search images" className="min-w-0 flex-1 bg-transparent text-[12px] text-[#333] outline-none placeholder:text-[#999]" />
    </label>
    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadFile(file); }} />
    <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#222] px-3 text-[12px] font-semibold text-white transition hover:bg-[#3a3a3a] disabled:cursor-wait disabled:opacity-60">
      {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
      {uploading ? "Uploading…" : "Upload files"}
    </button>
    <div className="mt-6">
      <p className="text-[13px] font-semibold text-[#222]">Images</p>
      {error ? <p className="mt-2 rounded-lg bg-[#fff3f3] px-2.5 py-2 text-[11px] leading-4 text-[#bb4b4b]">{error}</p> : null}
      {loading ? <div className="mt-3 flex items-center justify-center rounded-2xl border border-dashed border-[#d9e5e8] bg-[#fbfdfd] py-12 text-[#9aa8ab]"><LoaderCircle className="h-5 w-5 animate-spin" /></div> : filteredUploads.length ? <div className="mt-3 grid grid-cols-2 gap-2">{filteredUploads.map((upload) => <div key={upload.id} className="group relative overflow-hidden rounded-2xl border border-[#edf0f1] bg-[#f6f8f8]"><img src={upload.public_url} alt={upload.original_name} className="aspect-[4/3] w-full object-cover" /><button type="button" onClick={() => void deleteUpload(upload)} disabled={deletingId === upload.id} aria-label={`Delete ${upload.original_name}`} className="absolute right-1.5 top-1.5 rounded-lg bg-white/90 p-1.5 text-[#666] opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-[#c34b4b] disabled:cursor-wait disabled:opacity-60"><Trash2 className="h-3.5 w-3.5" /></button><p className="truncate px-2 py-2 text-[10px] text-[#666]">{upload.original_name}</p></div>)}</div> : <div className="mt-3 flex aspect-[4/3] flex-col items-center justify-center rounded-2xl border border-dashed border-[#d9e5e8] bg-[#fbfdfd] px-4 text-center text-[11px] leading-5 text-[#99a1a4]"><ImageIcon className="mb-2 h-6 w-6 text-[#aabfc4]" /><span>{uploads.length ? "No images match your search" : "Uploaded images will appear here"}</span></div>}
    </div>
  </div>;
}
