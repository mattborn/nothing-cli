#!/usr/bin/env node
const { readdir } = require('node:fs/promises')
const { join, relative } = require('node:path')
const { homedir } = require('node:os')
const { execFileSync } = require('node:child_process')

let allPass = true
const base = execFileSync(
  'git',
  ['-C', join(homedir(), 'Code', 'nothing-static'), 'rev-parse', 'HEAD'],
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
      try {
        const secondToLast = execFileSync(
          'git',
          ['-C', dir, 'rev-parse', 'HEAD~1'],
          { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
        ).trim()
        const pass = secondToLast === base
        if (!pass) allPass = false
        console.log(`${pass ? '✅' : '❌'} ${rel}`)
      } catch {
        allPass = false
        console.log(`❌ ${rel}`)
      }
    }
  }
}
walk(root).then(() => {
  if (allPass) console.log('\n🎉 Pando!')
})
