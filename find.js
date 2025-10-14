#!/usr/bin/env node
const { readdir } = require('node:fs/promises')
const { join, relative, dirname } = require('node:path')
const root = process.cwd()
const walk = async dir => {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) await walk(path)
    if (entry.name === 'build.js')
      console.log(dirname(relative(root, path)) || '.')
  }
}
walk(root)
