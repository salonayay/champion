// A static preview of what a live room looks like. In Step 3 this becomes four
// real Monaco editors; for now it's here so the landing page shows the idea
// rather than describing it.

type Seat = {
  name: string;
  lines: string[];
  status: "typing" | "running" | "solved";
};

const SEATS: Seat[] = [
  {
    name: "you",
    status: "typing",
    lines: ["def solve(nums):", "    seen = {}", "    for i, n in enum"],
  },
  {
    name: "aarav",
    status: "running",
    lines: ["vector<int> solve(", "  sort(a.begin(), a", "  int lo = 0, hi ="],
  },
  {
    name: "meera",
    status: "solved",
    lines: ["def solve(nums):", "    nums.sort()", "    return nums[k-1]"],
  },
  {
    name: "dev",
    status: "typing",
    lines: ["function solve(nums", "  const map = new M", "  for (let i = 0; i"],
  },
];

const STATUS_LABEL: Record<Seat["status"], string> = {
  typing: "typing",
  running: "running tests",
  solved: "solved",
};

export default function WorkspaceGrid() {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      aria-label="Preview of a four-person room"
    >
      {SEATS.map((seat) => (
        <div
          key={seat.name}
          className="rounded-lg border border-ink-line bg-ink-raised p-3"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-xs text-chalk">{seat.name}</span>
            <span
              className={`font-mono text-[11px] ${
                seat.status === "solved" ? "text-verdict" : "text-chalk-dim"
              }`}
            >
              {STATUS_LABEL[seat.status]}
            </span>
          </div>
          <pre className="overflow-hidden font-mono text-[11px] leading-relaxed text-chalk-dim">
            {seat.lines.join("\n")}
          </pre>
        </div>
      ))}
    </div>
  );
}
