const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { homedir } = require('os')
const { findBaseCommit, readFileRules } = require('./utils')

const baseRepo = 'https://github.com/mattborn/nothing-static.git'
const ignore = ['.DS_Store', '.git', 'build', 'node_modules']
const projectRepo = path.resolve(process.argv[2])

if (!projectRepo) {
  console.error('Usage: node nothing-cli/refactor <project-path>')
  process.exit(1)
}

const projectName = path.basename(projectRepo)
const newRepo = path.join(process.cwd(), `${projectName}-refactored`)


const getCommitMessages = () => {
  const log = execSync('git log --pretty=format:"%ai %s"', {
    cwd: projectRepo,
    encoding: 'utf8',
  })
  return log.split('\n').filter(Boolean).join('\n')
}

const applyPatch = (baseFile, projectFile) => {
  if (!fs.existsSync(projectFile)) return false
  try {
    const diff = execSync(`diff -u "${baseFile}" "${projectFile}" || true`, { encoding: 'utf8' })
    if (!diff) return false
    execSync(`patch "${baseFile}"`, { cwd: newRepo, input: diff })
    return true
  } catch (e) {
    return false
  }
}

const refactor = () => {
  console.log(`\n🔄 Refactoring ${projectName}\n`)

  if (!fs.existsSync(newRepo)) {
    execSync(`git clone "${baseRepo}" "${newRepo}"`)
    console.log('✅ Cloned nothing-static\n')
  } else {
    const currentBase = findBaseCommit(newRepo)
    if (currentBase) {
      execSync(`git fetch "${baseRepo}" main`, { cwd: newRepo })
      const latestBase = execSync('git rev-parse FETCH_HEAD', { cwd: newRepo, encoding: 'utf8' }).trim()
      if (currentBase === latestBase) {
        console.log('✅ Already up to date\n')
        return
      }
    }
    execSync(`git fetch "${baseRepo}" main && git reset --hard FETCH_HEAD`, { cwd: newRepo })
    console.log('✅ Reset to latest nothing-static\n')
  }

  const rules = readFileRules()

  rules.forEach(({ file, action }) => {
    const baseFile = path.join(newRepo, file)
    const projectFile = path.join(projectRepo, file)

    if (action === 'skip') {
      if (fs.existsSync(baseFile)) {
        fs.rmSync(baseFile, { force: true })
        console.log(`🗑️  ${file}`)
      }
    } else if (action === 'merge') {
      if (fs.existsSync(baseFile)) {
        applyPatch(baseFile, projectFile)
        console.log(`🔀 ${file}`)
      }
    } else if (action === 'lock') {
      console.log(`🔒 ${file}`)
    }
  })

  try {
    const projectRemote = execSync('git remote get-url origin', {
      cwd: projectRepo,
      encoding: 'utf8',
    }).trim()
    execSync(`git remote set-url origin "${projectRemote}"`, { cwd: newRepo })
    console.log(`\n🔗 Updated remote to: ${projectRemote}\n`)
  } catch (e) {
    console.log('\n⚠️  No remote found in project\n')
  }

  console.log('📦 Copying project files\n')
  const copyProjectFiles = dir => {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
      if (ignore.includes(entry.name)) return

      const srcPath = path.join(dir, entry.name)
      const relPath = path.relative(projectRepo, srcPath)
      const destPath = path.join(newRepo, relPath)

      const isLocked = rules.some(r => r.file === relPath && r.action === 'lock')
      if (isLocked) return

      if (entry.isDirectory()) {
        if (!fs.existsSync(destPath))
          fs.mkdirSync(destPath, { recursive: true })
        copyProjectFiles(srcPath)
      } else {
        fs.copyFileSync(srcPath, destPath)
        console.log(`📄 ${relPath}`)
      }
    })
  }
  copyProjectFiles(projectRepo)

  const packagePath = path.join(newRepo, 'package.json')
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    pkg.name = projectName
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n')
    console.log(`\n📦 Updated package.json name to ${projectName}\n`)
  }

  const commitMessages = getCommitMessages()
  const commitHistory = commitMessages.split('\n').filter(Boolean)
  const firstCommitFull = commitHistory[commitHistory.length - 1]
  const firstCommit = firstCommitFull.split(' ').slice(3).join(' ')
  const commitBody = `Refactored with nothing-cli\n\n${commitMessages}`

  execSync('git add .', { cwd: newRepo })
  execSync(
    `git commit -m "${firstCommit}" -m "${commitBody
      .replace(/"/g, '\\"')
      .replace(/\$/g, '\\$')}"`,
    { cwd: newRepo },
  )

  console.log('\n✅ Refactored with nothing-cli')
  console.log(`\n📁 ${newRepo.replace(homedir(), '~')}\n`)
}

refactor()
