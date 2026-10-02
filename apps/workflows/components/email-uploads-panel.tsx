"use client";

import * as React from "react";
import { Check, Download, Folder, FolderPlus, Image as ImageIcon, Info, LoaderCircle, MoreVertical, Search, Trash2, UploadCloud, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@walls/ui/dropdown-menu";

type Upload = {
  id: string;
  original_name: string;
  public_url: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  folder_id: string | null;
  folder_ids?: string[];
};

type UploadFolder = {
  id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function ImageUploadSkeleton() {
  return <div className="animate-pulse overflow-hidden rounded-2xl border border-[#edf0f1] bg-[#f6f8f8]"><div className="relative aspect-[4/3] w-full overflow-hidden bg-[#e3eaec]"><div className="absolute -inset-8 rotate-12 bg-gradient-to-r from-transparent via-white/30 to-transparent" /><div className="absolute inset-3 rounded-xl border border-white/30 bg-[#dce5e7]/45" /></div></div>;
}

export function EmailUploadsPanel({ initialView = "images" }: { initialView?: "images" | "folders" }) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = React.useState<Upload[]>([]);
  const [folders, setFolders] = React.useState<UploadFolder[]>([]);
  const [assetView, setAssetView] = React.useState<"images" | "folders">(initialView);
  const [activeFolderId, setActiveFolderId] = React.useState<string | null>(null);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [creatingFolder, setCreatingFolder] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [foldersLoading, setFoldersLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [selectedUploadIds, setSelectedUploadIds] = React.useState<Set<string>>(new Set());
  const [deletingSelected, setDeletingSelected] = React.useState(false);
  const [detailsUpload, setDetailsUpload] = React.useState<Upload | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = React.useState(false);
  const [folderPickerOpen, setFolderPickerOpen] = React.useState(false);
  const [folderPickerUploadIds, setFolderPickerUploadIds] = React.useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = React.useState<Set<string>>(new Set());
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

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/template-upload-folders")
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as { folders?: UploadFolder[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to load folders");
        if (!cancelled) setFolders(payload.folders ?? []);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load folders");
      })
      .finally(() => {
        if (!cancelled) setFoldersLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function createFolder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newFolderName.trim();
    if (!name || creatingFolder) return;
    setCreatingFolder(true);
    setError(null);
    try {
      const response = await fetch("/api/template-upload-folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, parentId: activeFolderId }) });
      const payload = await response.json().catch(() => ({})) as { folder?: UploadFolder; error?: string };
      if (!response.ok || !payload.folder) throw new Error(payload.error ?? "Unable to create folder");
      setFolders((current) => [...current, payload.folder!].sort((a, b) => a.name.localeCompare(b.name)));
      setNewFolderName("");
      setCreateFolderOpen(false);
    } catch (folderError) {
      setError(folderError instanceof Error ? folderError.message : "Unable to create folder");
    } finally {
      setCreatingFolder(false);
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    if (activeFolderId) formData.set("folderId", activeFolderId);
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
      setSelectedUploadIds((current) => {
        const next = new Set(current);
        next.delete(upload.id);
        return next;
      });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete image");
    } finally {
      setDeletingId(null);
    }
  }

  function openFolderPicker(upload?: Upload) {
    if (upload) {
      setFolderPickerUploadIds(new Set([upload.id]));
      setSelectedFolderIds(new Set(upload.folder_ids ?? (upload.folder_id ? [upload.folder_id] : [])));
    } else {
      setFolderPickerUploadIds(new Set());
      setSelectedFolderIds(new Set());
    }
    setError(null);
    setFolderPickerOpen(true);
  }

  async function addSelectedToFolders() {
    const uploadIds = folderPickerUploadIds.size ? [...folderPickerUploadIds] : [...selectedUploadIds];
    if (!uploadIds.length || !selectedFolderIds.size) return;
    setError(null);
    try {
      const response = await fetch("/api/template-upload-folder-memberships", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uploadIds, folderIds: [...selectedFolderIds] }) });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to add images to folders");
      setUploads((current) => current.map((upload) => uploadIds.includes(upload.id) ? { ...upload, folder_ids: [...new Set([...(upload.folder_ids ?? (upload.folder_id ? [upload.folder_id] : [])), ...selectedFolderIds])] } : upload));
      setSelectedFolderIds(new Set());
      setFolderPickerUploadIds(new Set());
      setFolderPickerOpen(false);
      setSelectedUploadIds(new Set());
    } catch (folderError) {
      setError(folderError instanceof Error ? folderError.message : "Unable to add images to folders");
    }
  }

  async function saveFolderMemberships() {
    const uploadIds = [...folderPickerUploadIds];
    const upload = uploads.find((item) => item.id === uploadIds[0]);
    if (!uploadIds.length || !upload) return;

    const currentFolderIds = new Set(upload.folder_ids ?? (upload.folder_id ? [upload.folder_id] : []));
    const foldersToAdd = [...selectedFolderIds].filter((folderId) => !currentFolderIds.has(folderId));
    const foldersToRemove = [...currentFolderIds].filter((folderId) => !selectedFolderIds.has(folderId));
    setError(null);
    try {
      if (foldersToAdd.length) {
        const response = await fetch("/api/template-upload-folder-memberships", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uploadIds, folderIds: foldersToAdd }) });
        const payload = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to add image to folders");
      }
      if (foldersToRemove.length) {
        const response = await fetch("/api/template-upload-folder-memberships", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uploadIds, folderIds: foldersToRemove }) });
        const payload = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to remove image from folders");
      }
      setUploads((current) => current.map((item) => item.id === upload.id ? { ...item, folder_id: selectedFolderIds.has(item.folder_id ?? "") ? item.folder_id : [...selectedFolderIds][0] ?? null, folder_ids: [...selectedFolderIds] } : item));
      setFolderPickerOpen(false);
      setFolderPickerUploadIds(new Set());
      setSelectedFolderIds(new Set());
    } catch (folderError) {
      setError(folderError instanceof Error ? folderError.message : "Unable to update image folders");
    }
  }

  async function deleteSelectedUploads() {
    const selectedUploads = uploads.filter((upload) => selectedUploadIds.has(upload.id));
    if (!selectedUploads.length) return;

    setDeletingSelected(true);
    setError(null);
    try {
      const responses = await Promise.all(selectedUploads.map((upload) => fetch(`/api/template-uploads/${upload.id}`, { method: "DELETE" })));
      const failedResponse = responses.find((response) => !response.ok);
      if (failedResponse) {
        const payload = await failedResponse.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error ?? "Unable to delete selected images");
      }
      const selectedIds = new Set(selectedUploads.map((upload) => upload.id));
      setUploads((current) => current.filter((upload) => !selectedIds.has(upload.id)));
      setSelectedUploadIds(new Set());
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete selected images");
    } finally {
      setDeletingSelected(false);
    }
  }

  const filteredUploads = uploads.filter((upload) => (!activeFolderId || upload.folder_ids?.includes(activeFolderId) || upload.folder_id === activeFolderId) && upload.original_name.toLowerCase().includes(query.trim().toLowerCase()));
  const filteredFolders = folders.filter((folder) => folder.name.toLowerCase().includes(query.trim().toLowerCase()));

  function toggleUploadSelection(uploadId: string) {
    setSelectedUploadIds((current) => {
      const next = new Set(current);
      if (next.has(uploadId)) next.delete(uploadId);
      else next.add(uploadId);
      return next;
    });
  }

  function downloadUpload(upload: Upload) {
    console.debug("[workflows] starting upload download", {
      uploadId: upload.id,
      fileName: upload.original_name,
      sizeBytes: upload.size_bytes,
    });
    window.location.assign(`/api/template-uploads/${upload.id}/download`);
  }

  return <div className="flex h-full min-h-0 flex-col">
    {assetView === "images" ? <>
      <label className="flex h-11 items-center gap-2.5 rounded-xl border border-[#e5e5e5] bg-white px-3 text-[#777] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <Search className="h-4 w-4 shrink-0 text-[#222]" />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search uploads" placeholder="Search images" className="min-w-0 flex-1 bg-transparent text-[12px] text-[#333] outline-none placeholder:text-[#999]" />
      </label>
      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadFile(file); }} />
      <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#222] px-3 text-[12px] font-semibold text-white transition hover:bg-[#3a3a3a] disabled:cursor-wait disabled:opacity-60">
        {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
        {uploading ? "Uploading…" : "Upload files"}
      </button>
    </> : <>
      <label className="flex h-11 items-center gap-2.5 rounded-xl border border-[#e5e5e5] bg-white px-3 text-[#777] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <Search className="h-4 w-4 shrink-0 text-[#222]" />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label={activeFolderId ? "Search images in folder" : "Search folders"} placeholder={activeFolderId ? "Search images in folder" : "Search folders"} className="min-w-0 flex-1 bg-transparent text-[12px] text-[#333] outline-none placeholder:text-[#999]" />
      </label>
      <button type="button" onClick={() => { setNewFolderName(""); setError(null); setCreateFolderOpen(true); }} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#222] px-3 text-[12px] font-semibold text-white transition hover:bg-[#3a3a3a]">
        <FolderPlus className="h-4 w-4" /> Create folder
      </button>
    </>}
    <div className="mt-6 flex min-h-0 flex-1 flex-col">
      {initialView === "images" ? <div role="tablist" aria-label="Upload library" className="flex items-center gap-5">
        {(["images", "folders"] as const).map((view) => <button key={view} type="button" role="tab" aria-selected={assetView === view} onClick={() => { setAssetView(view); setQuery(""); }} className={`relative px-1 pb-2.5 pt-1 text-[12px] capitalize transition ${assetView === view ? "font-semibold text-[#222] after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-[#6eadc0]" : "font-medium text-[#999] hover:text-[#555]"}`}>{view}</button>)}
      </div> : null}
      {error ? <p className="mt-2 rounded-lg bg-[#fff3f3] px-2.5 py-2 text-[11px] leading-4 text-[#bb4b4b]">{error}</p> : null}
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      {assetView === "images" ? <>
      {activeFolderId ? <div className="flex items-center justify-between pt-4"><p className="text-[13px] font-semibold text-[#222]">{folders.find((folder) => folder.id === activeFolderId)?.name ?? "Folder"}</p><button type="button" onClick={() => setActiveFolderId(null)} className="text-[11px] font-medium text-[#4d9eae] hover:underline">All images</button></div> : null}
      {loading ? <div className="mt-3 grid grid-cols-2 gap-2" aria-label="Loading images" role="status">{[0, 1, 2, 3].map((item) => <ImageUploadSkeleton key={item} />)}</div> : filteredUploads.length ? <div className="mt-3 grid grid-cols-2 gap-2">{filteredUploads.map((upload) => {
        const selected = selectedUploadIds.has(upload.id);
        return <div key={upload.id} className={`group relative overflow-hidden rounded-2xl border bg-[#f6f8f8] ${selected ? "border-[#222]" : "border-[#edf0f1]"}`}>
          <img src={upload.public_url} alt={upload.original_name} className="aspect-[4/3] w-full object-cover" />
          <button type="button" onClick={() => toggleUploadSelection(upload.id)} aria-label={`${selected ? "Deselect" : "Select"} ${upload.original_name}`} aria-pressed={selected} className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border shadow-sm transition ${selected ? "border-[#222] bg-[#222] text-white" : "border-[#aeb4b7] bg-white/95 text-transparent opacity-0 group-hover:opacity-100"}`}>
            <Check className="h-4 w-4" strokeWidth={3} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label={`More options for ${upload.original_name}`} className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-[#222] opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-white">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={8} className="z-[240] min-w-[240px] overflow-hidden rounded-2xl border border-neutral-200 bg-white p-0 shadow-xl">
              <DropdownMenuLabel className="px-4 py-3">
                <p className="truncate text-sm font-semibold text-[#222]">{upload.original_name}</p>
                <p className="mt-1 text-[11px] font-normal text-[#888]">Uploaded image</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setDetailsUpload(upload)} className="cursor-pointer rounded-none px-4 py-3 text-sm text-[#222] focus:bg-[#f5f6f7]">
                <Info className="mr-3 h-5 w-5" />
                Details
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => downloadUpload(upload)} className="cursor-pointer rounded-none px-4 py-3 text-sm text-[#222] focus:bg-[#f5f6f7]">
                <Download className="mr-3 h-5 w-5" />
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => openFolderPicker(upload)} className="cursor-pointer rounded-none px-4 py-3 text-sm text-[#222] focus:bg-[#edf8fa]">
                <Folder className="mr-3 h-5 w-5" />
                Move
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="rounded-none px-4 py-3 text-sm text-[#222]">
                <X className="mr-3 h-5 w-5" />
                Remove from folder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void deleteUpload(upload)} disabled={deletingId === upload.id} className="cursor-pointer rounded-none px-4 py-3 text-sm text-[#c34b4b] focus:bg-red-50 focus:text-[#c34b4b]">
                <Trash2 className="mr-3 h-5 w-5" />
                Move to Trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>;
      })}</div> : <div className="mt-3 flex aspect-[4/3] flex-col items-center justify-center rounded-2xl border border-dashed border-[#d9e5e8] bg-[#fbfdfd] px-4 text-center text-[11px] leading-5 text-[#99a1a4]"><ImageIcon className="mb-2 h-6 w-6 text-[#aabfc4]" /><span>{uploads.length ? "No images match your search" : "Uploaded images will appear here"}</span></div>}
      </> : <div className="pt-2">
        {activeFolderId ? <div className="mb-3 flex items-center justify-between"><p className="text-[13px] font-semibold text-[#222]">{folders.find((folder) => folder.id === activeFolderId)?.name ?? "Folder"}</p><button type="button" onClick={() => { setActiveFolderId(null); setQuery(""); }} className="text-[11px] font-medium text-[#4d9eae] hover:underline">All folders</button></div> : null}
      </div>}
      </div>
      {selectedUploadIds.size ? <div className="shrink-0 pt-3">
        <div className="flex items-center gap-3 rounded-2xl border border-[#e6e8eb] bg-white px-3 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.14)]">
        <button type="button" onClick={() => setSelectedUploadIds(new Set())} aria-label="Clear selection" className="rounded-xl p-2 text-[#222] transition hover:bg-[#f3f4f4]"><X className="h-5 w-5" /></button>
        <span className="flex-1 text-sm text-[#222]">{selectedUploadIds.size} selected</span>
        <button type="button" onClick={() => { setSelectedFolderIds(new Set()); setFolderPickerOpen(true); }} aria-label="Add selected images to folders" title="Add to folders" className="rounded-xl p-2 text-[#222] transition hover:bg-[#f1fbfc] hover:text-[#4d9eae]"><Folder className="h-5 w-5" /></button>
        <button type="button" onClick={() => void deleteSelectedUploads()} disabled={deletingSelected} aria-label="Delete selected images" className="rounded-xl p-2 text-[#222] transition hover:bg-[#fff1f1] hover:text-[#c34b4b] disabled:cursor-wait disabled:opacity-50"><Trash2 className="h-5 w-5" /></button>
        </div>
      </div> : null}
    </div>
    {createFolderOpen ? <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/10 p-4" onClick={() => setCreateFolderOpen(false)}>
      <form onSubmit={createFolder} onClick={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-[#e1e4e8] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.2)]">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-[#222]">Create folder</h2><p className="mt-1 text-xs text-[#888]">{activeFolderId ? `Create a subfolder inside ${folders.find((folder) => folder.id === activeFolderId)?.name ?? "this folder"}.` : "Organize your uploaded images into a new folder."}</p></div><button type="button" onClick={() => setCreateFolderOpen(false)} aria-label="Close create folder dialog" className="rounded-xl p-2 text-[#555] transition hover:bg-[#f3f4f4]"><X className="h-5 w-5" /></button></div>
        <label className="mt-5 block"><span className="mb-1.5 block text-[11px] font-medium text-[#777]">Folder name</span><input autoFocus required maxLength={100} value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder={activeFolderId ? "e.g. Product shots" : "e.g. Brand assets"} className="h-10 w-full rounded-lg border border-[#dfe4e6] bg-white px-3 text-[12px] text-[#333] outline-none placeholder:text-[#aaa] focus:border-[#8fcbd5] focus:ring-2 focus:ring-[#dff3f6]" /></label>
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setCreateFolderOpen(false)} className="rounded-lg px-3.5 py-2.5 text-[12px] font-medium text-[#666] transition hover:bg-[#f5f5f5]">Cancel</button><button type="submit" disabled={creatingFolder || !newFolderName.trim()} className="inline-flex items-center gap-2 rounded-lg bg-[#222] px-3.5 py-2.5 text-[12px] font-medium text-white transition hover:bg-[#3a3a3a] disabled:cursor-wait disabled:opacity-50">{creatingFolder ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />}Create folder</button></div>
      </form>
    </div> : null}
    {folderPickerOpen ? <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/10 p-4" onClick={() => setFolderPickerOpen(false)}>
      <section role="dialog" aria-modal="true" aria-labelledby="folder-picker-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-[#e1e4e8] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.2)]">
        <div className="flex items-start justify-between gap-4"><div><h2 id="folder-picker-title" className="text-lg font-semibold text-[#222]">{folderPickerUploadIds.size ? "Manage folders" : "Add to folders"}</h2><p className="mt-1 text-xs text-[#888]">{folderPickerUploadIds.size ? "Choose the folders this image should belong to." : "Choose one or more folders for the selected images."}</p></div><button type="button" onClick={() => setFolderPickerOpen(false)} aria-label="Close folder picker" className="rounded-xl p-2 text-[#555] transition hover:bg-[#f3f4f4]"><X className="h-5 w-5" /></button></div>
        <div className="mt-5 max-h-56 space-y-1 overflow-y-auto">{folders.length ? folders.map((folder) => { const checked = selectedFolderIds.has(folder.id); return <label key={folder.id} className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition ${checked ? "bg-[#edf8fa]" : "hover:bg-[#f5f6f7]"}`}><input type="checkbox" checked={checked} onChange={() => setSelectedFolderIds((current) => { const next = new Set(current); if (next.has(folder.id)) next.delete(folder.id); else next.add(folder.id); return next; })} className="h-4 w-4 accent-[#6eadc0]" /><Folder className="h-4 w-4 text-[#6eadc0]" /><span className="min-w-0 flex-1 truncate text-[12px] text-[#333]">{folder.name}</span></label>; }) : <p className="rounded-xl border border-dashed border-[#d9e5e8] px-3 py-6 text-center text-[11px] text-[#99a1a4]">Create a folder first.</p>}</div>
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setFolderPickerOpen(false)} className="rounded-lg px-3.5 py-2.5 text-[12px] font-medium text-[#666] transition hover:bg-[#f5f5f5]">Cancel</button><button type="button" onClick={() => void (folderPickerUploadIds.size ? saveFolderMemberships() : addSelectedToFolders())} disabled={(!folderPickerUploadIds.size && !selectedFolderIds.size) || !folders.length} className="rounded-lg bg-[#222] px-3.5 py-2.5 text-[12px] font-medium text-white transition hover:bg-[#3a3a3a] disabled:cursor-not-allowed disabled:opacity-40">{folderPickerUploadIds.size ? "Save folders" : "Add to folders"}</button></div>
      </section>
    </div> : null}
    {detailsUpload ? <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/10 p-4" onClick={() => setDetailsUpload(null)}>
      <section role="dialog" aria-modal="true" aria-labelledby="upload-details-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-[#e1e4e8] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.2)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="upload-details-title" className="truncate text-lg font-semibold text-[#222]">Details</h2>
            <p className="mt-1 truncate text-xs text-[#888]">{detailsUpload.original_name}</p>
          </div>
          <button type="button" onClick={() => setDetailsUpload(null)} aria-label="Close details" className="rounded-xl p-2 text-[#555] transition hover:bg-[#f3f4f4]"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 space-y-4 text-sm">
          <div className="flex items-center justify-between gap-4"><span className="font-semibold text-[#3d3f42]">Saved in</span><span className="flex items-center gap-2 text-[#555]"><Folder className="h-4 w-4 text-[#b8babc]" /> {detailsUpload.folder_id ? folders.find((folder) => folder.id === detailsUpload.folder_id)?.name ?? "Folder" : "All uploads"}</span></div>
          <div className="flex items-center justify-between gap-4"><span className="font-semibold text-[#3d3f42]">Type</span><span className="text-[#555]">Image</span></div>
          <div className="flex items-center justify-between gap-4"><span className="font-semibold text-[#3d3f42]">Format</span><span className="rounded-full bg-[#f3f4f4] px-2.5 py-1 uppercase text-xs font-semibold text-[#555]">{detailsUpload.mime_type.split("/")[1] ?? "file"}</span></div>
          <div className="flex items-center justify-between gap-4"><span className="font-semibold text-[#3d3f42]">Size</span><span className="text-[#555]">{formatBytes(detailsUpload.size_bytes)}</span></div>
          <div className="flex items-center justify-between gap-4"><span className="font-semibold text-[#3d3f42]">Date created</span><span className="text-[#555]">{formatUploadDate(detailsUpload.created_at)}</span></div>
        </div>
      </section>
    </div> : null}
  </div>;
}
