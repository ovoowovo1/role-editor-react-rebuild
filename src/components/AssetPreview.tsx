import { useEffect, useState } from 'react';
import type { PartOption } from '../types/role';
import { probeAtlasTextureUrl } from '../lib/runtime/atlasTextureAvailability';

interface AssetPreviewProps {
  option?: PartOption;
  size?: number;
  className?: string;
}

export function AssetPreview({ option, size = 50, className = '' }: AssetPreviewProps) {
  const [atlasOk, setAtlasOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (!option?.atlas) {
      setAtlasOk(null);
      return;
    }
    let cancelled = false;
    setAtlasOk(null);
    probeAtlasTextureUrl(option.atlas.texture).then((ok) => {
      if (!cancelled) setAtlasOk(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [option?.atlas?.texture]);

  if (!option) return <span className={className}>?</span>;

  if (!option.atlas) {
    return <img className={className} src={option.icon} alt="" draggable={false} />;
  }

  if (atlasOk === false) {
    return (
      <span
        className={`atlas-preview atlas-preview--missing ${className}`}
        style={{ width: size, height: size }}
        title="Atlas PNG missing or failed to load"
        aria-label="Missing texture"
      >
        ×
      </span>
    );
  }

  if (atlasOk === null) {
    return <span className={`atlas-preview atlas-preview--loading ${className}`} style={{ width: size, height: size }} aria-hidden />;
  }

  const frameScale = Math.min(size / option.atlas.width, size / option.atlas.height, 1.8);
  const frameWidth = option.atlas.width * frameScale;
  const frameHeight = option.atlas.height * frameScale;

  return (
    <span
      className={`atlas-preview ${className}`}
      style={{ width: size, height: size }}
      title={`${option.code} from ${option.atlas.texture}`}
    >
      <span
        className="atlas-preview-frame"
        style={{
          width: option.atlas.width,
          height: option.atlas.height,
          backgroundImage: `url(${option.atlas.texture})`,
          backgroundPosition: `-${option.atlas.x}px -${option.atlas.y}px`,
          transform: `translate(${(size - frameWidth) / 2}px, ${(size - frameHeight) / 2}px) scale(${frameScale})`
        }}
      />
    </span>
  );
}
