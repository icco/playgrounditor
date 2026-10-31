import { GitHub } from '../src/lib/github';
import { clearLocalFiles, getDraft, saveDraft, writeDraft } from '../src/lib/localFiles';
import { clearOpenFile, flushOutbox, setOpenFile, stopOutbox } from '../src/lib/outbox';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: (k: string) => Promise.resolve(store.get(k) ?? null),
      setItem: (k: string, v: string) => Promise.resolve(void store.set(k, v)),
      removeItem: (k: string) => Promise.resolve(void store.delete(k)),
      getAllKeys: () => Promise.resolve([...store.keys()]),
    },
  };
});

function respond(body: unknown, status = 200): Response {
  return { ok: status < 400, status, statusText: 'status', json: () => Promise.resolve(body) } as Response;
}

const queued = {
  repoFullName: 'alice/notes',
  path: 'a.md',
  defaultBranch: 'main',
  text: 'hello',
  baseSha: 'old',
  queued: { mode: 'direct' as const, message: 'docs: a' },
};

describe('outbox', () => {
  beforeEach(async () => {
    clearOpenFile();
    await clearLocalFiles();
    await writeDraft(queued);
  });

  it('sends a queued commit and removes the draft', async () => {
    const onSent = jest.fn();
    await flushOutbox(new GitHub('t', jest.fn().mockResolvedValue(respond({ content: { sha: 'new' } }))), onSent);
    expect(onSent).toHaveBeenCalledTimes(1);
    expect(await getDraft('alice/notes', 'a.md')).toBeNull();
  });

  it('stays queued on a network failure', async () => {
    const onSent = jest.fn();
    await flushOutbox(new GitHub('t', jest.fn().mockRejectedValue(new TypeError('offline'))), onSent);
    expect(onSent).not.toHaveBeenCalled();
    expect((await getDraft('alice/notes', 'a.md'))?.queued).toBeDefined();
  });

  it('keeps the text and flags the draft on a conflict', async () => {
    await flushOutbox(new GitHub('t', jest.fn().mockResolvedValue(respond({ message: 'does not match' }, 409))), jest.fn());
    const draft = await getDraft('alice/notes', 'a.md');
    expect(draft?.text).toBe('hello');
    expect(draft?.queued).toBeUndefined();
    expect(draft?.sendError).toBe('does not match');
  });

  it('leaves a file alone while it is open', async () => {
    const fetcher = jest.fn();
    setOpenFile('alice/notes', 'a.md');
    await flushOutbox(new GitHub('t', fetcher), jest.fn());
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('keeps newer text that arrives while a commit is sending', async () => {
    const fetcher = jest.fn(async () => {
      await saveDraft({ repoFullName: 'alice/notes', path: 'a.md', defaultBranch: 'main', text: 'newer', baseSha: 'old' });
      return respond({ content: { sha: 'new' } });
    });
    await flushOutbox(new GitHub('t', fetcher), jest.fn());
    expect((await getDraft('alice/notes', 'a.md'))?.text).toBe('newer');
  });

  it('stops sending after sign out', async () => {
    await writeDraft({ ...queued, path: 'b.md' });
    const fetcher = jest.fn(() => {
      stopOutbox();
      return Promise.resolve(respond({ content: { sha: 'new' } }));
    });
    await flushOutbox(new GitHub('t', fetcher), jest.fn());
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('keeps the queued commit when the draft is edited', async () => {
    await saveDraft({ repoFullName: 'alice/notes', path: 'a.md', defaultBranch: 'main', text: 'newer', baseSha: 'old' });
    const draft = await getDraft('alice/notes', 'a.md');
    expect(draft?.text).toBe('newer');
    expect(draft?.queued?.message).toBe('docs: a');
  });
});
