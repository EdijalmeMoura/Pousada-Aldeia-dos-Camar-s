import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import phpParser from 'php-parser'

const directory = 'backend/public/api'
const parser = new phpParser.Engine({ parser: { phpVersion: '8.2', suppressErrors: false } })
for (const file of readdirSync(directory).filter(name => name.endsWith('.php'))) {
  const path = join(directory, file)
  parser.parseCode(readFileSync(path, 'utf8'), path)
  console.log(`Sintaxe PHP analisada: ${path}`)
}
console.log('Nota: análise sintática não executa PHP nem testa MySQL.')
