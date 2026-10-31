import { decodeBase64, encodeBase64 } from './base64';
import { GITHUB_CLIENT_ID } from '../config';

const API = 'https://api.github.com';

export class GitHubError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export interface Repo {
  full_name: string;
  name: string;
  owner: { login: string };
  default_branch: string;
  private: boolean;
  description: string | null;
  pushed_at: string;
}

export interface Entry {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  sha: string;
}

export interface FileContent {
  path: string;
  sha: string;
  text: string;
}

export interface CommitResult {
  branch: string;
  sha: string;
  prUrl?: string;
}

export interface User {
  login: string;
  name: string | null;
}

export class GitHub {
  constructor(
    private token: string,
    private fetcher: typeof fetch = fetch,
  ) {}

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await this.fetcher(`${API}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    if (!res.ok) {
      let msg = res.statusText;
      try {
        const body = (await res.json()) as { message?: string };
        if (body.message) msg = body.message;
      } catch {
        // ignore non-JSON error bodies
      }
      throw new GitHubError(msg, res.status);
    }
    return (await res.json()) as T;
  }

  user(): Promise<User> {
    return this.req<User>('/user');
  }

  async repos(): Promise<Repo[]> {
    const all: Repo[] = [];
    for (let page = 1; ; page++) {
      const batch = await this.req<Repo[]>(
        `/user/repos?sort=pushed&per_page=100&page=${page}&affiliation=owner,collaborator,organization_member`,
      );
      all.push(...batch);
      if (batch.length < 100) return all;
    }
  }

  repo(fullName: string): Promise<Repo> {
    return this.req<Repo>(`/repos/${fullName}`);
  }

  async list(fullName: string, path: string, ref: string): Promise<Entry[]> {
    const entries = await this.req<Entry[]>(
      `/repos/${fullName}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`,
    );
    return sortEntries(entries);
  }

  async read(fullName: string, path: string, ref: string): Promise<FileContent> {
    const file = await this.req<{ path: string; sha: string; content: string; encoding: string }>(
      `/repos/${fullName}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`,
    );
    // Files over 1 MB come back with empty content; saving that would wipe the file.
    if (file.encoding !== 'base64') {
      throw new GitHubError('This file is too large to edit here.', 413);
    }
    return { path: file.path, sha: file.sha, text: decodeBase64(file.content) };
  }

  async commit(opts: {
    repo: Repo;
    path: string;
    text: string;
    sha?: string;
    message: string;
    mode: 'direct' | 'pr';
    branch?: string;
  }): Promise<CommitResult> {
    const { repo, path, text, sha, message, mode } = opts;
    let branch = repo.default_branch;
    if (mode === 'pr') {
      branch = opts.branch || branchName(path);
      const base = await this.req<{ object: { sha: string } }>(
        `/repos/${repo.full_name}/git/ref/heads/${encodeURIComponent(repo.default_branch)}`,
      );
      await this.req(`/repos/${repo.full_name}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: base.object.sha }),
      });
    }
    const put = await this.req<{ content: { sha: string } }>(
      `/repos/${repo.full_name}/contents/${encodePath(path)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ message, content: encodeBase64(text), sha, branch }),
      },
    );
    const result: CommitResult = { branch, sha: put.content.sha };
    if (mode === 'pr') {
      const pr = await this.req<{ html_url: string }>(`/repos/${repo.full_name}/pulls`, {
        method: 'POST',
        body: JSON.stringify({ title: message, head: branch, base: repo.default_branch }),
      });
      result.prUrl = pr.html_url;
    }
    return result;
  }
}

export function encodePath(path: string): string {
  return path.split('/').filter(Boolean).map(encodeURIComponent).join('/');
}

export function sortEntries(entries: Entry[]): Entry[] {
  return [...entries]
    .filter(e => !e.name.startsWith('.'))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function branchName(path: string, now: Date = new Date()): string {
  const base = (path.split('/').pop() ?? 'edit')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const stamp = now.toISOString().slice(0, 16).replace(/[-:T]/g, '');
  return `playgrounditor/${base || 'edit'}-${stamp}`;
}

export function isMarkdown(name: string): boolean {
  return /\.(md|markdown|mdx)$/i.test(name);
}

export function isEditable(name: string): boolean {
  return isMarkdown(name) || /\.(txt|ya?ml|json|toml|html|css|js|ts|tsx|go|rb|py|sh|csv)$/i.test(name) || !name.includes('.');
}

// ---- Device flow -----------------------------------------------------------

export interface DeviceCode {
  device_code: string;
  user_code: string;
  verification_uri: string;
  interval: number;
  expires_in: number;
}

async function postForm<T>(url: string, body: Record<string, string>, fetcher: typeof fetch): Promise<T> {
  const res = await fetcher(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new GitHubError(res.statusText, res.status);
  return (await res.json()) as T;
}

export function startDeviceFlow(fetcher: typeof fetch = fetch): Promise<DeviceCode> {
  return postForm<DeviceCode>(
    'https://github.com/login/device/code',
    { client_id: GITHUB_CLIENT_ID, scope: 'repo' },
    fetcher,
  );
}

export type PollResult = { token: string } | { pending: true; slowDown?: boolean };

export const SLOW_DOWN_PENALTY_MS = 5000;

export async function pollDeviceFlow(deviceCode: string, fetcher: typeof fetch = fetch): Promise<PollResult> {
  const r = await postForm<{ access_token?: string; error?: string; error_description?: string }>(
    'https://github.com/login/oauth/access_token',
    {
      client_id: GITHUB_CLIENT_ID,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    },
    fetcher,
  );
  if (r.access_token) return { token: r.access_token };
  if (r.error === 'authorization_pending') return { pending: true };
  if (r.error === 'slow_down') return { pending: true, slowDown: true };
  throw new GitHubError(r.error_description || r.error || 'Sign in failed', 400);
}
