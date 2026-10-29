import { encodeBase64, decodeBase64 } from '../src/lib/base64';
import { branchName, sortEntries, isMarkdown } from '../src/lib/github';

describe('base64 UTF-8 encoding', () => {
  it('encodes and decodes normal ascii and unicode strings with emoji', () => {
    const text = 'Hello, world! 🚀 — #writing';
    const encoded = encodeBase64(text);
    const decoded = decodeBase64(encoded);
    expect(decoded).toBe(text);
  });
});

describe('github helper functions', () => {
  it('generates clean branch names', () => {
    const now = new Date('2026-10-29T12:00:00Z');
    expect(branchName('posts/hello world.md', now)).toBe('playgrouditor/hello-world-202610291200');
  });

  it('identifies markdown files', () => {
    expect(isMarkdown('test.md')).toBe(true);
    expect(isMarkdown('test.MD')).toBe(true);
    expect(isMarkdown('test.txt')).toBe(false);
  });

  it('sorts entries with directories first', () => {
    const entries = [
      { name: 'b.md', path: 'b.md', type: 'file' as const, sha: '1' },
      { name: '.hidden', path: '.hidden', type: 'file' as const, sha: '2' },
      { name: 'a-dir', path: 'a-dir', type: 'dir' as const, sha: '3' },
      { name: 'a.md', path: 'a.md', type: 'file' as const, sha: '4' },
    ];
    const sorted = sortEntries(entries);
    expect(sorted.map(e => e.name)).toEqual(['a-dir', 'a.md', 'b.md']);
  });
});
