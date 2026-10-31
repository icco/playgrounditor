# Selectable themes, dark mode, and syntax highlighting

## Intent

Make playgrounditor nicer to look at and to edit code in. Users pick a named
theme they like; each theme has a light and dark variant; dark mode follows the
phone by default. Code files get live syntax highlighting while editing, colored
by the same theme. Delivered as two PRs.

## Goals
- Five selectable themes, each with light + dark variants:
  Playgrounditor (default, current cream/forest look + new dark companion),
  Dracula, Solarized, Nord, GitHub.
  Dracula and Nord are dark-only upstream; we design light companions in their spirit.
- Appearance mode: System (default) / Light / Dark, set in Settings.
- One theme choice drives everything: app chrome, navigation header, Markdown
  preview, and (PR 2) code highlighting.
- PR 2: live highlighting while typing, for a broad set of languages detected by extension.
- Works offline.

## Non-goals
- Separate code-theme picker. User-defined/custom themes. iOS.
- Code-editor extras beyond highlighting (autocomplete, linting, folding) unless free.

## Anti-goals
- Regressing the Android keyboard fixes from #6 (text and save dialog must stay above keyboard).
- Losing unsaved-edit protection (`usePreventRemove`, dirty tracking).
- Any network fetch for editor assets.

## Constraints
- React Native 0.88, Android only, pnpm, TypeScript, Jest, ESLint.
- Colors are currently hard-coded per screen in `StyleSheet.create` (App.tsx + 5 screens).

## Approaches considered

**Highlighting (PR 2):**
1. CodeMirror 6 in a WebView, bundled into the APK — **chosen**. Real editor,
   reliable highlighting, offline. Cost: new deps (`react-native-webview`, build step), ~300–500 KB.
2. Transparent `TextInput` over a colored text layer — lighter but fragile
   (scroll/cursor drift, Android keyboard). Rejected.
3. Highlight only in a read-only view — simplest, but not what was wanted.

Delivery: bundled in APK (chosen) vs CDN (rejected: offline + supply chain).

**Theme relationship:** one theme drives app + code (chosen) vs independent pickers.

## Design decisions

### PR 1 — themes + dark mode
- `src/theme/` with a `Theme` type of semantic tokens (e.g. `background`,
  `surface`, `border`, `text`, `textMuted`, `primary`, `onPrimary`, `placeholder`,
  `danger`, plus markdown-preview tokens). PR 2 extends it with syntax tokens.
- Each named theme defines `light` and `dark` palettes.
- `ThemeProvider` + `useTheme()`; resolves mode via `useColorScheme()` when
  set to System. Choice (theme name + mode) persisted in AsyncStorage.
- Screens build styles from the theme (e.g. `makeStyles(theme)` memoized); no
  hard-coded colors left in `src/` or `App.tsx`.
- React Navigation gets a matching nav theme; status bar style follows dark/light.
- Markdown preview gets themed styles.
- Settings: a theme list (name + small color swatch preview) and a
  System/Light/Dark segmented control. Changes apply instantly.

### PR 2 — syntax highlighting
- `react-native-webview` hosting a single bundled HTML file with CodeMirror 6,
  built by a script (e.g. esbuild) into an Android asset; build output committed or
  generated in the Gradle/CI build — builder's call, must work in the existing release CI.
- Message bridge: RN → WebView (initial text, language, theme colors);
  WebView → RN (text changes). EditorScreen keeps owning `text`, so dirty
  tracking, word count, and save are unchanged.
- CodeMirror highlight style generated from the active theme's syntax tokens;
  updates live when theme changes.
- Languages by extension: JS/TS/JSX/TSX, JSON, Markdown, Python, Go, Ruby,
  Rust, Java/Kotlin, C/C++, CSS/HTML, YAML, TOML, shell, SQL. Unknown → plain text.
- Markdown files also use CodeMirror (markdown mode), accepting weaker Android
  autocorrect in a WebView (user's decision). Enable the WebView's native
  spellcheck/autocorrect where possible. Preview toggle unchanged.
- Keyboard: the WebView must keep the cursor visible above the keyboard and keep
  working with the existing `KeyboardAvoidingView` (see #6).

### Delivery
- PR 1 on its own branch off `main`. PR 2 is stacked on PR 1's branch and
  retargets `main` after PR 1 merges. Conventional-commit titles (semantic-release).

## Left to the builder
- Exact palette hex values (match upstream themes; design light Dracula/Nord tastefully).
- Token names, file layout, Settings visual details.
- Tests: theme resolution and persistence, extension → language mapping,
  every theme defines every token.
