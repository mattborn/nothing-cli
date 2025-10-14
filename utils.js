const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const findBaseCommit = dir => {
  try {
    const markerCommit = execSync('git log --grep="with nothing-cli" --format=%H', {
      cwd: dir,
      encoding: 'utf8',
    }).trim()
    if (!markerCommit) return null
    return execSync(`git rev-parse ${markerCommit}^`, {
      cwd: dir,
      encoding: 'utf8',
    }).trim()
  } catch {
    return null
  }
}

const readFileRules = () => {
  const csv = fs.readFileSync(path.join(__dirname, 'files.csv'), 'utf8')
  return csv
    .split('\n')
    .slice(1)
    .filter(line => line.trim())
    .map(line => {
      const [file, action] = line.split(',')
      return { action, file }
    })
}

module.exports = { findBaseCommit, readFileRules }
