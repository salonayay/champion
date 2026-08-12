"use client";

// Monaco is the editor engine from VS Code. It's a large piece of software that
// manipulates the DOM directly, so it can only run in the browser — hence
// "use client".

import Editor, { type OnMount, type BeforeMount } from "@monaco-editor/react";
import { LANGUAGES, type LanguageKey } from "@/lib/languages";

type Props = {
  value: string;
  language: LanguageKey;
  readOnly?: boolean;
  onChange?: (value: string) => void;
};

export default function CodeEditor({
  value,
  language,
  readOnly = false,
  onChange,
}: Props) {
  // Runs once before the editor appears. Monaco ships with light and dark
  // themes, neither of which matches our indigo, so we register our own.
  const handleBeforeMount: BeforeMount = (monaco) => {
    monaco.editor.defineTheme("champion", {
      base: "vs-dark",
      inherit: true, // keep vs-dark's rules, override only what we list
      rules: [
        { token: "comment", foreground: "6f679b", fontStyle: "italic" },
        { token: "keyword", foreground: "ffb020" },
        { token: "string", foreground: "9ad8a0" },
        { token: "number", foreground: "d3b0ff" },
      ],
      colors: {
        "editor.background": "#1e1840",
        "editor.foreground": "#edeaf7",
        "editorLineNumber.foreground": "#4a4275",
        "editorLineNumber.activeForeground": "#9a93bc",
        "editor.selectionBackground": "#2c2456",
        "editor.lineHighlightBackground": "#251e4a",
        "editorCursor.foreground": "#ffb020",
      },
    });
  };

  const handleMount: OnMount = (editor) => {
    // Read-only panels shouldn't look focusable or show a cursor — they're
    // mirrors of someone else's screen, not something you can type into.
    if (readOnly) {
      editor.updateOptions({ renderLineHighlight: "none" });
    }
  };

  return (
    <Editor
      height="100%"
      theme="champion"
      language={LANGUAGES[language].monacoId}
      value={value}
      beforeMount={handleBeforeMount}
      onMount={handleMount}
      onChange={(v) => onChange?.(v ?? "")}
      loading={
        <span className="font-mono text-xs text-chalk-dim">
          loading editor...
        </span>
      }
      options={{
        readOnly,
        domReadOnly: readOnly,
        minimap: { enabled: false }, // no room for it in a quarter-screen panel
        fontSize: 13,
        fontFamily: "var(--font-mono), monospace",
        lineNumbersMinChars: 3,
        scrollBeyondLastLine: false,
        padding: { top: 12, bottom: 12 },
        automaticLayout: true, // re-measure when the panel resizes
        tabSize: 4,
        wordWrap: "on",
      }}
    />
  );
}
