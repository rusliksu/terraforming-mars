// Adapted from Wrybit 988235122ffd61d8d1190e90beb2247afd252c00; uses its unmodified image variants.
export const BACKGROUND_PATH = 'assets/wrybit/shell/milky-way';
export const BACKGROUND_FORMATS = ['avif', 'webp', 'jpg'] as const;
export const BACKGROUND_WIDTHS = {
  landscape: [960, 1280, 1920, 2560, 3840],
  portrait: [540, 810, 1080, 1500],
} as const;
