import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MULTI = `Input
  Line 1: an integer t, the number of test cases.
  Then t test cases follow.

Output
  One line per test case, in order.`;

const PROBLEMS = [
  {
    slug: "pair-sum",
    title: "Pair Sum",
    difficulty: "EASY",
    tags: ["arrays", "hashing"],
    statement: `Each test case gives you n integers and a target value x.

Exactly one pair of positions adds up to x. Print those two positions,
smaller first, using 1-based numbering.

${MULTI}

Each test case
  Line 1: two integers n and x
  Line 2: n integers

Constraints
  1 <= t <= 100
  2 <= n <= 100000`,
    tests: [
      { input: "2\n4 9\n2 7 11 15\n3 6\n3 2 4", expected: "1 2\n2 3", isSample: true },
      { input: "2\n2 6\n3 3\n5 10\n1 2 3 4 6", expected: "1 2\n4 5", isSample: true },
      { input: "2\n5 -5\n-1 -2 -8 -4 0\n4 100\n50 50 1 2", expected: "1 4\n1 2", isSample: false },
      { input: "3\n2 3\n1 2\n6 11\n1 2 3 4 5 6\n3 0\n-5 5 7", expected: "1 2\n5 6\n1 2", isSample: false },
      { input: "2\n7 13\n1 3 5 7 9 11 2\n4 -7\n-3 -4 1 2", expected: "6 7\n1 2", isSample: false },
    ],
  },
  {
    slug: "balanced-brackets",
    title: "Balanced Brackets",
    difficulty: "EASY",
    tags: ["stack", "strings"],
    statement: `A bracket string is balanced when every opening bracket is closed
by the matching kind, and pairs never cross each other.

For each test case print YES if the string is balanced, NO if it is not.

${MULTI}

Each test case
  One line containing only the characters ( ) [ ] { }

Constraints
  1 <= t <= 100
  1 <= length <= 100000`,
    tests: [
      { input: "2\n()[]{}\n(]", expected: "YES\nNO", isSample: true },
      { input: "2\n([{}])\n((", expected: "YES\nNO", isSample: true },
      { input: "3\n{[()]}([])\n]\n{}", expected: "YES\nNO\nYES", isSample: false },
      { input: "2\n((()))\n([)]", expected: "YES\nNO", isSample: false },
      { input: "3\n{{{{\n}}\n[]{}()", expected: "NO\nNO\nYES", isSample: false },
    ],
  },
  {
    slug: "missing-number",
    title: "The Missing Number",
    difficulty: "EASY",
    tags: ["math", "arrays"],
    statement: `Someone wrote down the numbers 1 through n, then lost exactly one
of them. You are given the n-1 that remain, in no particular order.

For each test case print the missing number.

${MULTI}

Each test case
  Line 1: the integer n
  Line 2: n-1 distinct integers between 1 and n

Constraints
  1 <= t <= 100
  2 <= n <= 1000000`,
    tests: [
      { input: "2\n5\n1 2 4 5\n3\n1 3", expected: "3\n2", isSample: true },
      { input: "2\n2\n2\n6\n1 2 3 4 5", expected: "1\n6", isSample: true },
      { input: "2\n7\n7 6 5 3 2 1\n4\n2 3 4", expected: "4\n1", isSample: false },
      { input: "3\n2\n1\n3\n2 3\n5\n5 4 3 2", expected: "2\n1\n1", isSample: false },
      { input: "2\n10\n1 2 3 4 5 6 7 9 10\n8\n8 7 6 5 4 3 1", expected: "8\n2", isSample: false },
    ],
  },
  {
    slug: "longest-run",
    title: "Longest Run",
    difficulty: "MEDIUM",
    tags: ["strings", "two-pointers"],
    statement: `A run is a stretch of identical characters sitting next to each
other. In "aaabbc" the runs are "aaa", "bb" and "c".

For each test case print the length of the longest run.

${MULTI}

Each test case
  One line of lowercase letters

Constraints
  1 <= t <= 100
  1 <= length <= 200000`,
    tests: [
      { input: "2\naaabbc\nabcd", expected: "3\n1", isSample: true },
      { input: "2\nzzzzzz\nx", expected: "6\n1", isSample: true },
      { input: "3\naabbbbcc\nab\naa", expected: "4\n1\n2", isSample: false },
      { input: "2\nabbcccddddeeeee\nqqqqqqp", expected: "5\n6", isSample: false },
      { input: "2\nmnop\nwwwwwwwwww", expected: "1\n10", isSample: false },
    ],
  },
  {
    slug: "kth-smallest",
    title: "K-th Smallest",
    difficulty: "MEDIUM",
    tags: ["sorting", "selection"],
    statement: `For each test case print the k-th smallest value among n integers.

Duplicates count as separate entries: in the list 5 5 5, the 2nd smallest
is still 5.

${MULTI}

Each test case
  Line 1: two integers n and k
  Line 2: n integers

Constraints
  1 <= t <= 100
  1 <= k <= n <= 200000`,
    tests: [
      { input: "2\n5 2\n7 10 4 3 20\n4 4\n1 2 3 4", expected: "4\n4", isSample: true },
      { input: "2\n3 1\n5 5 5\n6 3\n-1 -2 0 3 2 1", expected: "5\n0", isSample: true },
      { input: "2\n5 5\n9 1 8 2 7\n1 1\n42", expected: "9\n42", isSample: false },
      { input: "3\n4 2\n4 3 2 1\n5 3\n10 20 30 40 50\n2 1\n-7 -8", expected: "2\n30\n-8", isSample: false },
      { input: "2\n7 4\n1 1 1 2 2 3 3\n6 6\n6 5 4 3 2 1", expected: "2\n6", isSample: false },
    ],
  },
];

async function main() {
  for (const p of PROBLEMS) {
    const existing = await prisma.problem.findUnique({ where: { slug: p.slug } });
    if (existing) {
      await prisma.testCase.deleteMany({ where: { problemId: existing.id } });
    }

    await prisma.problem.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        statement: p.statement,
        difficulty: p.difficulty,
        tags: p.tags,
        testCases: { create: p.tests },
      },
      create: {
        slug: p.slug,
        title: p.title,
        statement: p.statement,
        difficulty: p.difficulty,
        tags: p.tags,
        testCases: { create: p.tests },
      },
    });

    console.log(`  seeded ${p.slug} (${p.tests.length} bundles)`);
  }

  console.log(`\nDone. ${await prisma.problem.count()} problems in the bank.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
