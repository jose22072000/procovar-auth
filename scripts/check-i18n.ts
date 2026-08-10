/**
 * Fails when the locale bundles drift apart. Neither TypeScript nor next-intl
 * catches a key that exists in `en` but not in `es`.
 *
 * Run: npx tsx scripts/check-i18n.ts
 */
import fs from 'fs'
import path from 'path'
import { diffMessageKeys } from '../src/lib/i18n-keys'

const root = path.resolve(import.meta.dirname, '..')
const read = (locale: string) =>
	JSON.parse(fs.readFileSync(path.join(root, 'messages', `${locale}.json`), 'utf8')) as Record<
		string,
		unknown
	>

const en = read('en')
const es = read('es')
const { missingInB: missingInEs, missingInA: missingInEn } = diffMessageKeys(en, es)

if (missingInEs.length === 0 && missingInEn.length === 0) {
	console.log('i18n OK: en and es have identical keys')
	process.exit(0)
}

if (missingInEs.length) console.error(`Missing in messages/es.json:\n  ${missingInEs.join('\n  ')}`)
if (missingInEn.length) console.error(`Missing in messages/en.json:\n  ${missingInEn.join('\n  ')}`)
process.exit(1)
