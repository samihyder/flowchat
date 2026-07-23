'use client';

import { useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { InfoHint } from '@/components/media/info-hint';
import { ImageCropDialog, useImageCropFlow } from '@/components/media/image-crop-dialog';
import type { ImagePresetId } from '@/lib/media/image-presets';

type Props = {
  onReady: (file: File) => void | Promise<void>;
  accept?: string;
  disabled?: boolean;
  buttonLabel?: string;
  /** Shown next to the button for module-specific guidance. */
  info?: ReactNode;
  allowedPresetIds?: ImagePresetId[];
  defaultPresetId?: ImagePresetId;
  title?: string;
  /** If true, skip crop for non-images (e.g. PDF) and pass file through. */
  passThroughNonImages?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
};

/**
 * File picker that opens crop/resize for images before calling onReady.
 */
export function ImageUploadWithCrop({
  onReady,
  accept = 'image/*',
  disabled,
  buttonLabel = 'Choose image',
  info,
  allowedPresetIds,
  defaultPresetId,
  title,
  passThroughNonImages = false,
  className = '',
  variant = 'secondary',
  size = 'sm',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const crop = useImageCropFlow();

  const handlePick = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      if (passThroughNonImages) {
        await onReady(file);
        return;
      }
      return;
    }
    crop.openWithFile(file);
  };

  return (
    <div className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handlePick(file);
          e.target.value = '';
        }}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {buttonLabel}
      </Button>
      {info && <InfoHint>{info}</InfoHint>}

      {crop.imageSrc && (
        <ImageCropDialog
          open={crop.isOpen}
          imageSrc={crop.imageSrc}
          fileName={crop.fileName}
          allowedPresetIds={allowedPresetIds}
          defaultPresetId={defaultPresetId}
          title={title}
          onCancel={crop.close}
          onComplete={async (file) => {
            await onReady(file);
            crop.close();
          }}
        />
      )}
    </div>
  );
}
