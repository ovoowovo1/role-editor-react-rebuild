interface Resource {
  owned: boolean;
  users: number;
  revoke(src: string): void;
}

const resources = new Map<string, Resource>();

function releaseIfUnused(src: string, resource: Resource): void {
  if (resource.owned || resource.users !== 0) return;
  resources.delete(src);
  resource.revoke(src);
}

/** Keep a source available while a renderer record may still be loading or using it. */
export function retainReferenceImageUrl(src: string): () => void {
  const resource = resources.get(src);
  if (!resource) return () => undefined;
  resource.users++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    resource.users--;
    releaseIfUnused(src, resource);
  };
}

type PendingReferenceImage = {
  controller: AbortController;
  submitted: boolean;
  generation: number;
};

/** Owns URLs until their pending work or all committed editor history is gone. */
export function createReferenceImageUrlOwner(revoke = (src: string) => URL.revokeObjectURL(src)) {
  const owned = new Set<string>();
  const pending = new Map<string, PendingReferenceImage>();
  let epoch = 0;
  let generation = 0;

  const release = (src: string) => {
    if (!owned.delete(src)) return;
    const upload = pending.get(src);
    pending.delete(src);
    upload?.controller.abort();
    const resource = resources.get(src);
    if (!resource) return;
    resource.owned = false;
    releaseIfUnused(src, resource);
  };

  return {
    begin(src: string): AbortSignal {
      owned.add(src);
      resources.set(src, { owned: true, users: 0, revoke });
      const controller = new AbortController();
      pending.set(src, { controller, submitted: false, generation });
      return controller.signal;
    },
    submit(src: string): void {
      const upload = pending.get(src);
      if (upload) upload.submitted = true;
    },
    prepareClear(): number {
      generation++;
      for (const [src, upload] of pending) {
        // An old decode must not silently add its image to the next role.
        // Submitted uploads stay alive until the clear has actually committed.
        if (!upload.submitted) release(src);
      }
      return generation;
    },
    collect(
      reachable: ReadonlySet<string>,
      clearedGeneration = 0,
      committedSubmissions: ReadonlySet<string> = new Set()
    ): void {
      for (const src of owned) {
        const upload = pending.get(src);
        if (reachable.has(src)) {
          if (upload?.submitted) pending.delete(src);
        } else if (!upload || (
          upload.submitted && (upload.generation < clearedGeneration || committedSubmissions.has(src))
        )) {
          release(src);
        }
      }
    },
    fail: release,
    activate(): void {
      epoch++;
    },
    deactivate(): void {
      const retiringEpoch = ++epoch;
      // React StrictMode runs a synthetic cleanup+setup without an actual unmount.
      queueMicrotask(() => {
        if (epoch !== retiringEpoch) return;
        for (const src of owned) release(src);
      });
    }
  };
}
