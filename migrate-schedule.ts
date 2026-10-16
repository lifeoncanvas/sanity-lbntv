import fs from 'fs'
import path from 'path'
import vm from 'vm'
import { getCliClient } from 'sanity/cli'

const client = getCliClient({ apiVersion: '2026-02-01' })

interface RawSlot {
  time: string
  title: string
  category: string
  duration: string
  host: string
  live: boolean
  image: string // filename
}

type RawScheduleData = Record<string, RawSlot[]>

function getSlotStartMinutes(time: string): number {
  const parts = time.split(/[: ]/)
  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)
  const isPm = time.includes('PM')
  const normalizedHours = hours === 12 ? 0 : hours
  return (normalizedHours + (isPm ? 12 : 0)) * 60 + minutes
}

function extractScheduleData(): RawScheduleData {
  const filePath = path.resolve(process.cwd(), '../lbn_tv/src/assets/data/scheduleData.js')
  if (!fs.existsSync(filePath)) {
    throw new Error(`scheduleData.js not found at: ${filePath}`)
  }

  let content = fs.readFileSync(filePath, 'utf8')

  // Replace image imports with their string filenames
  content = content.replace(/import\s+(\w+)\s+from\s+'\.\.\/images\/([^']+)';/g, 'const $1 = "$2";')

  const scheduleDataStartIndex = content.indexOf('export const scheduleData =')
  if (scheduleDataStartIndex === -1) {
    throw new Error('scheduleData declaration not found in file')
  }

  const codeToRun =
    content.slice(0, content.indexOf('export const getSlotStartMinutes')) +
    '\n' +
    content.slice(scheduleDataStartIndex).replace('export const scheduleData =', 'const scheduleData =') +
    '\nmodule.exports = { scheduleData };'

  const sandbox = { module: { exports: {} }, exports: {} }
  vm.createContext(sandbox)
  vm.runInContext(codeToRun, sandbox)

  return (sandbox.module.exports as { scheduleData: RawScheduleData }).scheduleData
}

async function uploadOrFindImage(
  filename: string,
  assetMap: Map<string, string>
): Promise<string | null> {
  // Check in-memory / Sanity cache
  if (assetMap.has(filename)) {
    return assetMap.get(filename)!
  }

  const localImagePath = path.resolve(process.cwd(), '../lbn_tv/src/assets/images', filename)
  if (!fs.existsSync(localImagePath)) {
    console.warn(`Local image not found: ${localImagePath}`)
    return null
  }

  console.log(`  Uploading asset: ${filename} ...`)
  const asset = await client.assets.upload('image', fs.createReadStream(localImagePath), {
    filename,
  })

  assetMap.set(filename, asset._id)
  return asset._id
}

async function run() {
  console.log('=== Step 1: Extract schedule data from scheduleData.js ===')
  const scheduleData = extractScheduleData()
  const days = Object.keys(scheduleData)
  let totalRawItems = 0
  for (const day of days) {
    console.log(`  ${day}: ${scheduleData[day].length} items`)
    totalRawItems += scheduleData[day].length
  }
  console.log(`Total items to migrate: ${totalRawItems}`)

  console.log('\n=== Step 2: Index existing Sanity assets and programmes ===')
  // Index image assets
  const existingAssets = await client.fetch<Array<{ _id: string; originalFilename?: string }>>(
    `*[_type == "sanity.imageAsset"]{ _id, originalFilename }`
  )
  const assetMap = new Map<string, string>()
  for (const asset of existingAssets) {
    if (asset.originalFilename) {
      assetMap.set(asset.originalFilename, asset._id)
    }
  }
  console.log(`Found ${assetMap.size} existing image assets in Sanity.`)

  // Index programmes for reference linking
  const existingProgrammes = await client.fetch<Array<{ _id: string; title: string }>>(
    `*[_type == "programme"]{ _id, title }`
  )
  console.log(`Found ${existingProgrammes.length} programmes in Sanity for potential linking.`)

  const findProgrammeRef = (title: string): string | undefined => {
    const t = title.toLowerCase()
    if (t.includes('trumpet')) return existingProgrammes.find((p) => p.title.toLowerCase().includes('trumpet'))?._id
    if (t.includes('timeless paragon')) return existingProgrammes.find((p) => p.title.toLowerCase().includes('timeless paragon'))?._id
    if (t.includes('word at work')) return existingProgrammes.find((p) => p.title.toLowerCase().includes('word at work'))?._id
    if (t.includes('wholeness')) return existingProgrammes.find((p) => p.title.toLowerCase().includes('wholeness'))?._id
    if (t.includes('ignite')) return existingProgrammes.find((p) => p.title.toLowerCase().includes('ignite'))?._id
    if (t.includes('crafting faith')) return existingProgrammes.find((p) => p.title.toLowerCase().includes('crafting faith'))?._id
    if (t.includes('money matters')) return existingProgrammes.find((p) => p.title.toLowerCase().includes('money matters'))?._id
    if (t.includes('teevablaze')) return existingProgrammes.find((p) => p.title.toLowerCase().includes('teevablaze'))?._id
    if (t.includes('voice of praise')) return existingProgrammes.find((p) => p.title.toLowerCase().includes('voice of praise'))?._id
    if (t.includes('healthy living')) return existingProgrammes.find((p) => p.title.toLowerCase().includes('healthy living'))?._id
    if (t.includes('just believe')) return existingProgrammes.find((p) => p.title.toLowerCase().includes('just believe'))?._id
    return undefined
  }

  console.log('\n=== Step 3: Remove old dummy sample schedule items ===')
  const dummyIds = ['schedule-fri-1000', 'schedule-mon-0700', 'schedule-mon-1130', 'schedule-mon-1200']
  for (const id of dummyIds) {
    try {
      await client.delete(id)
      console.log(`  Deleted legacy dummy item: ${id}`)
    } catch {
      // Ignored if already absent
    }
  }

  console.log('\n=== Step 4: Ensure all unique schedule images exist in Sanity ===')
  const uniqueFilenames = new Set<string>()
  for (const day of days) {
    for (const slot of scheduleData[day]) {
      if (slot.image) uniqueFilenames.add(slot.image)
    }
  }
  console.log(`Unique images referenced in schedule: ${uniqueFilenames.size}`)

  for (const filename of uniqueFilenames) {
    await uploadOrFindImage(filename, assetMap)
  }

  console.log('\n=== Step 5: Migrate schedule items by day ===')
  let totalMigrated = 0
  let linkedProgrammeCount = 0

  for (const day of days) {
    const slots = scheduleData[day]
    console.log(`Migrating ${day} (${slots.length} slots)...`)
    const transaction = client.transaction()

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]
      const docId = `scheduleItem-${day.toLowerCase()}-${String(i).padStart(2, '0')}`
      const startMinutes = getSlotStartMinutes(slot.time)
      const assetId = slot.image ? assetMap.get(slot.image) : null
      const progRef = findProgrammeRef(slot.title)

      if (progRef) {
        linkedProgrammeCount++
      }

      const scheduleDoc: { _id: string; _type: string; [key: string]: any } = {
        _id: docId,
        _type: 'scheduleItem',
        title: slot.title,
        day,
        time: slot.time,
        order: i,
        startMinutes,
        category: slot.category,
        duration: slot.duration,
        host: slot.host,
        live: Boolean(slot.live),
        ...(assetId
          ? {
              image: {
                _type: 'image',
                asset: {
                  _type: 'reference',
                  _ref: assetId,
                },
              },
            }
          : {}),
        ...(progRef
          ? {
              programmeRef: {
                _type: 'reference',
                _ref: progRef,
              },
            }
          : {}),
      }

      transaction.createOrReplace(scheduleDoc)
    }

    await transaction.commit()
    totalMigrated += slots.length
    console.log(`  ✓ Committed ${slots.length} items for ${day}`)
  }

  console.log('\n=== Step 6: Verify final scheduleItem count in Sanity ===')
  const count = await client.fetch<number>(`count(*[_type == "scheduleItem"])`)
  console.log(`Total scheduleItem documents in Sanity: ${count}`)
  console.log(`Total programme references linked: ${linkedProgrammeCount}`)
  console.log('Migration completed successfully!')
}

run().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
