#!/usr/bin/env node
const { readdir } = require('node:fs/promises')
const { join, relative } = require('node:path')
const { homedir } = require('node:os')
const { execFileSync } = require('node:child_process')
const { findBaseCommit } = require('./utils')

let allPass = true
const base = execFileSync(
  'git',
  ['-C', join(__dirname, '..', 'nothing-static'), 'rev-parse', 'HEAD'],
  { encoding: 'utf8' },
).trim()
const root = process.cwd()

const walk = async dir => {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) await walk(path)
    if (entry.name === 'build.js') {
      const rel = relative(root, dir) || '.'
      if (rel.includes('nothing-static')) return
      const currentBase = findBaseCommit(dir)
      const pass = currentBase && currentBase === base
      if (!pass) allPass = false
      console.log(`${pass ? '✅' : '❌'} ${rel}`)
    }
  }
}
walk(root).then(() => {
  if (allPass) console.log('\n🎉 Pando!')
})
