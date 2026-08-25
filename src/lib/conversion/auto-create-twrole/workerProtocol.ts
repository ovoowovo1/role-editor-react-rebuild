import type {
  AutoCreateTwroleCheckpoint,
  AutoCreateTwroleProgress,
  AutoCreateTwroleResult,
  RunAutoCreateTwroleOptions
} from './contracts';
import type { AutoCreateTwroleDiagnostics } from './diagnostics';
import type { CandidateLearningExampleDraft } from './learning/types';

export type WorkerStartMessage = {
  type: 'start';
  id: string;
  targetFile: File;
  decoOptions: RunAutoCreateTwroleOptions['decoOptions'];
  settings?: RunAutoCreateTwroleOptions['settings'];
  learningScope?: RunAutoCreateTwroleOptions['learningScope'];
  resumeSnapshot?: RunAutoCreateTwroleOptions['resumeSnapshot'];
  collectDiagnostics?: boolean;
};

export type WorkerAbortMessage = {
  type: 'abort';
  id: string;
};

export type WorkerRequestMessage = WorkerStartMessage | WorkerAbortMessage;

export type WorkerSerializedError = {
  name?: string;
  message?: string;
  stack?: string;
};

export type WorkerResponseMessage =
  | { type: 'progress'; id: string; progress: AutoCreateTwroleProgress; diagnostics?: AutoCreateTwroleDiagnostics }
  | { type: 'learning-batch'; id: string; camp: string; examples: CandidateLearningExampleDraft[] }
  | { type: 'learning-experience'; id: string; camp: string; serializedState: string }
  | { type: 'checkpoint'; id: string; checkpoint: AutoCreateTwroleCheckpoint }
  | { type: 'done'; id: string; result: AutoCreateTwroleResult; diagnostics?: AutoCreateTwroleDiagnostics }
  | { type: 'stopped'; id: string; result: AutoCreateTwroleResult; checkpoint: AutoCreateTwroleCheckpoint; diagnostics?: AutoCreateTwroleDiagnostics }
  | { type: 'error'; id: string; error: WorkerSerializedError; diagnostics?: AutoCreateTwroleDiagnostics };
