import fs from 'fs'
import path from 'path'
import { getCliClient } from 'sanity/cli'

const client = getCliClient({ apiVersion: '2026-02-01' })

async function uploadImage(imageFilename: string) {
  const fullPath = path.resolve(process.cwd(), '../lbn_tv/src/assets/images', imageFilename)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`)
  }

  // Check if asset already exists in Sanity
  const existing = await client.fetch<Array<{ _id: string }>>(
    `*[_type == "sanity.imageAsset" && originalFilename == $filename][0..0]{ _id }`,
    { filename: imageFilename }
  )

  if (existing.length > 0) {
    console.log(`  Asset already exists in Sanity: ${imageFilename} [${existing[0]._id}]`)
    return existing[0]._id
  }

  console.log(`  Uploading asset: ${imageFilename} ...`)
  const asset = await client.assets.upload('image', fs.createReadStream(fullPath), {
    filename: imageFilename,
  })
  console.log(`  Uploaded asset: ${imageFilename} [${asset._id}]`)
  return asset._id
}

async function run() {
  console.log('=== Step 1: Uploading Images for Global Programmes and Messages ===')
  const hslAssetId = await uploadImage('HSLHSWPC.jpeg')
  const gpafAssetId = await uploadImage('OCT_GPAF.png')
  const wotmAssetId = await uploadImage('WOTM.png')
  const yearlyAssetId = await uploadImage('Manifestation_banner.png')

  console.log('\n=== Step 2: Creating Global Programmes Documents ===')
  const globalProgramsDocs = [
    {
      _id: 'globalProgram-healing-streams',
      _type: 'globalPrograms',
      title: 'Healing Streams Live Healing Service with Pastor Chris',
      slug: { _type: 'slug', current: 'healing-streams-live-healing-service-with-pastor-chris' },
      badge: 'LIVE BROADCAST',
      broadcastDate: 'Friday 23 - Sunday 25 October 2026',
      description:
        'Join Pastor Chris for Healing Streams Live Healing Services, a global healing crusade broadcasting live miracles and testimonies.',
      linkUrl: 'https://healingstreams.org/?r=LWIN',
      order: 0,
      image: {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: hslAssetId,
        },
      },
    },
    {
      _id: 'globalProgram-prayer-and-fasting',
      _type: 'globalPrograms',
      title: 'Global Prayer And Fasting with Pastor Chris',
      slug: { _type: 'slug', current: 'global-prayer-and-fasting-with-pastor-chris' },
      badge: 'LIVE BROADCAST',
      broadcastDate: '27th October to 29th October',
      description:
        'Global Prayer and Fasting with Pastor Chris, broadcasting live on Loveworld India, JioTV, and online.',
      linkUrl: 'https://lbntv.org',
      order: 1,
      image: {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: gpafAssetId,
        },
      },
    },
  ]

  for (const doc of globalProgramsDocs) {
    const created = await client.createOrReplace(doc)
    console.log(`  ✓ Saved globalProgram [${created._id}] - "${created.title}"`)
  }

  console.log('\n=== Step 3: Creating Messages Documents ===')
  const messagesDocs = [
    {
      _id: 'message-month-of-mercies',
      _type: 'messages',
      title: 'October – The Month of Mercies',
      slug: { _type: 'slug', current: 'october-the-month-of-mercies' },
      badge: 'MESSAGE OF THE MONTH',
      objectPosition: 'center 58%',
      description: 'The Lord is good to all, and His tender mercies are over all His works. Psalm 145:9',
      order: 0,
      image: {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: wotmAssetId,
        },
      },
    },
    {
      _id: 'message-year-of-manifestation',
      _type: 'messages',
      title: '2026 The Year Of Manifestation',
      slug: { _type: 'slug', current: '2026-the-year-of-manifestation' },
      badge: 'MESSAGE OF THE YEAR',
      objectPosition: 'center center',
      description: '2026 The Year of Manifestation — 2 Cor 12:7, 2 Cor 4:2, Romans 8:19 NIV, 1 Cor 4:7',
      order: 1,
      image: {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: yearlyAssetId,
        },
      },
    },
  ]

  for (const doc of messagesDocs) {
    const created = await client.createOrReplace(doc)
    console.log(`  ✓ Saved message [${created._id}] - "${created.title}"`)
  }

  console.log('\n=== Step 4: Verification ===')
  const gpCount = await client.fetch<number>(`count(*[_type == "globalPrograms"])`)
  const msgCount = await client.fetch<number>(`count(*[_type == "messages"])`)
  console.log(`Total globalPrograms documents in Sanity: ${gpCount}`)
  console.log(`Total messages documents in Sanity: ${msgCount}`)
  console.log('Migration finished successfully!')
}

run().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
