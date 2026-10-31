export type EditorColors = Record<string, string>;

export type EditorInbound =
  | { type: 'init'; doc: string; path: string; preview: boolean; colors: EditorColors }
  | { type: 'colors'; colors: EditorColors }
  | { type: 'preview'; on: boolean };

export type EditorOutbound =
  | { type: 'ready' }
  | { type: 'change'; doc: string }
  | { type: 'error'; message: string };
