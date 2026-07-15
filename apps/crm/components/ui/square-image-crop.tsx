"use client";

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/image-crop-dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/image-crop-slider";
import { Label } from "@/components/ui/label";

interface SquareImageCropProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onCropComplete: (croppedImage: File) => void;
}

function clampOffset(
  offset: { x: number; y: number },
  container: HTMLDivElement,
  image: HTMLImageElement,
  scale: number
) {
  const rect = container.getBoundingClientRect();
  const containerSize = rect.width;

  const imgAspect = image.naturalWidth / image.naturalHeight;

  let displayedWidth: number;
  let displayedHeight: number;

  if (imgAspect >= 1) {
    displayedWidth = containerSize;
    displayedHeight = containerSize / imgAspect;
  } else {
    displayedHeight = containerSize;
    displayedWidth = containerSize * imgAspect;
  }

  const scaledWidth = displayedWidth * scale;
  const scaledHeight = displayedHeight * scale;

  const maxX = Math.max(0, (scaledWidth - containerSize) / 2);
  const maxY = Math.max(0, (scaledHeight - containerSize) / 2);

  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  };
}

export function SquareImageCrop({
  open,
  onOpenChange,
  imageUrl,
  onCropComplete
}: SquareImageCropProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomChange = (value: number[]) => {
    const nextScale = value[0];
    setScale(nextScale);

    if (imageRef.current && containerRef.current) {
      setOffset((prev) =>
        clampOffset(prev, containerRef.current!, imageRef.current!, nextScale)
      );
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !imageRef.current || !containerRef.current) return;

    const nextOffset = {
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    };

    const clamped = clampOffset(
      nextOffset,
      containerRef.current,
      imageRef.current,
      scale
    );

    setOffset(clamped);
  };

  const onMouseUp = () => {
    isDragging.current = false;
  };

  const handleCropComplete = () => {
    if (imageUrl && imageRef.current && containerRef.current) {
      getCroppedImage(imageRef.current, containerRef.current, offset, scale, 'croppedImage.jpg')
        .then((croppedImage) => {
          onCropComplete(croppedImage);
          onOpenChange(false);
        });
    }
  };

  // Reset offset and scale when dialog opens/closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setOffset({ x: 0, y: 0 });
      setScale(1);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        showCloseButton={true}
        className="sm:max-w-[600px] w-full p-0"
      >
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Crop Image</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          <div 
            ref={containerRef}
            className="relative w-full aspect-square max-w-[400px] mx-auto overflow-hidden mb-6 bg-neutral-100 backdrop-blur-sm shadow-inner border border-neutral-200/50 rounded-2xl"
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            {/* Fixed crop frame overlay */}
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="w-full h-full rounded-full border-2 border-white" />
            </div>
            
            {/* Draggable and zoomable image */}
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Crop me"
              draggable={false}
              onMouseDown={onMouseDown}
              style={{
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
                transformOrigin: 'center center',
                cursor: isDragging.current ? 'grabbing' : 'grab',
                userSelect: 'none',
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
              className="select-none"
            />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium text-neutral-700">Zoom</Label>
              <span className="text-sm text-neutral-700/80">
                {Math.round(scale * 100)}%
              </span>
            </div>
            <Slider
              defaultValue={[1]}
              max={3}
              min={1}
              step={0.1}
              value={[scale]}
              onValueChange={handleZoomChange}
              className="my-4"
            />
            <p className="text-sm text-neutral-700/80">
              Drag the image to adjust the crop area or use the slider to zoom.
            </p>
          </div>
        </div>
        <DialogFooter className="p-6 pt-0 border-t border-white/20">
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              className="rounded-full bg-transparent text-neutral-700 hover:text-red-600 hover:bg-white/10 border border-white/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCropComplete}
              className="rounded-full bg-white/10 backdrop-blur-xl border border-white/30 hover:bg-white/20 text-neutral-700 shadow-lg"
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getCroppedImage(
  image: HTMLImageElement,
  container: HTMLDivElement,
  offset: { x: number; y: number },
  scale: number,
  fileName: string
): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const rect = container.getBoundingClientRect();
    const img = image;

    // Get the displayed image dimensions (accounting for object-fit: contain)
    const containerAspect = rect.width / rect.height;
    const imgAspect = img.naturalWidth / img.naturalHeight;
    
    let displayedWidth: number;
    let displayedHeight: number;
    
    if (imgAspect > containerAspect) {
      // Image is wider - fit to width
      displayedWidth = rect.width;
      displayedHeight = rect.width / imgAspect;
    } else {
      // Image is taller - fit to height
      displayedWidth = rect.height * imgAspect;
      displayedHeight = rect.height;
    }

    // Calculate scale factors from displayed to natural dimensions
    const scaleX = img.naturalWidth / displayedWidth;
    const scaleY = img.naturalHeight / displayedHeight;

    // The crop frame is centered in the container
    // The container center is at (rect.width/2, rect.height/2)
    // The image is centered at (displayedWidth/2, displayedHeight/2) in its own coordinate space
    // But the image is positioned with transform, so we need to account for offset
    
    // Calculate what part of the natural image corresponds to the crop area
    // The crop size in natural image coordinates
    const cropSize = (rect.width / scale) * scaleX;
    
    // The center of the container in image coordinate space
    // Image is centered, so its center is at (displayedWidth/2, displayedHeight/2)
    // Offset moves the image, so we subtract offset to find what's at the container center
    const imageCenterX = displayedWidth / 2;
    const imageCenterY = displayedHeight / 2;
    
    // Account for pan offset - when image moves right, we see more of the left side
    const cropX = (imageCenterX - offset.x / scale) * scaleX - cropSize / 2;
    const cropY = (imageCenterY - offset.y / scale) * scaleY - cropSize / 2;

    // Clamp to image bounds
    const clampedCropX = Math.max(0, Math.min(cropX, img.naturalWidth - cropSize));
    const clampedCropY = Math.max(0, Math.min(cropY, img.naturalHeight - cropSize));
    const clampedCropSize = Math.min(
      cropSize,
      img.naturalWidth - clampedCropX,
      img.naturalHeight - clampedCropY
    );

    // Set the canvas size to a fixed square size
    const outputSize = 800;
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Draw the cropped portion
    ctx.drawImage(
      img,
      clampedCropX,
      clampedCropY,
      clampedCropSize,
      clampedCropSize,
      0,
      0,
      outputSize,
      outputSize
    );

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(new File([blob], fileName, { type: 'image/jpeg' }));
        }
      },
      'image/jpeg',
      1
    );
  });
}
