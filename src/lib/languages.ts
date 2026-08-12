// Our database stores language as an enum (PYTHON, CPP, ...). Monaco uses its
// own lowercase ids ("python", "cpp"). This file is the bridge between them,
// plus the starter code each language gets.

export const LANGUAGES = {
  PYTHON: {
    label: "Python",
    monacoId: "python",
    starter: `def solve(nums):
    # your code here
    pass
`,
  },
  CPP: {
    label: "C++",
    monacoId: "cpp",
    starter: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // your code here
    return 0;
}
`,
  },
  JAVA: {
    label: "Java",
    monacoId: "java",
    starter: `public class Main {
    public static void main(String[] args) {
        // your code here
    }
}
`,
  },
  JAVASCRIPT: {
    label: "JavaScript",
    monacoId: "javascript",
    starter: `function solve(nums) {
  // your code here
}
`,
  },
} as const;

// `keyof typeof LANGUAGES` means "any key of that object" — so LanguageKey is
// "PYTHON" | "CPP" | "JAVA" | "JAVASCRIPT". Add a language above and this type
// updates itself, with no second list to keep in sync.
export type LanguageKey = keyof typeof LANGUAGES;

export const LANGUAGE_KEYS = Object.keys(LANGUAGES) as LanguageKey[];
