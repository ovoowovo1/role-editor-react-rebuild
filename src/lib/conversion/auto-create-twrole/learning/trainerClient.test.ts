import { describe, expect, it } from 'vitest';
import { AutoCreateTrainerClient } from './trainerClient';
import type {
  AutoCreateTrainerRequest,
  AutoCreateTrainerResponse
} from './trainerProtocol';
import type { LearningStoreStatus } from './types';

function status(camp: string): LearningStoreStatus {
  return {
    camp,
    enabled: true,
    phase: 'collecting',
    activeModelRevision: null,
    stagingModelRevision: null,
    runtime: 'none',
    lastError: null,
    lastTrainedAt: null,
    exampleCount: 0,
    recentCount: 0,
    reservoirCount: 0,
    estimatedBytes: 0,
    outcomeCounts: { exact: 0, invalid: 0, censored: 0 },
    modeCounts: { add: 0, replace: 0 },
    bucketCounts: {
      exploration: 0,
      'high-positive': 0,
      'near-zero': 0,
      'general-negative': 0,
      invalid: 0,
      'hard-negative': 0,
      'hard-positive': 0
    },
    exactModeCounts: { add: 0, replace: 0 },
    targetSignatureCounts: { add: 0, replace: 0 }
  };
}

class FakeWorker {
  onmessage: ((event: MessageEvent<AutoCreateTrainerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  messages: AutoCreateTrainerRequest[] = [];
  terminated = false;

  postMessage(message: AutoCreateTrainerRequest): void {
    this.messages.push(message);
  }

  respond(response: AutoCreateTrainerResponse): void {
    this.onmessage?.({ data: response } as MessageEvent<AutoCreateTrainerResponse>);
  }

  terminate(): void {
    this.terminated = true;
  }
}

describe('AutoCreateTrainerClient', () => {
  it('keeps request ids isolated while sharing one lazy Worker', async () => {
    const worker = new FakeWorker();
    let created = 0;
    const client = new AutoCreateTrainerClient({
      workerFactory: () => {
        created += 1;
        return worker;
      }
    });

    const skydowPromise = client.getStatus('skydow');
    const civilPromise = client.getStatus('civil');
    expect(created).toBe(1);
    expect(worker.messages).toHaveLength(2);

    const civilRequest = worker.messages[1];
    worker.respond({
      type: 'status',
      id: civilRequest.id,
      status: status('civil'),
      activeTrainedModes: [],
      readiness: {
        add: {
          exact: 0,
          requiredExact: 8_000,
          targetSignatures: 0,
          requiredTargetSignatures: 3,
          ready: false
        },
        replace: {
          exact: 0,
          requiredExact: 512,
          targetSignatures: 0,
          requiredTargetSignatures: 3,
          ready: false
        },
        eligibleModes: [],
        canTrain: false
      }
    });
    await expect(civilPromise).resolves.toMatchObject({
      status: { camp: 'civil' }
    });

    const skydowRequest = worker.messages[0];
    worker.respond({
      type: 'status',
      id: skydowRequest.id,
      status: status('skydow'),
      activeTrainedModes: [],
      readiness: {
        add: {
          exact: 0,
          requiredExact: 8_000,
          targetSignatures: 0,
          requiredTargetSignatures: 3,
          ready: false
        },
        replace: {
          exact: 0,
          requiredExact: 512,
          targetSignatures: 0,
          requiredTargetSignatures: 3,
          ready: false
        },
        eligibleModes: [],
        canTrain: false
      }
    });
    await expect(skydowPromise).resolves.toMatchObject({
      status: { camp: 'skydow' }
    });
    client.dispose();
    expect(worker.terminated).toBe(true);
  });

  it('deserializes Worker failures', async () => {
    const worker = new FakeWorker();
    const client = new AutoCreateTrainerClient({ workerFactory: () => worker });
    const request = client.setEnabled('skydow', false);
    worker.respond({
      type: 'error',
      id: worker.messages[0].id,
      error: { name: 'QuotaExceededError', message: 'IndexedDB is full' }
    });
    await expect(request).rejects.toMatchObject({
      name: 'QuotaExceededError',
      message: 'IndexedDB is full'
    });
  });
});
