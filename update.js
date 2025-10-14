#!/usr/bin/env node
const { execSync } = require('child_process')
const path = require('path')
const { findBaseCommit, readFileRules } = require('./utils')

const baseRepo = 'https://github.com/mattborn/nothing-static.git'
const targetRepo = path.resolve(process.argv[2])

if (!process.argv[2]) {
  console.error('Usage: node nothing-cli/update <project-path>')
  process.exit(1)
}

const run = (cmd, cwd = targetRepo) =>
  execSync(cmd, { cwd, encoding: 'utf8' }).trim()

// Load file rules from files.csv
const fileRules = new Map(readFileRules().map(r => [r.file, r.action]))

// Get latest nothing-static commit from GitHub
const latestBase = run(`git ls-remote ${baseRepo} HEAD | cut -f1`, process.cwd())
console.log(`📦 Latest nothing-static: ${latestBase.slice(0, 7)}`)

// Find the current nothing-static base commit
const currentBase = findBaseCommit(targetRepo)
if (!currentBase) {
  console.error('❌ Could not find "with nothing-cli" commit')
  process.exit(1)
}
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
  console.log(`\n🧹 Review ${path.basename(targetRepo)} for code redundancies after updating from nothing-static ${currentBase.slice(0, 7)} to ${latestBase.slice(0, 7)}. Check src/global.css, src/global.js, src/layout.html for any code that duplicates functionality now in the base.`)
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

LOCKED files (use git checkout --ours <file>):
${lockedFiles.map(f => `  - ${f}`).join('\n')}

MERGE files (resolve conflicts manually, prefer project customizations):
${mergeFiles.map(f => `  - ${f}`).join('\n')}

SKIP files (use git checkout --theirs <file>):
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
