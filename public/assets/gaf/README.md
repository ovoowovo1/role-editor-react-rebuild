This folder contains the uploaded GAF metadata files:

- decorations.gaf
- twactor.gaf

To render the original art, also place the matching texture-atlas PNG files here. The default manifest in `src/mock/gafManifest.ts` points to:

- /assets/gaf/decorations.png
- /assets/gaf/twactor.png

Do not edit every generated atlas frame if your filenames or folder change. Update `defaultGafAssetManifest` instead:

```ts
export const defaultGafAssetManifest = {
  decorations: '/assets/gaf/decorations.gaf',
  actor: '/assets/gaf/twactor.gaf',
  decorationsTexture: '/assets/gaf/decorations.png',
  actorTexture: '/assets/gaf/twactor.png',
  decorationsTextureName: 'decorations.png',
  actorTextureName: 'twactor.png'
} as const;
```

The React rebuild reads atlas rectangles pre-extracted from the GAF files and injects the texture URLs from that manifest at runtime. If the PNG files are missing, the UI falls back to generated SVG placeholders.
