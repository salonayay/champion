import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PROBLEMS = [
  {
    slug: "pair-sum",
    title: "Pair Sum",
    difficulty: "EASY",
    tags: ["arrays", "hashing"],
    statement: `You are given n integers and a target value t.

Exactly one pair of positions adds up to t. Print those two positions,
smaller first, using 1-based numbering.

Input
  Line 1: two integers n and t
  Line 2: n integers

Output
  Two integers separated by a space.

Constraints
  2 <= n <= 100000`,
    tests: [
      { input: "4 9\n2 7 11 15", expected: "1 2", isSample: true },
      { input: "3 6\n3 2 4", expected: "2 3", isSample: true },
      { input: "2 6\n3 3", expected: "1 2", isSample: false },
      { input: "5 10\n1 2 3 4 6", expected: "4 5", isSample: false },
      { input: "5 -5\n-1 -2 -8 -4 0", expected: "1 4", isSample: false },
    ],
  },
  {
    slug: "balanced-brackets",
    title: "Balanced Brackets",
    difficulty: "EASY",
    tags: ["stack", "strings"],
    statement: `A bracket string is balanced when every opening bracket is closed
by the matching kind, and pairs never cross each other.

Given one line containing only the characters ( ) [ ] { }, print YES if the
string is balanced and NO if it is not.

Input
  A single line of brackets.

Output
  YES or NO.

Constraints
  1 <= length <= 100000`,
    tests: [
      { input: "()[]{}", expected: "YES", isSample: true },
      { input: "(]", expected: "NO", isSample: true },
      { input: "([{}])", expected: "YES", isSample: false },
      { input: "((", expected: "NO", isSample: false },
      { input: "{[()]}([])", expected: "YES", isSample: false },
    ],
  },
  {
    slug: "missing-number",
    title: "The Missing Number",
    difficulty: "EASY",
    tags: ["math", "arrays"],
    statement: `Someone wrote down the numbers 1 through n, then lost exactly one
of them. You are given the n-1 that remain, in no particular order.

Print the missing number.

Input
  Line 1: the integer n
  Line 2: n-1 distinct integers between 1 and n

Output
  A single integer.

Constraints
  2 <= n <= 1000000`,
    tests: [
      { input: "5\n1 2 4 5", expected: "3", isSample: true },
      { input: "3\n1 3", expected: "2", isSample: true },
      { input: "2\n2", expected: "1", isSample: false },
      { input: "6\n1 2 3 4 5", expected: "6", isSample: false },
      { input: "7\n7 6 5 3 2 1", expected: "4", isSample: false },
    ],
  },
  {
    slug: "longest-run",
    title: "Longest Run",
    difficulty: "MEDIUM",
    tags: ["strings", "two-pointers"],
    statement: `A run is a stretch of identical characters sitting next to each
other. In "aaabbc" the runs are "aaa", "bb" and "c".

Given a lowercase string, print the length of its longest run.

Input
  A single line containing lowercase letters.

Output
  A single integer.

Constraints
  1 <= length <= 200000`,
    tests: [
      { input: "aaabbc", expected: "3", isSample: true },
      { input: "abcd", expected: "1", isSample: true },
      { input: "zzzzzz", expected: "6", isSample: false },
      { input: "aabbbbcc", expected: "4", isSample: false },
      { input: "x", expected: "1", isSample: false },
    ],
  },
  {
    slug: "kth-smallest",
    title: "K-th Smallest",
    difficulty: "MEDIUM",
    tags: ["sorting", "selection"],
    statement: `Given n integers and a number k, print the k-th smallest value.

Duplicates count as separate entries: in the list 5 5 5, the 2nd smallest
is still 5.

Input
  Line 1: two integers n and k
  Line 2: n integers

Output
  A single integer.

Constraints
  1 <= k <= n <= 200000`,
    tests: [
      { input: "5 2\n7 10 4 3 20", expected: "4", isSample: true },
      { input: "4 4\n1 2 3 4", expected: "4", isSample: true },
      { input: "3 1\n5 5 5", expected: "5", isSample: false },
      { input: "6 3\n-1 -2 0 3 2 1", expected: "0", isSample: false },
      { input: "5 5\n9 1 8 2 7", expected: "9", isSample: false },
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

    console.log(`  seeded ${p.slug} (${p.tests.length} tests)`);
  }

  const count = await prisma.problem.count();
  console.log(`\nDone. ${count} problems in the bank.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
