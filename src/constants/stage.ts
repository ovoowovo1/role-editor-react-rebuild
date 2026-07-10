export const BODY_ANIMATION_FRAME_MS = 1000 / 12;

/**
 * Moving hundreds of display objects through a temporary Pixi container is
 * noticeably more expensive than moving a lightweight preview. Keep live
 * multi-drag rendering bounded regardless of document size.
 */
export const LIVE_MULTI_DRAG_ITEM_LIMIT = 250;

/**
 * Exact transformed bounds call into Pixi for every selected display. Above
 * this limit, point bounds are accurate enough for interaction and much less
 * expensive to calculate.
 */
export const PRECISE_SELECTION_BOUNDS_LIMIT = 120;

/** Cap canvas backing-store density to avoid oversized GPU render targets. */
export const STAGE_MAX_RESOLUTION = 2;

export const DEFER_STAGE_SYNC_DECO_COUNT = 2000;
export const SCROLL_SURFACE_PADDING = 160;
