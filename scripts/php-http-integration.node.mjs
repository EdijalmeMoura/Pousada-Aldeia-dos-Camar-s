import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { testEndpoint } from './php-http-integration.mjs'

test('recusa HTTP, produção, localhost e caminhos sem identificação de ensaio', () => {
  for (const url of [
    'http://staging.example.org/test/',
    'https://projetoredesnordeste.com.br/edijalmemoura/hospedae/',
    'https://projetoredesnordeste.com.br/test/',
    'https://staging.projetoredesnordeste.com.br/test/',
    'https://localhost/test/',
    'https://example.org/edijalmemoura/hospedae/',
    'https://example.org/test/?x=1',
  ]) assert.throws(() => testEndpoint(url))
  assert.equal(testEndpoint('https://staging.example.org/edijalmemoura/hospedae/').pathname, '/edijalmemoura/hospedae/')
  assert.equal(testEndpoint('https://example.org/test/').pathname, '/test/')
})
