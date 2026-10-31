import { CommitResult, GitHub, GitHubError, Repo, isTransient } from './github';
import { Draft, cacheFile, deleteDraft, getDraft, listDrafts, writeDraft } from './localFiles';

type Listener = () => void;

const listeners = new Set<Listener>();
let openFile: string | null = null;
let flushing = false;
let flushAgain = false;
let outboxSession = 0;

export function stopOutbox(): void {
  outboxSession += 1;
}

function fileId(repoFullName: string, path: string): string {
  return `${repoFullName}:${path}`;
}

export function subscribeOutbox(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  listeners.forEach(listener => listener());
}

export const notifyOutbox = notify;

// The editor owns the draft while it is open, so sending waits until the file is closed.
export function setOpenFile(repoFullName: string, path: string): void {
  openFile = fileId(repoFullName, path);
}

export function clearOpenFile(): void {
  openFile = null;
}

export async function queueCommit(draft: Omit<Draft, 'updatedAt' | 'sendError'>): Promise<void> {
  await writeDraft(draft);
  notify();
}

async function send(github: GitHub, draft: Draft): Promise<CommitResult> {
  const repo = { full_name: draft.repoFullName, default_branch: draft.defaultBranch } as Repo;
  const res = await github.commit({
    repo,
    path: draft.path,
    text: draft.text,
    sha: draft.baseSha,
    message: draft.queued!.message,
    mode: draft.queued!.mode,
  });
  if (draft.queued!.mode === 'direct') {
    cacheFile(draft.repoFullName, draft.path, { sha: res.sha, text: draft.text }).catch((e: unknown) =>
      console.warn('Could not cache file', e),
    );
  }
  return res;
}

export async function flushOutbox(github: GitHub, onSent: (draft: Draft) => void): Promise<void> {
  if (flushing) {
    flushAgain = true;
    return;
  }
  flushing = true;
  const session = outboxSession;
  try {
    do {
      flushAgain = false;
      for (const { repoFullName, path } of await listDrafts()) {
        if (session !== outboxSession) return;
        // Re-read each one: earlier sends take time, and the file may have been opened or edited since.
        const draft = await getDraft(repoFullName, path);
        if (!draft?.queued || fileId(repoFullName, path) === openFile) continue;
        try {
          await send(github, draft);
          if (session !== outboxSession) return;
          if ((await getDraft(repoFullName, path))?.text === draft.text) {
            await deleteDraft(repoFullName, path);
          }
          onSent(draft);
        } catch (e: unknown) {
          if (session !== outboxSession) return;
          if (isTransient(e) || (e instanceof GitHubError && e.status === 401)) return;
          const current = await getDraft(repoFullName, path);
          if (current) {
            const sendError = e instanceof Error ? e.message : 'Could not send this commit';
            await writeDraft({ ...current, queued: undefined, sendError });
          }
        }
        notify();
      }
    } while (flushAgain);
  } finally {
    flushing = false;
  }
}
