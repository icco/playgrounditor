import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  path: string;
}

export function CodeMirrorEditor({ value, onChangeText, path }: Props) {
  const { theme } = useTheme();
  const webViewRef = useRef<WebView>(null);

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script type="importmap">
    {
      "imports": {
        "codemirror": "https://esm.sh/codemirror@6.0.2?bundle",
        "@codemirror/state": "https://esm.sh/@codemirror/state@6.5.0?bundle",
        "@codemirror/view": "https://esm.sh/@codemirror/view@6.35.0?bundle",
        "@codemirror/language": "https://esm.sh/@codemirror/language@6.10.6?bundle",
        "@codemirror/lang-markdown": "https://esm.sh/@codemirror/lang-markdown@6.3.1?bundle",
        "@codemirror/lang-javascript": "https://esm.sh/@codemirror/lang-javascript@6.2.2?bundle",
        "@codemirror/lang-python": "https://esm.sh/@codemirror/lang-python@6.1.6?bundle",
        "@codemirror/lang-html": "https://esm.sh/@codemirror/lang-html@6.4.9?bundle",
        "@codemirror/lang-css": "https://esm.sh/@codemirror/lang-css@6.3.1?bundle",
        "@codemirror/lang-json": "https://esm.sh/@codemirror/lang-json@6.0.1?bundle",
        "@codemirror/lang-go": "https://esm.sh/@codemirror/lang-go@6.0.1?bundle",
        "@codemirror/lang-rust": "https://esm.sh/@codemirror/lang-rust@6.0.1?bundle",
        "@codemirror/lang-yaml": "https://esm.sh/@codemirror/lang-yaml@6.1.0?bundle",
        "@lezer/highlight": "https://esm.sh/@lezer/highlight@1.2.1?bundle"
      }
    }
  </script>
  <style>
    html, body, #editor {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: ${theme.colors.background};
      color: ${theme.colors.text};
    }
    .cm-editor {
      height: 100%;
      font-family: monospace;
      font-size: 15px;
      background-color: ${theme.colors.background} !important;
      color: ${theme.colors.text} !important;
    }
    .cm-scroller {
      overflow: auto;
      padding: 16px;
    }
    .cm-content {
      caret-color: ${theme.colors.primary};
    }
    .cm-gutters {
      background-color: ${theme.colors.surface} !important;
      color: ${theme.colors.textMuted} !important;
      border-right: 1px solid ${theme.colors.border} !important;
    }
    .cm-activeLine {
      background-color: ${theme.colors.inputBg} !important;
    }
    .tok-keyword { color: ${theme.colors.syntaxKeyword}; }
    .tok-string { color: ${theme.colors.syntaxString}; }
    .tok-number { color: ${theme.colors.syntaxNumber}; }
    .tok-comment { color: ${theme.colors.syntaxComment}; font-style: italic; }
    .tok-variableName { color: ${theme.colors.syntaxVariable}; }
    .tok-function { color: ${theme.colors.syntaxFunction}; }
  </style>
</head>
<body>
  <div id="editor"></div>
  <script type="module">
    import { EditorView, basicSetup } from "codemirror";
    import { EditorState } from "@codemirror/state";
    import { markdown } from "@codemirror/lang-markdown";
    import { javascript } from "@codemirror/lang-javascript";
    import { python } from "@codemirror/lang-python";
    import { html } from "@codemirror/lang-html";
    import { css } from "@codemirror/lang-css";
    import { json } from "@codemirror/lang-json";
    import { go } from "@codemirror/lang-go";
    import { rust } from "@codemirror/lang-rust";
    import { yaml } from "@codemirror/lang-yaml";

    const path = ${JSON.stringify(path)};
    let extension = javascript();
    const lower = path.toLowerCase();
    if (lower.endsWith('.py')) extension = python();
    else if (lower.endsWith('.html')) extension = html();
    else if (lower.endsWith('.css')) extension = css();
    else if (lower.endsWith('.json')) extension = json();
    else if (lower.endsWith('.go')) extension = go();
    else if (lower.endsWith('.rs')) extension = rust();
    else if (lower.endsWith('.yml') || lower.endsWith('.yaml')) extension = yaml();
    else if (lower.endsWith('.md') || lower.endsWith('.markdown')) extension = markdown();

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const text = update.state.doc.toString();
        window.ReactNativeWebView.postMessage(text);
      }
    });

    const state = EditorState.create({
      doc: ${JSON.stringify(value)},
      extensions: [basicSetup, extension, updateListener, EditorView.lineWrapping]
    });

    const view = new EditorView({
      state,
      parent: document.getElementById('editor')
    });
  </script>
</body>
</html>`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WebViewComponent = WebView as unknown as React.ComponentType<any>;

  return (
    <View style={styles.container}>
      <WebViewComponent
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={{ backgroundColor: theme.colors.background }}
        onMessage={(event: WebViewMessageEvent) => {
          onChangeText(event.nativeEvent.data);
        }}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
