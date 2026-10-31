# Themes and Syntax Highlighting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver two PRs: PR 1 adds selectable themes (Playgrounditor, Dracula, Solarized, Nord, GitHub), dark mode following system or set in Settings, and themed UI/Markdown preview. PR 2 adds CodeMirror 6 live syntax highlighting in a bundled WebView for all editable files (including Markdown).

**Architecture:** 
- PR 1 introduces `src/theme/` with theme definitions, tokens, ThemeContext, storage, and a Theme Picker in Settings. All screens and React Navigation use dynamic theme tokens.
- PR 2 introduces a bundled CodeMirror 6 HTML asset communicating via `postMessage` with a CodeMirrorEditor component used in `EditorScreen`.

**Tech Stack:** React Native 0.88, TypeScript, AsyncStorage, CodeMirror 6, react-native-webview.

---

## PR 1: Themes and Dark Mode

### Task 1: Theme Engine and Tokens
**Files:**
- Create: `src/theme/types.ts`
- Create: `src/theme/themes.ts`
- Create: `src/theme/ThemeContext.tsx`
- Test: `__tests__/theme.test.ts`

- [ ] **Step 1: Write failing test for theme definitions and tokens**
- [ ] **Step 2: Implement theme types, palettes (Playgrounditor, Dracula, Solarized, Nord, GitHub, light + dark), and ThemeContext**
- [ ] **Step 3: Run tests and verify pass**
- [ ] **Step 4: Commit**

### Task 2: Themed Components & Screens (App.tsx, Settings, Login, RepoList, FileBrowser, Editor)
**Files:**
- Modify: `App.tsx`
- Modify: `src/screens/LoginScreen.tsx`
- Modify: `src/screens/RepoListScreen.tsx`
- Modify: `src/screens/FileBrowserScreen.tsx`
- Modify: `src/screens/EditorScreen.tsx`
- Modify: `src/screens/SettingsScreen.tsx`

- [ ] **Step 1: Update screens and App.tsx to consume `useTheme()`**
- [ ] **Step 2: Add theme picker and appearance mode selector to `SettingsScreen`**
- [ ] **Step 3: Run typecheck and tests (`pnpm typecheck && pnpm test`)**
- [ ] **Step 4: Commit**

---

## PR 2: Syntax Highlighting (CodeMirror WebView)

### Task 3: CodeMirror Asset & WebView Editor Component
**Files:**
- Create: `src/components/CodeMirrorEditor.tsx`
- Create: `assets/editor.html` (or inline / build script)
- Modify: `src/screens/EditorScreen.tsx`
- Modify: `package.json` (add `react-native-webview`)

- [ ] **Step 1: Install `react-native-webview`**
- [ ] **Step 2: Create CodeMirror HTML bundle with language auto-detection and theme integration**
- [ ] **Step 3: Integrate `CodeMirrorEditor` into `EditorScreen` for both code and markdown**
- [ ] **Step 4: Run typecheck and tests, commit**
