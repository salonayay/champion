// Our database stores language as an enum (PYTHON, CPP, ...). This file maps
// those to Monaco's editor ids and holds the starter template for each.
//
// Every starter reads from standard input and prints to standard output,
// because that's how the judge works: it pipes the test case in, and compares
// what comes out.

export const LANGUAGES = {
  PYTHON: {
    label: "Python",
    monacoId: "python",
    starter: `import sys

def main():
    data = sys.stdin.buffer.read().split()
    pos = 0
    t = int(data[pos]); pos += 1
    for _ in range(t):
        # read this test case and solve it
        pass

main()
`,
  },
  CPP: {
    label: "C++",
    monacoId: "cpp",
    starter: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    while (t--) {
        // read this test case and solve it
    }

    return 0;
}
`,
  },
  JAVA: {
    label: "Java",
    monacoId: "java",
    starter: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int t = Integer.parseInt(br.readLine().trim());
        while (t-- > 0) {
            // read this test case and solve it
        }
    }
}
`,
  },
  JAVASCRIPT: {
    label: "JavaScript",
    monacoId: "javascript",
    starter: `const data = require("fs").readFileSync(0, "utf8").split(/\\s+/);
let pos = 0;
const t = Number(data[pos++]);
for (let i = 0; i < t; i++) {
  // read this test case and solve it
}
`,
  },
} as const;

export type LanguageKey = keyof typeof LANGUAGES;

export const LANGUAGE_KEYS = Object.keys(LANGUAGES) as LanguageKey[];
