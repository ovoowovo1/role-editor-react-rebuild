/**
 * Backwards-compatible internal alias. New code should import the unified
 * role history controller directly.
 */
export {
  useRoleHistoryController as useRoleEditorHistory
} from './useRoleHistoryController';
export type {
  RoleBaseHistoryApi,
  UseRoleHistoryControllerOptions
} from './useRoleHistoryController';
