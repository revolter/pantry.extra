#!/usr/bin/env -S tea -E

/*---
dependencies:
  gnu.org/tar: 1
  tukaani.org/xz: 5
  sourceware.org/bzip2: 1
args:
  - deno
  - run
  - --allow-net
  - --allow-run
  - --allow-read
  - --allow-write={{tea.prefix}}
  - --allow-env
  - --import-map={{ srcroot }}/import-map.json
---*/

import { usePantry } from "hooks"
import { Installation } from "types"
import { pkg as pkgutils } from "utils"
import { useFlags, usePrefix } from "hooks"
import { set_output } from "./utils/gha.ts"
import build from "./build/build.ts"
import * as ARGV from "./utils/args.ts"

useFlags()

const pantry = usePantry()
const dry = await ARGV.toArray(ARGV.pkgs())
const gha = !!Deno.env.get("GITHUB_ACTIONS")
const group_it = gha && dry.length > 1
const rv: Installation[] = []

if (usePrefix().string != "/opt") {
  console.error({ TEA_PREFIX: usePrefix().string })
  throw new Error("builds must be performed in /opt (try TEA_PREFIX=/opt)")
}

for (const rq of dry) {
  const pkg = await pantry.resolve(rq)

  if (group_it) {
    console.log("::group::", pkgutils.str(pkg))
  } else {
    console.log({ building: pkg.project })
  }

  const install = await build(pkg)
  rv.push(install)

  if (group_it) {
    console.log("::endgroup::")
  }
}

await set_output("pkgs", rv.map(x => pkgutils.str(x.pkg)))
await set_output("paths", rv.map(x => x.path), '%0A')
await set_output("relative-paths", rv.map(x => x.path.relative({ to: usePrefix() })))
