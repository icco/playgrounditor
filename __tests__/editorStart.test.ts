import { resolveEditorStart } from '../src/lib/editorStart';
import { GitHubError, NETWORK_ERROR_STATUS } from '../src/lib/github';
import { Draft } from '../src/lib/localFiles';

jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: {} }));

const server = { sha: 'server', text: 'from server' };
const offline = new GitHubError('offline', NETWORK_ERROR_STATUS);
const missing = new GitHubError('Not Found', 404);

function draft(text: string, extra: Partial<Draft> = {}): Draft {
  return { repoFullName: 'alice/notes', path: 'a.md', defaultBranch: 'main', text, baseSha: 'old', updatedAt: '', ...extra };
}

describe('resolveEditorStart', () => {
  it('opens the server copy when there is no draft', () => {
    expect(resolveEditorStart(null, server, null)).toEqual({
      savedText: 'from server',
      text: 'from server',
      sha: 'server',
      restoredDraft: false,
      notice: null,
    });
  });

  it('keeps the base of a changed draft, so a stale commit fails as a conflict', () => {
    expect(resolveEditorStart(draft('mine'), server, null)).toMatchObject({
      text: 'mine',
      savedText: 'from server',
      sha: 'old',
      restoredDraft: true,
      notice: 'This file changed on GitHub since your draft was started.',
    });
  });

  it('uses the server base when a draft matches the server', () => {
    expect(resolveEditorStart(draft('from server'), server, null)).toMatchObject({ sha: 'server', restoredDraft: false });
  });

  it('falls back to the cached copy when offline', () => {
    expect(resolveEditorStart(null, server, offline)).toMatchObject({
      sha: 'server',
      notice: 'Showing the copy saved on this device.',
    });
  });

  it('fails when offline with nothing saved', () => {
    expect(resolveEditorStart(null, null, offline)).toEqual({ error: 'offline' });
  });

  it('fails on a GitHub error without a draft, even with a cached copy', () => {
    expect(resolveEditorStart(null, server, missing)).toEqual({ error: 'Not Found' });
  });

  it('keeps a draft reachable when its file is gone from GitHub', () => {
    expect(resolveEditorStart(draft('mine'), null, missing)).toMatchObject({
      text: 'mine',
      sha: 'old',
      notice: 'Could not load from GitHub: Not Found',
    });
  });

  it('shows why a draft was not sent ahead of other notices', () => {
    expect(resolveEditorStart(draft('mine', { sendError: 'does not match' }), server, null)).toMatchObject({
      notice: 'Not sent: does not match',
    });
  });
});
