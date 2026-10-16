import fs from 'fs'
import path from 'path'
import { getCliClient } from 'sanity/cli'

const client = getCliClient({ apiVersion: '2026-02-01' })

interface VideoMapping {
  titleMatcher: string
  relativeVideoPath: string
  knownAssetId?: string
}

const mappings: VideoMapping[] = [
  {
    titleMatcher: 'TEEVABLAZE',
    relativeVideoPath: '../lbn_tv/public/Videos/Teevablaze.mp4',
    knownAssetId: 'file-d20d0dc5bc328412314b5935a54f32cad32184d9-mp4',
  },
  {
    titleMatcher: 'IGNITE',
    relativeVideoPath: '../lbn_tv/public/Videos/Ignite.mp4',
  },
  {
    titleMatcher: 'TIMELESS',
    relativeVideoPath: '../lbn_tv/public/Videos/TIMELESS.mp4',
  },
  {
    titleMatcher: 'WHOLENESS',
    relativeVideoPath: '../lbn_tv/public/Videos/WHOLENESS.mp4',
  },
  {
    titleMatcher: 'HEALTHY LIVING',
    relativeVideoPath: '../lbn_tv/public/Videos/HL INTRO.mp4',
  },
  {
    titleMatcher: 'CRAFTING FAITH',
    relativeVideoPath: '../lbn_tv/public/CRAFTING FAITH.mp4',
  },
  {
    titleMatcher: 'MONEY MATTERS',
    relativeVideoPath: '../lbn_tv/public/Videos/MoneyMatters.mp4',
  },
  {
    titleMatcher: 'JUST BELIEVE',
    relativeVideoPath: '../lbn_tv/public/Videos/JustBelieve.mp4',
  },
  {
    titleMatcher: 'THE WORD AT WORK',
    relativeVideoPath: '../lbn_tv/public/Videos/TheWordAtWork.mp4',
  },
  {
    titleMatcher: 'THE TRUMPET',
    relativeVideoPath: '../lbn_tv/public/Videos/THE_TRUMPET_NEW.mp4',
  },
  {
    titleMatcher: 'VOICE OF PRAISE',
    relativeVideoPath: '../lbn_tv/public/Videos/VoiceOfPraise.mp4',
  },
]

async function run() {
  console.log('=== Fetching programmes from Sanity Content Lake ===')
  const docs = await client.fetch<Array<{ _id: string; title: string; videoFile?: any }>>(
    `*[_type == "programme"]{ _id, title, videoFile }`
  )
  console.log(`Found ${docs.length} programmes in Sanity.`)

  for (const mapping of mappings) {
    const doc = docs.find((d) =>
      d.title.toUpperCase().includes(mapping.titleMatcher.toUpperCase())
    )

    if (!doc) {
      console.warn(`[SKIP] No programme document matching "${mapping.titleMatcher}"`)
      continue
    }

    if (doc.videoFile?.asset?._ref) {
      console.log(`[ALREADY SET] "${doc.title}" has videoFile asset: ${doc.videoFile.asset._ref}`)
      continue
    }

    let assetRef = mapping.knownAssetId

    if (!assetRef) {
      const fullPath = path.resolve(process.cwd(), mapping.relativeVideoPath)
      if (!fs.existsSync(fullPath)) {
        console.warn(`[NOT FOUND] File not found: ${fullPath}`)
        continue
      }

      const stat = fs.statSync(fullPath)
      const sizeMb = (stat.size / (1024 * 1024)).toFixed(1)
      console.log(`\nUploading "${path.basename(fullPath)}" (${sizeMb} MB) for "${doc.title}"...`)

      try {
        const uploaded = await client.assets.upload('file', fs.createReadStream(fullPath), {
          filename: path.basename(fullPath),
          contentType: 'video/mp4',
        })
        assetRef = uploaded._id
        console.log(` Uploaded asset ID: ${uploaded._id}`)
      } catch (err: any) {
        console.error(` Upload failed for "${doc.title}":`, err?.message || err)
        continue
      }
    }

    if (assetRef) {
      console.log(`Patching programme [${doc._id}] "${doc.title}" with videoFile asset...`)
      await client
        .patch(doc._id)
        .set({
          videoFile: {
            _type: 'file',
            asset: {
              _type: 'reference',
              _ref: assetRef,
            },
          },
        })
        .commit()
      console.log(` Successfully attached video to "${doc.title}"!`)
    }
  }

  console.log('\n=== Upload & Linking Complete ===')
}

run().catch(console.error)
