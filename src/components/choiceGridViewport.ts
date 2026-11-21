export const CHOICE_ITEM_WIDTH = 86;
export const CHOICE_ROW_HEIGHT = 86;
const OVERSCAN_ROWS = 6;
const DEFAULT_VIEWPORT_HEIGHT = 520;

export interface ChoiceGridViewport {
  columns: number;
  viewportHeight: number;
  firstRow: number;
  lastRowExclusive: number;
}

export function updateChoiceGridViewport(
  previous: ChoiceGridViewport | undefined,
  scrollTop: number,
  columns: number,
  viewportHeight: number
): ChoiceGridViewport {
  const firstRow = Math.max(0, Math.floor(scrollTop / CHOICE_ROW_HEIGHT) - OVERSCAN_ROWS);
  const lastRowExclusive = Math.ceil((scrollTop + viewportHeight) / CHOICE_ROW_HEIGHT) + OVERSCAN_ROWS;
  if (
    previous?.columns === columns &&
    previous.viewportHeight === viewportHeight &&
    previous.firstRow === firstRow &&
    previous.lastRowExclusive === lastRowExclusive
  ) {
    return previous;
  }
  return { columns, viewportHeight, firstRow, lastRowExclusive };
}

export const initialChoiceGridViewport = updateChoiceGridViewport(undefined, 0, 4, DEFAULT_VIEWPORT_HEIGHT);

export function resizeChoiceGridViewport(
  previous: ChoiceGridViewport, width: number, height: number, scrollTop: number
): ChoiceGridViewport {
  return updateChoiceGridViewport(
    previous, scrollTop, Math.max(2, Math.floor(width / CHOICE_ITEM_WIDTH)), height || DEFAULT_VIEWPORT_HEIGHT
  );
}
