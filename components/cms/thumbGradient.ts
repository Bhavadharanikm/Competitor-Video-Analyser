// Deterministic warm-gradient placeholder shown wherever we don't have a real thumbnail
// image to render, so the same entry always gets the same color.
const THUMB_GRADIENTS = [
  "linear-gradient(160deg, #6B4A32, #B98A5E)",
  "linear-gradient(160deg, #8A5A34, #D9A066)",
  "linear-gradient(160deg, #C98A4B, #EFC48C)",
  "linear-gradient(160deg, #4A6B5A, #8FBFA3)",
  "linear-gradient(160deg, #5A4A6B, #A98FBF)",
  "linear-gradient(160deg, #6B5A4A, #D9BF8F)",
];

export function thumbGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return THUMB_GRADIENTS[hash % THUMB_GRADIENTS.length];
}
