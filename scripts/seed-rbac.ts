import 'dotenv/config'
import { syncRbac } from '../src/rbac/sync'

async function main() {
  const res = await syncRbac()
  console.log(`Seeded ${res.permissions} permissions, ${res.orgs} orgs, ${res.membersBackfilled} members backfilled.`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
