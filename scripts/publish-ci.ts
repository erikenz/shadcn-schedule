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
const pkgDir = path.join(rootDir, "packages/shadcn-schedule");
const pkgPath = path.join(pkgDir, "package.json");

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
  const eventName =
    process.env.EVENT_NAME ?? process.env.GITHUB_EVENT_NAME ?? "push";

  const tagRef = process.env.GITHUB_REF_NAME ?? "";
  const bumpInput = process.env.BUMP ?? "patch";

  const rawPkg = fs.readFileSync(pkgPath, "utf-8");
  const parsed: unknown = JSON.parse(rawPkg);

  if (!isPackageJson(parsed)) {
    console.error("❌ Error: Invalid package.json format.");
    process.exit(1);
  }

  let { version } = parsed;

  if (eventName === "push" && tagRef.startsWith("v")) {
    version = tagRef.replace(/^v/u, "");
  } else if (eventName === "workflow_dispatch" || tagRef.length === 0) {
    if (isReleaseType(bumpInput)) {
      const next = semver.inc(version, bumpInput);

      if (next !== null) {
        version = next;
      }
    } else if (semver.valid(bumpInput) !== null) {
      version = bumpInput;
    }
  }

  const tag = `v${version}`;
  console.log(`\n🚀 Publishing ${parsed.name}@${version} (${tag}) to npm...\n`);

  // Ensure package.json has target version
  if (parsed.version !== version) {
    const updatedPkg = { ...parsed, version };
    fs.writeFileSync(pkgPath, `${JSON.stringify(updatedPkg, null, 2)}\n`);
  }

  // Generate release notes
  const config = await loadChangelogConfig(rootDir);
  config.newVersion = version;
  const rawCommits = await getGitDiff(config.from, config.to);
  const commits = parseCommits(rawCommits, config);
  const markdown = await generateMarkDown(commits, config);

  console.log("--- Release Notes ---");
  console.log(markdown);
  console.log("---------------------\n");

  // Save notes to a temp file for gh release
  const notesFile = path.join(rootDir, "RELEASE_NOTES.tmp.md");
  fs.writeFileSync(notesFile, markdown);

  // Publish to npm with provenance (Trusted Publishing OIDC)
  console.log("📦 Running npm publish...");
  execSync("npm publish --access public --provenance", {
    cwd: pkgDir,
    stdio: "inherit",
  });
  console.log("✓ Successfully published to npm!");

  // Create or update GitHub Release
  console.log(`\n📝 Creating/updating GitHub Release for ${tag}...`);

  try {
    exec(
      `gh release create "${tag}" --title "${tag}" --notes-file "${notesFile}"`
    );
    console.log(`✓ GitHub Release ${tag} created!`);
  } catch {
    console.log(`Release ${tag} might already exist, attempting edit...`);

    try {
      exec(
        `gh release edit "${tag}" --title "${tag}" --notes-file "${notesFile}"`
      );
      console.log(`✓ GitHub Release ${tag} updated!`);
    } catch (error: unknown) {
      console.warn("Could not update release via gh cli:", error);
    }
  } finally {
    if (fs.existsSync(notesFile)) {
      fs.unlinkSync(notesFile);
    }
  }
};

try {
  await main();
} catch (error: unknown) {
  console.error(error);
  process.exit(1);
}
