import type { AutoCreateTwroleResult } from './auto-create-twrole/contracts';

export {
  AutoCreateTwroleStoppedError,
  DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
  isAutoCreateTwroleStoppedError
} from './auto-create-twrole/contracts';
export type {
  AutoCreateTwroleCheckpoint,
  AutoCreateTwroleLegacyDecoEntry,
  AutoCreateTwroleProgress,
  AutoCreateTwroleProgressStage,
  AutoCreateTwroleResult,
  AutoCreateRankerRunInfo,
  AutoCreateRankerRuntime,
  AutoCreateRankerStatus,
  AutoCreateSearchStrategy,
  AutoCreateTwroleSettings,
  AutoCreateTwroleSnapshot,
  AutoCreateTwroleSnapshotTile,
  AutoCreateTwroleStoppedResult,
  RunAutoCreateTwroleOptions
} from './auto-create-twrole/contracts';
export { runAutoCreateTwrole } from './auto-create-twrole/runner';

export function createAutoCreateTwroleExportBlob(
  result: Pick<AutoCreateTwroleResult, 'exportJson'>
): Blob {
  return new Blob([JSON.stringify(result.exportJson, null, 2)], { type: 'application/json' });
}
