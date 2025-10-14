#!/usr/bin/env node
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const baseRepo = 'https://github.com/mattborn/nothing-static.git'
const targetRepo = path.resolve(process.argv[2])

if (!process.argv[2]) {
  console.error('Usage: node nothing-cli/update <project-path>')
  process.exit(1)
}

const run = (cmd, cwd = targetRepo) =>
  execSync(cmd, { cwd, encoding: 'utf8' }).trim()

// Load file rules from files.csv
const rulesPath = path.join(__dirname, 'files.csv')
const fileRules = new Map()
fs.readFileSync(rulesPath, 'utf8')
  .split('\n')
  .slice(1) // Skip header
  .filter(line => line.trim())
  .forEach(line => {
    const [file, action] = line.split(',')
    fileRules.set(file, action)
  })

// Get latest nothing-static commit from GitHub
const latestBase = run(`git ls-remote ${baseRepo} HEAD | cut -f1`, process.cwd())
console.log(`📦 Latest nothing-static: ${latestBase.slice(0, 7)}`)

// Find the refactor commit
const refactorCommit = run('git log --grep="Refactored with nothing-cli" --format=%H')
if (!refactorCommit) {
  console.error('❌ Could not find "Refactored with nothing-cli" commit')
  process.exit(1)
}

// Get the commit before the refactor commit (the original nothing-static base)
const currentBase = run(`git rev-parse ${refactorCommit}^`)
console.log(`📍 Current base: ${currentBase.slice(0, 7)}`)

if (currentBase === latestBase) {
  console.log('✅ Already up to date!')
  process.exit(0)
}

// Create backup
const backup = `backup-${Date.now()}`
execSync(`git branch ${backup}`, { cwd: targetRepo, stdio: 'inherit' })
console.log(`💾 Created backup branch: ${backup}`)

// Fetch the new base commit
execSync(`git fetch ${baseRepo}`, { cwd: targetRepo, stdio: 'inherit' })

// Rebase all project commits onto new nothing-static
try {
  execSync(`git rebase --onto ${latestBase} ${currentBase}`, { cwd: targetRepo, stdio: 'inherit' })
  console.log(`\n✅ Updated to latest nothing-static!`)
  console.log(`🔄 To undo: git reset --hard ${backup}`)
} catch (error) {
  // Generate conflict resolution prompt
  console.log(`\n⚠️  Rebase paused due to conflicts`)
  console.log(`\n📋 Copy this prompt to Claude to resolve conflicts:\n`)

  const lockedFiles = Array.from(fileRules.entries())
    .filter(([_, action]) => action === 'lock')
    .map(([file]) => file)
  const mergeFiles = Array.from(fileRules.entries())
    .filter(([_, action]) => action === 'merge')
    .map(([file]) => file)
  const skipFiles = Array.from(fileRules.entries())
    .filter(([_, action]) => action === 'skip')
    .map(([file]) => file)

  const prompt = `Resolve merge conflicts with these rules:

LOCKED files (always use nothing-static/incoming version):
${lockedFiles.map(f => `  - ${f}`).join('\n')}

MERGE files (resolve conflicts manually, prefer project customizations):
${mergeFiles.map(f => `  - ${f}`).join('\n')}

SKIP files (always use project version):
${skipFiles.map(f => `  - ${f}`).join('\n')}

After resolving, add files and run: git rebase --continue`

  console.log(prompt)
  console.log(`\n🔄 To undo: git reset --hard ${backup}`)

  // Copy to clipboard if pbcopy exists
  try {
    const { spawn } = require('child_process')
    const pbcopy = spawn('pbcopy')
    pbcopy.stdin.write(prompt)
    pbcopy.stdin.end()
    console.log(`\n✅ Prompt copied to clipboard!`)
  } catch (e) {
    // Silently fail if pbcopy doesn't exist
  }
}
