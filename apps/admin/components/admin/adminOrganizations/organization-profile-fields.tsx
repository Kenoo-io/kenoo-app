"use client";

import Image from "next/image";
import { useState } from "react";
import { Building2, Camera, Loader2, Plus } from "lucide-react";

import { SquareImageCrop } from "@/components/ui/square-image-crop";

/** Center-crops an image file to a 1:1 square, client-side. */
async function centerCropToSquare(file: File): Promise<File> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });

  const size = Math.min(image.width, image.height);
  const sx = (image.width - size) / 2;
  const sy = (image.height - size) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported");
  ctx.drawImage(image, sx, sy, size, size, 0, 0, size, size);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, file.type || "image/jpeg", 0.92),
  );
  if (!blob) throw new Error("Failed to crop image");

  return new File([blob], file.name || "icon.jpg", {
    type: blob.type || file.type || "image/jpeg",
  });
}

export function OrganizationAvatar({
  name,
  iconUrl,
}: {
  name: string;
  iconUrl: string | null;
}) {
  if (iconUrl) {
    return (
      <Image
        src={iconUrl}
        alt={`${name} icon`}
        width={88}
        height={88}
        className="h-[88px] w-[88px] rounded-2xl object-cover"
      />
    );
  }

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="flex h-[88px] w-[88px] items-center justify-center rounded-2xl bg-neutral-100 text-xl font-medium text-neutral-500">
      {initials || <Building2 className="h-7 w-7" />}
    </div>
  );
}

export function OrganizationIconUpload({
  name,
  iconUrl,
  canEdit,
  isUploading,
  onSelectFile,
}: {
  name: string;
  iconUrl: string | null;
  canEdit: boolean;
  isUploading: boolean;
  onSelectFile: (file: File) => void;
}) {
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setTempImage(reader.result as string);
        setShowCropDialog(true);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const avatar = <OrganizationAvatar name={name} iconUrl={iconUrl} />;

  if (!canEdit) {
    return avatar;
  }

  return (
    <>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id="organization-icon-upload"
        disabled={isUploading}
      />
      <label
        htmlFor="organization-icon-upload"
        className={`group relative block cursor-pointer ${isUploading ? "pointer-events-none opacity-70" : ""}`}
      >
        {avatar}
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : (
            <Plus className="h-5 w-5 text-white" />
          )}
        </div>
      </label>

      {tempImage ? (
        <SquareImageCrop
          open={showCropDialog}
          onOpenChange={setShowCropDialog}
          imageUrl={tempImage}
          onCropComplete={(file) => {
            onSelectFile(file);
            setTempImage(null);
          }}
        />
      ) : null}
    </>
  );
}

/**
 * For flows where the organization doesn't exist yet (no name to derive
 * initials from) — a dashed placeholder instead of an initials avatar.
 */
export function OrganizationIconPicker({
  previewUrl,
  onSelectFile,
}: {
  previewUrl: string | null;
  onSelectFile: (file: File) => void;
}) {
  const [isCropping, setIsCropping] = useState(false);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsCropping(true);
    try {
      const cropped = await centerCropToSquare(file);
      onSelectFile(cropped);
    } catch {
      // Cropping failed (e.g. unsupported format) — fall back to the original file.
      onSelectFile(file);
    } finally {
      setIsCropping(false);
    }
  };

  return (
    <>
      <input
        type="file"
        accept="image/*"
        onChange={(event) => void handleFileChange(event)}
        className="hidden"
        id="organization-icon-picker"
        disabled={isCropping}
      />
      <label
        htmlFor="organization-icon-picker"
        className={`group relative flex h-[88px] w-[88px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl transition-colors ${
          previewUrl
            ? "hover:opacity-90"
            : "border-2 border-dashed border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100"
        } ${isCropping ? "pointer-events-none opacity-70" : ""}`}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
          <img
            src={previewUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : isCropping ? (
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        ) : (
          <Building2 className="h-7 w-7 text-neutral-400 transition-colors group-hover:text-neutral-500" />
        )}
        {previewUrl && !isCropping ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <Camera className="h-5 w-5 text-white" />
          </div>
        ) : null}
      </label>
    </>
  );
}

export function SectionCard({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-950">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[13px] text-neutral-500">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
