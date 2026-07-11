const ACTOR_BODY_LIBRARY = 'actor01_body';

function actorBodyAnimationSequences(actorRuntime) {
  const timelineId = actorRuntime?.timelinesByLinkage?.[ACTOR_BODY_LIBRARY];
  const sequences = timelineId != null ? actorRuntime?.timelinesById?.[timelineId]?.sequences : undefined;
  return sequences && typeof sequences === 'object' ? sequences : {};
}

export function splitGafManifestPayload(payload) {
  const metadata = {
    schemaVersion: payload.schemaVersion,
    source: payload.source,
    assetManifest: payload.assetManifest,
    decorationGafSymbols: payload.decorationGafSymbols,
    decorationAtlasFrameData: payload.decorationAtlasFrameData,
    actorAtlasFrameData: payload.actorAtlasFrameData,
    actorFallbackFrameCounts: payload.actorFallbackFrameCounts,
    actorBodyAnimationSequences: actorBodyAnimationSequences(payload.actorRuntime)
  };
  const runtime = {
    schemaVersion: payload.schemaVersion,
    source: payload.source
  };

  for (const key of ['decorationRuntime', 'assetsRuntime', 'actorRuntime']) {
    if (payload[key] !== undefined) runtime[key] = payload[key];
  }

  return { metadata, runtime };
}
