import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { css } from '@codemirror/lang-css';
import { go } from '@codemirror/lang-go';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { yaml } from '@codemirror/lang-yaml';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState, Extension } from '@codemirror/state';
import { EditorView, highlightActiveLine, keymap, lineNumbers } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import type { EditorColors, EditorInbound, EditorOutbound } from './protocol';

declare global {
  interface Window {
    ReactNativeWebView: { postMessage(data: string): void };
    editorBridge: { receive(message: EditorInbound): void };
  }
}

const CHANGE_DEBOUNCE_MS = 300;

const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.operatorKeyword, tags.modifier], color: 'var(--syntax-keyword)' },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: 'var(--syntax-string)' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: 'var(--syntax-number)' },
  { tag: [tags.comment, tags.meta], color: 'var(--syntax-comment)', fontStyle: 'italic' },
  { tag: [tags.variableName, tags.propertyName, tags.attributeName], color: 'var(--syntax-variable)' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.typeName], color: 'var(--syntax-function)' },
  { tag: tags.heading, color: 'var(--syntax-keyword)', fontWeight: 'bold' },
  { tag: tags.link, color: 'var(--primary)', textDecoration: 'underline' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.monospace, color: 'var(--syntax-string)' },
]);

function isProse(path: string): boolean {
  return /\.(md|markdown|mdx|txt)$/i.test(path);
}

function languageFor(path: string): Extension[] {
  const lower = path.toLowerCase();
  if (/\.(md|markdown|mdx)$/.test(lower)) return [markdown()];
  if (/\.(js|jsx|mjs|cjs)$/.test(lower)) return [javascript({ jsx: true })];
  if (/\.(ts|tsx)$/.test(lower)) return [javascript({ jsx: true, typescript: true })];
  if (lower.endsWith('.py')) return [python()];
  if (/\.html?$/.test(lower)) return [html()];
  if (lower.endsWith('.css')) return [css()];
  if (lower.endsWith('.json')) return [json()];
  if (lower.endsWith('.go')) return [go()];
  if (lower.endsWith('.rs')) return [rust()];
  if (/\.ya?ml$/.test(lower)) return [yaml()];
  return [];
}

function send(message: EditorOutbound) {
  window.ReactNativeWebView.postMessage(JSON.stringify(message));
}

function applyColors(colors: EditorColors) {
  const root = document.documentElement.style;
  for (const [name, value] of Object.entries(colors)) {
    root.setProperty(`--${name}`, value);
  }
}

let view: EditorView | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let pending = false;

function postDoc() {
  if (view) send({ type: 'change', doc: view.state.sliceDoc() });
}

// The first edit is sent at once so the app sees the file as dirty before a quick back press.
function scheduleChange() {
  if (!timer) {
    postDoc();
  } else {
    pending = true;
    clearTimeout(timer);
  }
  timer = setTimeout(() => {
    timer = null;
    if (pending) postDoc();
    pending = false;
  }, CHANGE_DEBOUNCE_MS);
}

function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (pending) postDoc();
  pending = false;
}

function init(doc: string, path: string) {
  const prose = isProse(path);
  const crlf = doc.includes('\r\n') && !/(^|[^\r])\n/.test(doc);
  const state = EditorState.create({
    doc,
    extensions: [
      ...(crlf ? [EditorState.lineSeparator.of('\r\n')] : []),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      syntaxHighlighting(highlight),
      highlightActiveLine(),
      EditorView.lineWrapping,
      ...(prose ? [] : [lineNumbers()]),
      EditorView.contentAttributes.of(
        prose
          ? { spellcheck: 'true', autocorrect: 'on', autocapitalize: 'sentences' }
          : { spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off' },
      ),
      ...languageFor(path),
      EditorView.updateListener.of(update => {
        if (update.docChanged) scheduleChange();
      }),
    ],
  });
  view?.destroy();
  view = new EditorView({ state, parent: document.getElementById('editor')! });
}

function setPreview(on: boolean) {
  const preview = document.getElementById('preview')!;
  const editor = document.getElementById('editor')!;
  if (on && view) {
    flush();
    const rendered = marked.parse(view.state.sliceDoc() || '*Empty file*', { async: false });
    preview.innerHTML = DOMPurify.sanitize(rendered);
  }
  preview.hidden = !on;
  editor.hidden = on;
}

window.editorBridge = {
  receive(message) {
    switch (message.type) {
      case 'init':
        applyColors(message.colors);
        init(message.doc, message.path);
        setPreview(message.preview);
        break;
      case 'colors':
        applyColors(message.colors);
        break;
      case 'preview':
        setPreview(message.on);
        break;
    }
  },
};

document.addEventListener('visibilitychange', () => {
  if (document.hidden) flush();
});
window.addEventListener('error', event => {
  send({ type: 'error', message: event.message });
});

send({ type: 'ready' });
