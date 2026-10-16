import { getCliClient } from 'sanity/cli'

const client = getCliClient({ apiVersion: '2026-02-01' })

async function seedMediaItems() {
  console.log('Fetching programmes to create Media section entries...')
  const programmes = await client.fetch<Array<{
    _id: string
    title: string
    slug?: { current?: string }
    image?: any
    videoFile?: any
    tagline?: string
  }>>(`*[_type == "programme"] | order(_createdAt asc){
    _id,
    title,
    slug,
    image,
    videoFile,
    tagline
  }`)

  console.log(`Found ${programmes.length} programmes.`)

  const existingMedia = await client.fetch<Array<{ _id: string; title: string }>>(
    `*[_type == "mediaItem"]{ _id, title }`
  )
  console.log(`Found ${existingMedia.length} existing media items.`)

  let order = 1
  for (const prog of programmes) {
    const exists = existingMedia.some((m) =>
      m.title.toLowerCase().trim() === prog.title.toLowerCase().trim()
    )

    if (exists) {
      console.log(`[SKIP] Media item already exists for "${prog.title}"`)
      continue
    }

    console.log(`Creating Media item for "${prog.title}"...`)
    await client.create({
      _type: 'mediaItem',
      title: prog.title,
      slug: prog.slug || { _type: 'slug', current: prog.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') },
      mediaType: 'video',
      section: 'PROMO',
      caption: prog.tagline || '',
      ...(prog.image ? { image: prog.image } : {}),
      ...(prog.videoFile ? { videoFile: prog.videoFile } : {}),
      programmeRef: {
        _type: 'reference',
        _ref: prog._id,
      },
      order: order++,
    })
    console.log(` Created Media item for "${prog.title}"!`)
  }

  console.log('=== Media Items Setup Complete ===')
}

seedMediaItems().catch(console.error)
