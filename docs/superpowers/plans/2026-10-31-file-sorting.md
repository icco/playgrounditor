# File Sorting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add sorting options for files and directories in `FileBrowserScreen` with "Modified" and "Name" as the two options.

**Architecture:** Extend `Entry` interface with an optional `modified?: string` property. Add `getModifiedDate` to `GitHub` client to fetch the latest commit date for a file or directory path. Update `sortEntries` to support sorting by `'name'` (default: directories first, then alphabetical) and `'modified'` (newest commit date first, with fallback to name). Add UI toggle buttons in `FileBrowserScreen` and display formatted modification dates when sorted by modified.

**Tech Stack:** React Native, TypeScript, Jest

**Spec:** User request: "Add sorting options for files with modified and name as the two options"

## Global Constraints

- TypeScript strict types, React Native components following existing styling (`#FAF8F5` background, `#3A5A40` primary color).
- Keep existing tests passing.

## Review Focus

1. Network error during `getModifiedDate` should fail gracefully without crashing the file browser.
2. Entries without commit history or missing dates should fall back gracefully when sorting by modified.
3. Switching between Name and Modified sorting should update the list correctly and re-fetch missing modified dates on demand.

---

### Task 1: GitHub API and Helper Support for Modified Sorting

**Files:**
- Modify: `src/lib/github.ts`
- Test: `__tests__/github.test.ts`

**Interfaces:**
- Consumes: `Entry`
- Produces: `Entry` with `modified?: string`, `sortEntries(entries: Entry[], sortBy: 'name' | 'modified')`, `formatDate(isoString?: string)`, `GitHub.prototype.getModifiedDate(fullName: string, path: string, ref: string): Promise<string | undefined>`

- [ ] **Step 1: Write failing tests for sorting by modified and formatting date**

Add unit tests in `__tests__/github.test.ts`:
- Test `sortEntries` with `sortBy: 'modified'` sorts entries by date descending (newest first).
- Test `formatDate` returns expected formatted string.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL

- [ ] **Step 3: Implement `modified` support in `src/lib/github.ts`**

- Update `Entry` interface to include `modified?: string`.
- Implement `getModifiedDate(fullName, path, ref)` on `GitHub`.
- Update `sortEntries(entries, sortBy)` to handle `'modified'` (sorting by date descending, falling back to name/type).
- Implement `formatDate(isoString)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/github.ts __tests__/github.test.ts
git commit -m "feat(github): add modification date fetching and sorting options"
```

---

### Task 2: File Browser UI Sorting Controls and Date Display

**Files:**
- Modify: `src/screens/FileBrowserScreen.tsx`

**Interfaces:**
- Consumes: `sortEntries`, `GitHub.prototype.getModifiedDate`, `Entry`
- Produces: Interactive sorting buttons ("Name", "Modified") in `FileBrowserScreen` and modification date rendering.

- [ ] **Step 1: Add sorting state and controls in `FileBrowserScreen.tsx`**

- Add `sortBy` state (`'name' | 'modified'`, default `'name'`).
- Add a sort selection header/row in `FileBrowserScreen` above the file list.
- When `sortBy` is `'modified'`, fetch missing `modified` dates for entries using `github.getModifiedDate`.
- Display formatted date next to file/dir items when available or when sorted by modified.

- [ ] **Step 2: Run tests and typecheck**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/screens/FileBrowserScreen.tsx
git commit -m "feat(editor): add file sorting UI and modified date display"
```
