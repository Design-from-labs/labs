import {
  ImageGenerationLoader,
  type ImageGenerationLoaderVariant,
} from "@/components/ui/image-generation-loader";

const VARIANTS: ImageGenerationLoaderVariant[] = [
  "skeleton",
  "bands",
  "tiles",
  "scan",
  "pixel-grid",
  "resolution",
  "coalesce",
  "diffusion",
  "raster",
  "bloom",
  "focus",
  "shutter",
];

export default function ImageGenerationLoaderDemo() {
  return (
    <ul className="grid grid-cols-3 gap-3 text-foreground sm:grid-cols-4">
      {VARIANTS.map((variant) => (
        <li key={variant} className="flex flex-col items-center gap-2">
          <ImageGenerationLoader
            variant={variant}
            size={72}
            label={`Generating image (${variant})`}
          />
          <span className="text-muted-foreground text-xs">{variant}</span>
        </li>
      ))}
    </ul>
  );
}
