// The component license policy (docs/decisions/0007-component-license-policy.md).

export const ALLOWED_LICENSES = new Set([
  "MIT",
  "ISC",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  "Unlicense",
  "CC0-1.0",
]);

/**
 * Whether an SPDX expression allows redistribution: `A OR B` passes when
 * either side does, `A AND B` only when both do. Parentheses and `WITH`
 * exceptions are refused (they need a person to review them).
 */
export function licenseAllowed(expression) {
  if (typeof expression !== "string" || !expression.trim()) {
    return false;
  }
  if (/[()]|\bWITH\b/.test(expression)) {
    return false;
  }
  return expression
    .split(/\s+OR\s+/)
    .some((alternative) =>
      alternative
        .split(/\s+AND\s+/)
        .every((id) => ALLOWED_LICENSES.has(id.trim())),
    );
}

const URL_IN_AUTHOR = /<https:\/\/[^>\s]+>/;
const SHA = /^[0-9a-f]{40}$/;
const OSS_REQUIRED = [
  "id",
  "name",
  "repo",
  "visibility",
  "status",
  "fetch",
  "ref",
  "author",
  "license",
  "attribution",
  "credit",
  "components",
];

/** Problems with the `oss` section of sources.yaml. */
export function checkOssSources(sources, credits) {
  const problems = [];
  for (const source of sources.oss) {
    const where = `sources.yaml oss ${source.id ?? "(no id)"}`;
    for (const key of OSS_REQUIRED) {
      if (source[key] === undefined || source[key] === "") {
        problems.push(`${where}: missing ${key}`);
      }
    }
    if (source.repo && !/^https:\/\//.test(source.repo)) {
      problems.push(`${where}: repo must be a public https URL`);
    }
    if (source.visibility && source.visibility !== "public") {
      problems.push(`${where}: third-party sources must be public`);
    }
    if (source.ref && !SHA.test(source.ref)) {
      problems.push(
        `${where}: ref must be a full commit SHA, never a branch or tag`,
      );
    }
    if (source.license && !licenseAllowed(source.license)) {
      problems.push(
        `${where}: license ${source.license} does not allow redistribution here`,
      );
    }
    if (source.credit && !credits.get(source.credit)?.url) {
      problems.push(
        `${where}: credit ${source.credit} must be a registry entry with a url`,
      );
    }
  }
  return problems;
}

/** Problems with one entry's license and attribution. */
export function checkEntryLicense(entry, sources, credits) {
  const { meta, rel } = entry;
  const problems = [];
  if (!meta) {
    return [`${rel}: no readable meta.json`];
  }
  const source = sources.byId.get(entry.sourceId);
  if (!source) {
    return [`${rel}: source ${entry.sourceId} is not in sources.yaml`];
  }
  if (source.status !== "active") {
    problems.push(`${rel}: source ${entry.sourceId} is not active`);
  }
  if (!licenseAllowed(meta.license)) {
    problems.push(
      `${rel}: license "${meta.license ?? "(none)"}" is not on the redistribution allowlist`,
    );
  }
  for (const id of meta.credits ?? []) {
    if (!credits.has(id)) {
      problems.push(
        `${rel}: credit ${id} is not in docs/sources/registry.yaml`,
      );
    }
  }
  if ((meta.credits ?? []).length === 0) {
    problems.push(`${rel}: at least one credit is required`);
  }
  if (
    source.visibility === "private" &&
    meta.source?.repo !== "private source"
  ) {
    problems.push(
      `${rel}: a private source's source.repo must be "private source"`,
    );
  }
  if (source.section === "oss") {
    if (!meta.author || !URL_IN_AUTHOR.test(meta.author)) {
      problems.push(
        `${rel}: third-party author must include a link: "Name <https://...>"`,
      );
    }
    if (!meta.attribution) {
      problems.push(
        `${rel}: third-party components need an attribution notice`,
      );
    }
    if (!(meta.credits ?? []).includes(source.credit)) {
      problems.push(
        `${rel}: credits must include the source's credit ${source.credit}`,
      );
    }
    if (meta.source?.repo !== source.repo) {
      problems.push(`${rel}: source.repo must be ${source.repo}`);
    }
    if (meta.source?.commit !== source.ref) {
      problems.push(
        `${rel}: source.commit must equal the pinned ref in sources.yaml`,
      );
    }
    if (meta.license !== source.license) {
      problems.push(
        `${rel}: license must match sources.yaml (${source.license})`,
      );
    }
  }
  return problems;
}
