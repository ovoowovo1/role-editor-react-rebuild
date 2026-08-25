import type {
  AutoCreateTrainerClearResult,
  AutoCreateTrainerRequest,
  AutoCreateTrainerResponse,
  AutoCreateTrainerSerializedError,
  AutoCreateTrainerTrainingResult,
  AutoCreateTrainerOptions,
  AutoCreateTrainingReadiness
} from './trainerProtocol';
import type { LearningStoreStatus } from './types';
import { AUTO_CREATE_EXPERIENCE_STORAGE_PREFIX } from '../contracts';

export interface AutoCreateTrainerWorkerLike {
  onmessage: ((event: MessageEvent<AutoCreateTrainerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: AutoCreateTrainerRequest): void;
  terminate(): void;
}

export interface AutoCreateTrainerClientOptions {
  workerFactory?: () => AutoCreateTrainerWorkerLike;
}

export interface AutoCreateTrainerStatusResult {
  status: LearningStoreStatus;
  readiness: AutoCreateTrainingReadiness;
  activeTrainedModes: readonly ('add' | 'replace')[];
}

interface PendingRequest {
  resolve: (response: AutoCreateTrainerResponse) => void;
  reject: (error: Error) => void;
}

type WithoutId<T> = T extends { id: string } ? Omit<T, 'id'> : never;
type AutoCreateTrainerRequestDraft = WithoutId<AutoCreateTrainerRequest>;

let requestSequence = 0;

function nextRequestId(): string {
  requestSequence += 1;
  return `auto_create_trainer_${Date.now().toString(36)}_${requestSequence.toString(36)}`;
}

function deserializeError(payload: AutoCreateTrainerSerializedError): Error {
  const error = new Error(payload.message || 'AutoCreate trainer failed.');
  error.name = payload.name || 'Error';
  if (payload.stack) error.stack = payload.stack;
  return error;
}

function defaultWorkerFactory(): AutoCreateTrainerWorkerLike {
  if (typeof Worker === 'undefined') {
    throw new Error('AutoCreate trainer requires Web Worker support.');
  }
  return new Worker(
    new URL('../../../../workers/autoCreateTrainer.worker.ts', import.meta.url),
    { type: 'module' }
  );
}

/**
 * One lazy, long-lived trainer Worker can serve every camp while the Worker
 * itself serializes mutations per camp.
 */
export class AutoCreateTrainerClient {
  private readonly workerFactory: () => AutoCreateTrainerWorkerLike;
  private worker: AutoCreateTrainerWorkerLike | null = null;
  private readonly pending = new Map<string, PendingRequest>();

  constructor(options: AutoCreateTrainerClientOptions = {}) {
    this.workerFactory = options.workerFactory ?? defaultWorkerFactory;
  }

  private ensureWorker(): AutoCreateTrainerWorkerLike {
    if (this.worker) return this.worker;
    const worker = this.workerFactory();
    worker.onmessage = (event) => {
      const response = event.data;
      const pending = this.pending.get(response.id);
      if (!pending) return;
      this.pending.delete(response.id);
      if (response.type === 'error') {
        pending.reject(deserializeError(response.error));
      } else {
        pending.resolve(response);
      }
    };
    worker.onerror = (event) => {
      const error = new Error(event.message || 'AutoCreate trainer Worker crashed.');
      this.rejectAll(error);
      this.worker?.terminate();
      this.worker = null;
    };
    this.worker = worker;
    return worker;
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }

  private send<T extends AutoCreateTrainerResponse>(
    request: AutoCreateTrainerRequestDraft,
    expectedType: T['type']
  ): Promise<T> {
    const id = nextRequestId();
    const worker = this.ensureWorker();
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (response) => {
          if (response.type !== expectedType) {
            reject(new Error(
              `AutoCreate trainer returned ${response.type}; expected ${expectedType}.`
            ));
            return;
          }
          resolve(response as T);
        },
        reject
      });
      try {
        worker.postMessage({ ...request, id } as AutoCreateTrainerRequest);
      } catch (error) {
        this.pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  async getStatus(camp: string): Promise<AutoCreateTrainerStatusResult> {
    const response = await this.send<
    Extract<AutoCreateTrainerResponse, { type: 'status' }>>(
      { type: 'get-status', camp },
      'status'
    );
    return {
      status: response.status,
      readiness: response.readiness,
      activeTrainedModes: response.activeTrainedModes
    };
  }

  async requestBackgroundTraining(
    camp: string,
    options?: AutoCreateTrainerOptions
  ): Promise<AutoCreateTrainerTrainingResult> {
    const response = await this.send<
    Extract<AutoCreateTrainerResponse, { type: 'training-result' }>>(
      { type: 'train', camp, options },
      'training-result'
    );
    return response.result;
  }

  async clearCamp(
    camp: string,
    preserveEnabled = true
  ): Promise<AutoCreateTrainerClearResult> {
    const response = await this.send<
    Extract<AutoCreateTrainerResponse, { type: 'clear-result' }>>(
      { type: 'clear', camp, preserveEnabled },
      'clear-result'
    );
    return response.result;
  }

  async setEnabled(camp: string, enabled: boolean): Promise<LearningStoreStatus> {
    const response = await this.send<
    Extract<AutoCreateTrainerResponse, { type: 'enabled-result' }>>(
      { type: 'set-enabled', camp, enabled },
      'enabled-result'
    );
    return response.status;
  }

  dispose(): void {
    this.rejectAll(new Error('AutoCreate trainer client was disposed.'));
    this.worker?.terminate();
    this.worker = null;
  }
}

let sharedTrainerClient: AutoCreateTrainerClient | null = null;

export function getSharedAutoCreateTrainerClient(): AutoCreateTrainerClient {
  sharedTrainerClient ??= new AutoCreateTrainerClient();
  return sharedTrainerClient;
}

export function getAutoCreateTrainerStatus(
  camp: string
): Promise<AutoCreateTrainerStatusResult> {
  return getSharedAutoCreateTrainerClient().getStatus(camp);
}

export function requestAutoCreateBackgroundTraining(
  camp: string,
  options?: AutoCreateTrainerOptions
): Promise<AutoCreateTrainerTrainingResult> {
  return getSharedAutoCreateTrainerClient().requestBackgroundTraining(camp, options);
}

export function clearAutoCreateLearningCamp(
  camp: string,
  preserveEnabled = true
): Promise<AutoCreateTrainerClearResult> {
  return getSharedAutoCreateTrainerClient()
    .clearCamp(camp, preserveEnabled)
    .then((result) => {
      // ExperienceMemory predates the IndexedDB learning store and may still
      // have one or more per-settings records in localStorage. Clearing a camp
      // must not let that legacy state silently repopulate the fresh store.
      try {
        if (typeof localStorage !== 'undefined') {
          const normalizedCamp = camp.trim().toLocaleLowerCase('en-US');
          const prefix = `${AUTO_CREATE_EXPERIENCE_STORAGE_PREFIX}${normalizedCamp}:`;
          const keys: string[] = [];
          for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            if (key?.startsWith(prefix)) keys.push(key);
          }
          for (const key of keys) localStorage.removeItem(key);
        }
      } catch {
        // Private browsing may expose localStorage but reject access. The
        // IndexedDB clear already succeeded, so keep the control usable.
      }
      return result;
    });
}

export function setAutoCreateLearningEnabled(
  camp: string,
  enabled: boolean
): Promise<LearningStoreStatus> {
  return getSharedAutoCreateTrainerClient().setEnabled(camp, enabled);
}
