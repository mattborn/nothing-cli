#!/usr/bin/env node
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

const ask = q => new Promise(r => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  rl.question(q, a => { rl.close(); r(a.trim()) })
})

const init = async () => {
  const name = process.argv[2] || await ask('Project name: ')
  if (!name) {
    console.error('❌ Project name required')
    process.exit(1)
  }

  const domain = await ask('Domain (optional): ')
  const dest = path.join(process.cwd(), name)

  if (fs.existsSync(dest)) {
    console.error(`❌ Directory ${name} already exists`)
    process.exit(1)
  }

  console.log('\n📦 Cloning nothing-static...')
  execSync(`git clone https://github.com/mattborn/nothing-static.git "${dest}"`, { stdio: 'inherit' })

  execSync('git remote remove origin', { cwd: dest })

  const pkg = JSON.parse(fs.readFileSync(path.join(dest, 'package.json'), 'utf8'))
  pkg.name = name
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')

  if (domain) {
    fs.writeFileSync(path.join(dest, 'CNAME'), domain + '\n')
    const build = fs.readFileSync(path.join(dest, 'build.js'), 'utf8')
    const lines = build.split('\n')
    const filtered = lines.filter((l, i) =>
      !(i >= 4 && i <= 10 && (l.includes('getRepoName') || l.includes('basePath')))
    )
    filtered.splice(4, 0, 'const basePath = \'/\'')
    fs.writeFileSync(path.join(dest, 'build.js'), filtered.join('\n'))
  }

  execSync('git add .', { cwd: dest })
  execSync(`git commit -m "Initial commit" -m "Initialized with nothing-cli"`, { cwd: dest })

  console.log(`\n✅ Created ${name}`)
}

init()
