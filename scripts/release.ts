import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  generateMarkDown,
  getGitDiff,
  loadChangelogConfig,
  parseCommits,
} from "changelogen";
import semver from "semver";

interface PackageJson {
  name: string;
  version: string;
}

const rootDir = process.cwd();
const pkgPath = path.join(rootDir, "packages/shadcn-schedule/package.json");
const changelogPath = path.join(rootDir, "CHANGELOG.md");

const exec = (cmd: string, options: { stdio?: "inherit" | "pipe" } = {}) =>
  execSync(cmd, { cwd: rootDir, encoding: "utf-8", ...options });

const isReleaseType = (value: string): value is semver.ReleaseType =>
  [
    "patch",
    "minor",
    "major",
    "prepatch",
    "preminor",
    "premajor",
    "prerelease",
  ].includes(value);

const isPackageJson = (data: unknown): data is PackageJson => {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const candidate = data as Record<string, unknown>;

  return (
    typeof candidate.name === "string" && typeof candidate.version === "string"
  );
};

const main = async () => {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const bumpArg = args.find((a) => !a.startsWith("--")) ?? "patch";

  // Ensure clean git state unless dry run
  if (!isDryRun) {
    const status = exec("git status --porcelain").trim();

    if (status.length > 0) {
      console.error(
        "❌ Error: Working tree is not clean. Commit or stash changes before releasing."
      );
      process.exit(1);
    }

    const currentBranch = exec("git rev-parse --abbrev-ref HEAD").trim();

    if (currentBranch !== "main") {
      console.error(
        `❌ Error: Releases must be created from 'main' (currently on '${currentBranch}').`
      );
      process.exit(1);
    }
  }

  // Read current package.json
  const rawPkg = fs.readFileSync(pkgPath, "utf-8");
  const parsed: unknown = JSON.parse(rawPkg);

  if (!isPackageJson(parsed)) {
    console.error("❌ Error: Invalid package.json format.");
    process.exit(1);
  }

  const currentVersion = parsed.version;

  let nextVersion: string | null = null;

  if (isReleaseType(bumpArg)) {
    nextVersion = semver.inc(currentVersion, bumpArg);
  } else if (semver.valid(bumpArg) === null) {
    console.error(
      `❌ Error: Invalid bump argument '${bumpArg}'. Expected 'patch', 'minor', 'major', or a valid SemVer.`
    );
    process.exit(1);
  } else {
    nextVersion = bumpArg;
  }

  if (typeof nextVersion !== "string") {
    console.error(
      `❌ Error: Could not determine next version from '${currentVersion}' and '${bumpArg}'.`
    );
    process.exit(1);
  }

  const nextTag = `v${nextVersion}`;
  console.log(
    `\n📦 Preparing release: ${currentVersion} => ${nextVersion} (${nextTag})\n`
  );

  // Generate changelog notes
  const config = await loadChangelogConfig(rootDir);
  config.newVersion = nextVersion;
  const rawCommits = await getGitDiff(config.from, config.to);
  const commits = parseCommits(rawCommits, config);
  const markdown = await generateMarkDown(commits, config);

  console.log("--- Generated Release Notes ---");
  console.log(markdown);
  console.log("-------------------------------\n");

  if (isDryRun) {
    console.log("🔎 Dry run complete. No files modified or pushed.");

    return;
  }

  // Update package.json version
  const updatedPkg = { ...parsed, version: nextVersion };
  fs.writeFileSync(pkgPath, `${JSON.stringify(updatedPkg, null, 2)}\n`);
  console.log(`✓ Updated ${pkgPath} to ${nextVersion}`);

  // Update root CHANGELOG.md
  let currentChangelog = "";

  if (fs.existsSync(changelogPath)) {
    currentChangelog = fs.readFileSync(changelogPath, "utf-8");
  }

  const updatedChangelog = `${[markdown, currentChangelog].filter(Boolean).join("\n\n").trim()}\n`;
  fs.writeFileSync(changelogPath, updatedChangelog);
  console.log(`✓ Updated ${changelogPath}`);

  // Verify build passes with new version
  console.log("\n🔨 Verifying package build...");
  exec("pnpm --filter shadcn-schedule build", { stdio: "inherit" });

  // Commit, Tag, and Push
  console.log("\n🚀 Committing and tagging release...");
  exec("git add packages/shadcn-schedule/package.json CHANGELOG.md");
  exec(`git commit -m "chore(release): ${nextTag}"`);
  exec(`git tag -a "${nextTag}" -m "${nextTag}"`);

  console.log(`✓ Created commit and tag ${nextTag}`);
  console.log("\nTo push and publish, run:");
  console.log(`  git push origin main && git push origin ${nextTag}\n`);
};

try {
  await main();
} catch (error: unknown) {
  console.error(error);
  process.exit(1);
}
