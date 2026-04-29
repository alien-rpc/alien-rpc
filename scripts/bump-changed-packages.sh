#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/bump-changed-packages.sh --otp <code> [bumpp args...]
  scripts/bump-changed-packages.sh --otp <code> --publish-current
  scripts/bump-changed-packages.sh --list

Bump publishable packages that have commits touching package.json, src, docs,
or examples since that package's last version tag.

Packages are bumped in dependency-first topological order, so workspace
packages with no workspace dependencies are processed before their dependents.
Each package is published before the next package is bumped.

Options:
  --otp <code>
            Required for bumping and publishing. Passed to `pnpm publish`.
  --publish-current
            Publish each detected package's current package.json version without
            running `bumpp`. This is automatic for packages whose current
            package.json version does not have a matching git tag yet.
  --list    Print the packages that would be bumped, then exit.
  -h, --help
            Show this help.

Examples:
  scripts/bump-changed-packages.sh --list
  scripts/bump-changed-packages.sh --otp 123456 patch --yes
  scripts/bump-changed-packages.sh --otp 123456 --publish-current
  scripts/bump-changed-packages.sh --otp 123456 --no-push
USAGE
}

list_only=false
otp=""
publish_current=false
bumpp_args=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h | --help)
      usage
      exit 0
      ;;
    --list)
      list_only=true
      shift
      ;;
    --publish-current)
      publish_current=true
      shift
      ;;
    --otp)
      if [[ -z "${2:-}" ]]; then
        echo "error: --otp requires a value" >&2
        exit 2
      fi
      otp="$2"
      shift 2
      ;;
    --otp=*)
      otp="${1#--otp=}"
      if [[ -z "$otp" ]]; then
        echo "error: --otp requires a value" >&2
        exit 2
      fi
      shift
      ;;
    *)
      bumpp_args+=("$1")
      shift
      ;;
  esac
done

if [[ "$publish_current" == true && ${#bumpp_args[@]} -gt 0 ]]; then
  echo "error: bumpp arguments cannot be used with --publish-current" >&2
  exit 2
fi

if [[ "$list_only" != true && -z "$otp" ]]; then
  echo "error: --otp is required for bumping and publishing" >&2
  echo >&2
  usage >&2
  exit 2
fi

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

package_plan_file="$(mktemp)"
trap 'rm -f "$package_plan_file"' EXIT

PUBLISH_CURRENT="$publish_current" node <<'NODE' >"$package_plan_file"
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const publishCurrent = process.env.PUBLISH_CURRENT === 'true'
const watchNames = ['package.json', 'src', 'docs', 'examples']
const dependencyFields = [
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
  'devDependencies',
]

function git(args, options = {}) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', options.allowFailure ? 'ignore' : 'pipe'],
    }).trim()
  } catch (error) {
    if (options.allowFailure) {
      return ''
    }
    throw error
  }
}

function readPackage(dir) {
  const file = path.join(dir, 'package.json')
  return {
    dir,
    manifest: JSON.parse(fs.readFileSync(file, 'utf8')),
  }
}

function hasTag(tag) {
  return Boolean(
    git(['rev-parse', '-q', '--verify', `refs/tags/${tag}^{}`], {
      allowFailure: true,
    })
  )
}

function describeTag(pattern) {
  return git(['describe', '--tags', '--match', pattern, '--abbrev=0', 'HEAD'], {
    allowFailure: true,
  })
}

function versionTagCandidates(pkg) {
  const { name, version } = pkg.manifest
  const tags = [`${name}@${version}`]
  if (name === 'alien-rpc') {
    tags.unshift(`v${version}`)
  }
  return tags
}

function currentVersionTag(pkg) {
  for (const tag of versionTagCandidates(pkg)) {
    if (hasTag(tag)) {
      return tag
    }
  }
  return ''
}

function lastVersionTag(pkg) {
  const currentTag = currentVersionTag(pkg)
  if (currentTag) {
    return currentTag
  }

  const packageTag = describeTag(`${pkg.manifest.name}@*`)
  if (packageTag) {
    return packageTag
  }

  if (pkg.manifest.name === 'alien-rpc') {
    return describeTag('v*')
  }

  return ''
}

function changedFilesSince(tag, dir) {
  const watchPaths = watchNames.map(name => path.join(dir, name))
  if (!tag) {
    return git(['ls-files', '--', ...watchPaths])
      .split('\n')
      .filter(Boolean)
  }

  return git(['diff', '--name-only', `${tag}..HEAD`, '--', ...watchPaths])
    .split('\n')
    .filter(Boolean)
}

const packages = fs
  .readdirSync('packages', { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => readPackage(path.join('packages', entry.name)))
  .filter(pkg => pkg.manifest.private !== true)
  .sort((a, b) => a.dir.localeCompare(b.dir))

const packagesByName = new Map(packages.map(pkg => [pkg.manifest.name, pkg]))

for (const pkg of packages) {
  pkg.workspaceDependencies = []
  for (const field of dependencyFields) {
    for (const name of Object.keys(pkg.manifest[field] || {})) {
      if (packagesByName.has(name)) {
        pkg.workspaceDependencies.push(name)
      }
    }
  }
}

const topologicalOrder = []
const visiting = new Set()
const visited = new Set()

function visit(name) {
  if (visited.has(name)) {
    return
  }
  if (visiting.has(name)) {
    throw new Error(`Workspace dependency cycle involving ${name}`)
  }

  visiting.add(name)
  const pkg = packagesByName.get(name)
  for (const dependencyName of pkg.workspaceDependencies.sort()) {
    visit(dependencyName)
  }
  visiting.delete(name)
  visited.add(name)
  topologicalOrder.push(name)
}

for (const pkg of packages) {
  visit(pkg.manifest.name)
}

const selectedPackages = new Map()
for (const pkg of packages) {
  const tag = lastVersionTag(pkg)
  const currentTag = currentVersionTag(pkg)
  const changedFiles = changedFilesSince(tag, pkg.dir)
  if (publishCurrent || changedFiles.length > 0) {
    selectedPackages.set(pkg.manifest.name, {
      ...pkg,
      tag,
      changedFiles,
      currentTag,
    })
  }
}

for (const name of topologicalOrder) {
  const pkg = selectedPackages.get(name)
  if (pkg) {
    console.log(
      [
        pkg.manifest.name,
        pkg.dir,
        pkg.tag || '<none>',
        pkg.changedFiles.length,
        pkg.manifest.version,
        pkg.currentTag || '<none>',
      ].join('\t')
    )
  }
}
NODE

mapfile -t package_plan <"$package_plan_file"

if [[ ${#package_plan[@]} -eq 0 ]]; then
  if [[ "$publish_current" == true ]]; then
    echo "No publishable packages found."
  else
    echo "No publishable packages have package.json, src, docs, or examples commits since their last version."
  fi
  exit 0
fi

if [[ "$publish_current" == true ]]; then
  echo "Packages to publish at their current versions, in dependency order:"
else
  echo "Packages changed since their last version, in bump order:"
fi

for line in "${package_plan[@]}"; do
  IFS=$'\t' read -r package_name package_dir last_tag changed_file_count current_version current_tag <<<"$line"
  if [[ "$publish_current" == true || "$current_tag" == "<none>" ]]; then
    printf '  %s@%s (%s files since %s, publish current)\n' "$package_name" "$current_version" "$changed_file_count" "$last_tag"
  else
    printf '  %s@%s (%s files since %s, bump then publish)\n' "$package_name" "$current_version" "$changed_file_count" "$last_tag"
  fi
done

if [[ "$list_only" == true ]]; then
  exit 0
fi

for line in "${package_plan[@]}"; do
  IFS=$'\t' read -r package_name package_dir last_tag changed_file_count current_version current_tag <<<"$line"
  echo
  (
    cd "$package_dir"
    if [[ "$publish_current" == true || "$current_tag" == "<none>" ]]; then
      echo "Publishing current version of $package_name ($current_version)"
    else
      echo "Bumping $package_name"
      pnpm exec bumpp "${bumpp_args[@]}"
      current_version="$(node -p "require('./package.json').version")"
      echo "Publishing $package_name ($current_version)"
    fi
    pnpm publish --otp "$otp"
  )
done
