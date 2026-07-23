/** Shared image size / crop presets for module uploads. */

export type ImagePresetId =
  | 'free'
  | 'square'
  | 'logo'
  | 'avatar'
  | 'signature'
  | 'stamp'
  | 'letterhead-us-letter'
  | 'letterhead-a4'
  | 'document-header'
  | 'document-banner'
  | 'custom';

export type ImagePreset = {
  id: ImagePresetId;
  label: string;
  /** Null = freeform crop (any aspect). */
  aspect: number | null;
  /** Output width in px when exporting (null = keep crop pixel size). */
  outputWidth: number | null;
  /** Output height in px when exporting (null = derived from aspect). */
  outputHeight: number | null;
  /** Short help shown next to the info icon. */
  hint: string;
  /** Modules / features that typically use this preset. */
  modules: string[];
};

/** US Letter at 150 DPI (print-ready letterhead / page background). */
export const US_LETTER_PX = { width: 1275, height: 1650 } as const;
/** A4 at 150 DPI. */
export const A4_PX = { width: 1240, height: 1754 } as const;

export const IMAGE_PRESETS: ImagePreset[] = [
  {
    id: 'free',
    label: 'Free crop',
    aspect: null,
    outputWidth: null,
    outputHeight: null,
    hint: 'Crop freely with no fixed aspect. Output keeps the cropped pixel size (capped at 2400px on the long edge).',
    modules: ['General'],
  },
  {
    id: 'logo',
    label: 'Workspace logo',
    aspect: 1,
    outputWidth: 512,
    outputHeight: 512,
    hint: 'Square logo for Settings → Account and email signatures. Exports at 512×512 PNG.',
    modules: ['Account', 'Email marketing'],
  },
  {
    id: 'square',
    label: 'Square (1:1)',
    aspect: 1,
    outputWidth: 800,
    outputHeight: 800,
    hint: 'General square crop. Good for seals, stamps, and square brand marks.',
    modules: ['Documents'],
  },
  {
    id: 'avatar',
    label: 'Avatar',
    aspect: 1,
    outputWidth: 256,
    outputHeight: 256,
    hint: 'Small square portrait for profile / agent avatars.',
    modules: ['Agents', 'Contacts'],
  },
  {
    id: 'signature',
    label: 'Signature',
    aspect: 3,
    outputWidth: 600,
    outputHeight: 200,
    hint: 'Wide signature strip for document signing blocks. Transparent PNG recommended.',
    modules: ['Documents · Brand'],
  },
  {
    id: 'stamp',
    label: 'Stamp / seal',
    aspect: 1,
    outputWidth: 400,
    outputHeight: 400,
    hint: 'Circular or square company stamp for quotations and invoices.',
    modules: ['Documents · Brand'],
  },
  {
    id: 'letterhead-us-letter',
    label: 'Letterhead · US Letter',
    aspect: US_LETTER_PX.width / US_LETTER_PX.height,
    outputWidth: US_LETTER_PX.width,
    outputHeight: US_LETTER_PX.height,
    hint: 'Full-page letterhead for US Letter (8.5×11 in) at 150 DPI — 1275×1650 px. Use as document background.',
    modules: ['Documents · Brand'],
  },
  {
    id: 'letterhead-a4',
    label: 'Letterhead · A4',
    aspect: A4_PX.width / A4_PX.height,
    outputWidth: A4_PX.width,
    outputHeight: A4_PX.height,
    hint: 'Full-page letterhead for A4 (210×297 mm) at 150 DPI — 1240×1754 px. Use as document background.',
    modules: ['Documents · Brand'],
  },
  {
    id: 'document-header',
    label: 'Document header',
    aspect: 4,
    outputWidth: 1200,
    outputHeight: 300,
    hint: 'Wide header band for quotations and invoices (not a full page).',
    modules: ['Documents'],
  },
  {
    id: 'document-banner',
    label: 'Document banner',
    aspect: 16 / 9,
    outputWidth: 1280,
    outputHeight: 720,
    hint: '16:9 banner for cover pages or marketing inserts inside documents.',
    modules: ['Documents', 'Marketing'],
  },
  {
    id: 'custom',
    label: 'Custom size',
    aspect: null,
    outputWidth: null,
    outputHeight: null,
    hint: 'Set your own output width and height (pixels). Aspect lock follows width÷height when both are set.',
    modules: ['General'],
  },
];

export function getImagePreset(id: ImagePresetId): ImagePreset {
  return IMAGE_PRESETS.find((p) => p.id === id) ?? IMAGE_PRESETS[0]!;
}

/** Default preset suggestions by DAS asset kind / feature. */
export function defaultPresetForKind(kind: string): ImagePresetId {
  switch (kind) {
    case 'logo':
      return 'logo';
    case 'signature':
    case 'initials':
      return 'signature';
    case 'stamp':
    case 'seal':
      return 'stamp';
    case 'letterhead':
      return 'letterhead-us-letter';
    case 'avatar':
      return 'avatar';
    default:
      return 'free';
  }
}

export function presetsForFeature(feature: 'account-logo' | 'das-asset' | 'letterhead' | 'general'): ImagePresetId[] {
  switch (feature) {
    case 'account-logo':
      return ['logo', 'square', 'free', 'custom'];
    case 'letterhead':
      return ['letterhead-us-letter', 'letterhead-a4', 'document-header', 'free', 'custom'];
    case 'das-asset':
      return [
        'logo',
        'signature',
        'stamp',
        'square',
        'letterhead-us-letter',
        'letterhead-a4',
        'document-header',
        'free',
        'custom',
      ];
    default:
      return IMAGE_PRESETS.map((p) => p.id);
  }
}
