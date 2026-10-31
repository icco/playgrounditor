import { errorMessage } from './errors';
import { GitHubError, NETWORK_ERROR_STATUS } from './github';
import { CachedFile, Draft } from './localFiles';

export type EditorStart =
  | { error: string }
  | { savedText: string; text: string; sha?: string; restoredDraft: boolean; notice: string | null };

function noticeFor(draft: Draft | null, base: CachedFile | null, fetchError: unknown, isNetworkFailure: boolean): string | null {
  if (draft?.sendError) return `Not sent: ${draft.sendError}`;
  if (draft?.queued) return 'Queued to send when you leave this file while online.';
  if (fetchError && !isNetworkFailure) return `Could not load from GitHub: ${errorMessage(fetchError, 'unknown error')}`;
  if (fetchError) return 'Showing the copy saved on this device.';
  if (draft?.baseSha && base && draft.baseSha !== base.sha) return 'This file changed on GitHub since your draft was started.';
  return null;
}

export function resolveEditorStart(draft: Draft | null, base: CachedFile | null, fetchError: unknown): EditorStart {
  const isNetworkFailure = fetchError instanceof GitHubError && fetchError.status === NETWORK_ERROR_STATUS;
  // A draft must stay reachable even if its file was deleted or renamed on GitHub.
  if (fetchError && !draft && !(isNetworkFailure && base)) {
    return { error: errorMessage(fetchError, 'Failed to read file') };
  }
  const savedText = base?.text ?? '';
  const restoredDraft = !!draft && draft.text !== savedText;
  return {
    savedText,
    text: draft?.text ?? savedText,
    // A draft keeps its original base so a commit fails with a conflict if the file moved on.
    sha: restoredDraft ? draft.baseSha : base?.sha,
    restoredDraft,
    notice: noticeFor(draft, base, fetchError, isNetworkFailure),
  };
}
