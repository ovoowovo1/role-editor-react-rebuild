import { useEffect, useState } from 'react';
import type { PartOption } from '../types/role';
import { loadActorPartPreview, shouldUseActorPartRuntimePreview } from '../lib/runtime/actorPartPreview';
import { probeAtlasTextureUrl } from '../lib/runtime/atlasTextureAvailability';

interface AssetPreviewProps {
  option?: PartOption;
  size?: number;
  className?: string;
}

type RuntimePreviewState = {
  key: string;
  dataUrl: string | null;
  loading: boolean;
};

function runtimePreviewKey(option: PartOption | undefined): string | null {
  if (!option) return null;
  if (!shouldUseActorPartRuntimePreview(option)) return null;
  const actorLibrary = option.actorLibrary;
  const frame = option.frame;
  if (!actorLibrary || frame == null) return null;
  return `${actorLibrary}:${frame}`;
}

export function AssetPreview({ option, size = 50, className = '' }: AssetPreviewProps) {
  const [atlasOk, setAtlasOk] = useState<boolean | null>(null);
  const [runtimePreview, setRuntimePreview] = useState<RuntimePreviewState | null>(null);
  const actorPreviewKey = runtimePreviewKey(option);

  useEffect(() => {
    if (!option || !actorPreviewKey) {
      setRuntimePreview(null);
      return;
    }
    let cancelled = false;
    setRuntimePreview({ key: actorPreviewKey, dataUrl: null, loading: true });
    const preview = loadActorPartPreview(option);
    if (!preview) {
      setRuntimePreview(null);
      return;
    }
    preview.then((dataUrl) => {
      if (!cancelled) setRuntimePreview({ key: actorPreviewKey, dataUrl, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, [actorPreviewKey, option]);

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
  const activeRuntimePreview = runtimePreview?.key === actorPreviewKey ? runtimePreview : null;
  if (activeRuntimePreview?.dataUrl) return <img className={className} src={activeRuntimePreview.dataUrl} alt="" draggable={false} />;

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
