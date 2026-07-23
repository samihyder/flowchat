import type { Area } from 'react-easy-crop';

const MAX_FREE_EDGE = 2400;

export type CropExportOptions = {
  imageSrc: string;
  croppedAreaPixels: Area;
  outputWidth: number | null;
  outputHeight: number | null;
  /** mime type for blob; default image/png */
  mimeType?: string;
  quality?: number;
  fileName?: string;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', () => reject(new Error('Failed to load image for cropping')));
    img.crossOrigin = 'anonymous';
    img.src = src;
  });
}

function resolveOutputSize(
  crop: Area,
  outputWidth: number | null,
  outputHeight: number | null
): { width: number; height: number } {
  if (outputWidth && outputHeight) {
    return { width: Math.round(outputWidth), height: Math.round(outputHeight) };
  }
  if (outputWidth && !outputHeight) {
    const height = Math.round((outputWidth * crop.height) / crop.width);
    return { width: Math.round(outputWidth), height };
  }
  if (!outputWidth && outputHeight) {
    const width = Math.round((outputHeight * crop.width) / crop.height);
    return { width, height: Math.round(outputHeight) };
  }

  let width = Math.round(crop.width);
  let height = Math.round(crop.height);
  const long = Math.max(width, height);
  if (long > MAX_FREE_EDGE) {
    const scale = MAX_FREE_EDGE / long;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  return { width: Math.max(1, width), height: Math.max(1, height) };
}

/** Crop + optionally resize the selected region to a File. */
export async function getCroppedImageFile(options: CropExportOptions): Promise<File> {
  const {
    imageSrc,
    croppedAreaPixels,
    outputWidth,
    outputHeight,
    mimeType = 'image/png',
    quality = 0.92,
    fileName = 'cropped-image.png',
  } = options;

  const image = await loadImage(imageSrc);
  const { width, height } = resolveOutputSize(croppedAreaPixels, outputWidth, outputHeight);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported in this browser');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    width,
    height
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to export cropped image'))),
      mimeType,
      quality
    );
  });

  const safeName = fileName.replace(/\.[^.]+$/, '') + (mimeType === 'image/jpeg' ? '.jpg' : '.png');
  return new File([blob], safeName, { type: mimeType });
}

export function revokeObjectUrl(url: string | null | undefined) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}
