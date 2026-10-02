import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  KnowledgeEntrySchema,
  type KnowledgeEntry,
} from "../lib/domain/knowledge";
import { syncKnowledge } from "../lib/server/ingestion";

function printCoverageReport(
  resumeEntries: KnowledgeEntry[],
  qaEntries: KnowledgeEntry[],
) {
  console.log("\n" + "=".repeat(60));
  console.log("COVERAGE GAP REPORT");
  console.log("=".repeat(60));
  console.log(
    `Indexed ${resumeEntries.length} resume chunks + ${qaEntries.length} Q&A entries = ${resumeEntries.length + qaEntries.length} vectors total.\n`,
  );

  // Coverage by section
  const sectionMap = new Map<string, { resume: number; qa: number }>();
  for (const e of resumeEntries) {
    const cur = sectionMap.get(e.section) || { resume: 0, qa: 0 };
    cur.resume++;
    sectionMap.set(e.section, cur);
  }
  for (const e of qaEntries) {
    const cur = sectionMap.get(e.section) || { resume: 0, qa: 0 };
    cur.qa++;
    sectionMap.set(e.section, cur);
  }

  const sectionTargets: Record<string, number> = {
    stories: 5,
    leadership: 3,
    education: 3,
    skills: 3,
  };

  console.log("Coverage by section:");
  for (const [section, counts] of sectionMap) {
    const total = counts.resume + counts.qa;
    const target = sectionTargets[section];
    const warning =
      target && counts.qa < target
        ? `  ⚠️  Recommend ${target}+ Q&A entries`
        : "";
    console.log(
      `  ${section}: ${total} entries (${counts.resume} resume + ${counts.qa} qa)${warning}`,
    );
  }

  // Check for sections with zero entries
  for (const [section, target] of Object.entries(sectionTargets)) {
    if (!sectionMap.has(section)) {
      console.log(
        `  ${section}: 0 entries  ⚠️  Recommend ${target}+ Q&A entries`,
      );
    }
  }

  // Coverage by focus
  const focusMap = new Map<string, number>();
  for (const e of [...resumeEntries, ...qaEntries]) {
    for (const tag of e.focus_tags ?? []) {
      focusMap.set(tag, (focusMap.get(tag) || 0) + 1);
    }
  }

  console.log("\nCoverage by focus:");
  for (const [tag, count] of focusMap) {
    console.log(`  ${tag}: ${count} entries`);
  }

  // Core strengths
  const coreCount = [...resumeEntries, ...qaEntries].filter(
    (e) => e.is_core_strength,
  ).length;
  console.log(`\nCore strengths: ${coreCount} entries marked is_core_strength`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("Usage: npm run ingest -- [--dry-run]");
    return;
  }
  if (args.some((arg) => arg !== "--dry-run")) {
    throw new Error(
      `Unknown argument: ${args.find((arg) => arg !== "--dry-run")}`,
    );
  }
  const dryRun = args.includes("--dry-run");
  const resumePath = join(__dirname, "../data/resume.json");
  const qaPath = join(__dirname, "../data/knowledge_entries.json");
  const resumeEntries = KnowledgeEntrySchema.array().parse(
    JSON.parse(readFileSync(resumePath, "utf-8")),
  );
  const qaEntries = existsSync(qaPath)
    ? KnowledgeEntrySchema.array().parse(
        JSON.parse(readFileSync(qaPath, "utf-8")),
      )
    : [];
  const report = await syncKnowledge([...resumeEntries, ...qaEntries], {
    dryRun,
  });
  console.log(
    `${dryRun ? "Dry run" : "Ingestion complete"}: ${JSON.stringify(report)}`,
  );
  printCoverageReport(resumeEntries, qaEntries);
}

main().catch((error) => {
  console.error("Ingestion failed:", error);
  process.exitCode = 1;
});
