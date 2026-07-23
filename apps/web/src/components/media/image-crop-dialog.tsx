'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InfoHint } from '@/components/media/info-hint';
import { getCroppedImageFile, revokeObjectUrl } from '@/lib/media/crop-image';
import {
  getImagePreset,
  IMAGE_PRESETS,
  type ImagePresetId,
} from '@/lib/media/image-presets';

type Props = {
  open: boolean;
  imageSrc: string;
  fileName?: string;
  /** Presets offered in the size dropdown. */
  allowedPresetIds?: ImagePresetId[];
  /** Initial preset selection. */
  defaultPresetId?: ImagePresetId;
  title?: string;
  onCancel: () => void;
  onComplete: (file: File) => void | Promise<void>;
};

export function ImageCropDialog({
  open,
  imageSrc,
  fileName = 'image.png',
  allowedPresetIds,
  defaultPresetId = 'free',
  title = 'Crop & resize image',
  onCancel,
  onComplete,
}: Props) {
  const presets = useMemo(() => {
    if (!allowedPresetIds?.length) return IMAGE_PRESETS;
    return IMAGE_PRESETS.filter((p) => allowedPresetIds.includes(p.id));
  }, [allowedPresetIds]);

  const initialId =
    presets.find((p) => p.id === defaultPresetId)?.id ?? presets[0]?.id ?? 'free';

  const [presetId, setPresetId] = useState<ImagePresetId>(initialId);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [customW, setCustomW] = useState(800);
  const [customH, setCustomH] = useState(600);
  const [lockAspect, setLockAspect] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setPresetId(initialId);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError('');
    setBusy(false);
  }, [open, imageSrc, initialId]);

  const preset = getImagePreset(presetId);

  const aspect = useMemo(() => {
    if (presetId === 'custom') {
      if (!lockAspect || !customW || !customH) return undefined;
      return customW / customH;
    }
    return preset.aspect ?? undefined;
  }, [presetId, preset.aspect, lockAspect, customW, customH]);

  const outputSizeLabel = useMemo(() => {
    if (presetId === 'custom') {
      return `${customW || '—'} × ${customH || '—'} px`;
    }
    if (preset.outputWidth && preset.outputHeight) {
      return `${preset.outputWidth} × ${preset.outputHeight} px`;
    }
    return 'Cropped size (max 2400 px edge)';
  }, [presetId, preset, customW, customH]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels) {
      setError('Adjust the crop area first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      let outputWidth = preset.outputWidth;
      let outputHeight = preset.outputHeight;
      if (presetId === 'custom') {
        outputWidth = customW > 0 ? customW : null;
        outputHeight = customH > 0 ? customH : null;
        if (!outputWidth && !outputHeight) {
          throw new Error('Enter at least one custom dimension.');
        }
      }
      const file = await getCroppedImageFile({
        imageSrc,
        croppedAreaPixels,
        outputWidth,
        outputHeight,
        mimeType: 'image/png',
        fileName,
      });
      await onComplete(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not crop image');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-primary-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-crop-title"
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-primary-100 bg-gradient-to-r from-primary-50/80 to-cyan-50/50">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 id="image-crop-title" className="text-lg font-semibold text-slate-900">
                {title}
              </h2>
              <InfoHint label="About crop and resize">
                Crop the visible area, then choose an output size that matches the module (logo,
                letterhead, signature, etc.). Letter / document presets export at print-ready
                pixel sizes so documents look sharp when rendered.
              </InfoHint>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Drag to reposition · scroll or slider to zoom · pick a size preset for this feature
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-700 text-lg leading-none px-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          <div className="relative w-full h-64 sm:h-80 rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              showGrid
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-medium text-slate-600 shrink-0">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 min-w-[120px] accent-primary-600"
            />
            <span className="text-xs tabular-nums text-slate-500 w-10">{zoom.toFixed(2)}×</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="text-xs font-medium text-slate-600">Size / document format</label>
                <InfoHint label="Size preset help">{preset.hint}</InfoHint>
              </div>
              <select
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                value={presetId}
                onChange={(e) => setPresetId(e.target.value as ImagePresetId)}
              >
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                    {p.outputWidth && p.outputHeight
                      ? ` (${p.outputWidth}×${p.outputHeight})`
                      : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
                Used in: {preset.modules.join(' · ')}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="text-xs font-medium text-slate-600">Output size</label>
                <InfoHint label="Output size help">
                  Final pixel dimensions after crop. Letterhead presets match US Letter or A4 at
                  150 DPI so the image fills a page without soft edges. Logos export square for
                  crisp sidebar and email use.
                </InfoHint>
              </div>
              <div className="rounded-lg border border-primary-100 bg-primary-50/40 px-3 py-2.5 text-sm font-semibold text-primary-900 tabular-nums">
                {outputSizeLabel}
              </div>
              {(presetId === 'letterhead-us-letter' || presetId === 'letterhead-a4') && (
                <p className="mt-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
                  Letter / document page size — crop the full page artwork to this format before
                  saving as letterhead.
                </p>
              )}
            </div>
          </div>

          {presetId === 'custom' && (
            <div className="rounded-xl border border-dashed border-primary-200 bg-slate-50/80 p-4 space-y-3">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Custom dimensions
                </p>
                <InfoHint label="Custom size help">
                  Enter width and/or height in pixels. Lock aspect to keep the crop frame matching
                  width÷height. Leave one field empty to scale proportionally from the crop.
                </InfoHint>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">Width (px)</label>
                  <Input
                    type="number"
                    min={1}
                    max={4000}
                    value={customW}
                    onChange={(e) => setCustomW(Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">Height (px)</label>
                  <Input
                    type="number"
                    min={1}
                    max={4000}
                    value={customH}
                    onChange={(e) => setCustomH(Number(e.target.value) || 0)}
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={lockAspect}
                  onChange={(e) => setLockAspect(e.target.checked)}
                />
                Lock crop aspect to width ÷ height
              </label>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="shrink-0 flex justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-slate-50/80">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={() => void handleApply()} disabled={busy}>
            {busy ? 'Processing…' : 'Apply crop & resize'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Hook-style helper state for pick → crop → upload flows. */
export function useImageCropFlow() {
  const [src, setSrc] = useState<string | null>(null);
  const [name, setName] = useState('image.png');

  const openWithFile = useCallback((file: File) => {
    setSrc((prev) => {
      revokeObjectUrl(prev);
      return URL.createObjectURL(file);
    });
    setName(file.name || 'image.png');
  }, []);

  const close = useCallback(() => {
    setSrc((prev) => {
      revokeObjectUrl(prev);
      return null;
    });
  }, []);

  return { imageSrc: src, fileName: name, openWithFile, close, isOpen: Boolean(src) };
}
