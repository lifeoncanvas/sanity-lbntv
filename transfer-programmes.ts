import fs from 'fs'
import path from 'path'
import { getCliClient } from 'sanity/cli'

const client = getCliClient({ apiVersion: '2026-02-01' })

interface ProgrammeData {
  title: string
  slug: string
  category: string
  schedule: string
  duration: string
  tagline: string
  description: string
  videoUrl: string
  imagePath?: string
  existingId?: string
}

const targetProgrammes: ProgrammeData[] = [
  {
    existingId: 'programme-the-trumpet',
    title: 'THE TRUMPET – VIJAY BANSODE',
    slug: 'the-trumpet-vijay-bansode',
    category: 'TALK SHOWS',
    schedule: 'Tuesday to Friday at 11:00 AM',
    duration: '60 mins',
    tagline: 'Prophetic conversations, truth, and faith.',
    description: 'A morning bouquet To prepare and position the Church for the coming of the Lord by delivering timely, biblically grounded teaching that deepens spiritual understanding, strengthens faith and promotes spiritual growth.',
    videoUrl: '/Videos/THE_TRUMPET_NEW.mp4',
    imagePath: '../lbn_tv/src/assets/images/Trumpet.png',
  },
  {
    existingId: 'programme-timeless-paragon',
    title: 'TIMELESS PARAGON – KIDDIES SHOW',
    slug: 'timeless-paragon-kiddies-show',
    category: 'KIDDIES',
    schedule: 'Saturdays at 10:00 AM',
    duration: '45 mins',
    tagline: 'Empowering children with scripture wisdom.',
    description: 'Timeless Paragon introduces children to the timeless truths of God’s Word through engaging, creative, and entertaining Bible stories that build faith, character, imagination, and a lasting love for Scripture.',
    videoUrl: '/Videos/TIMELESS.mp4',
    imagePath: '../lbn_tv/src/assets/images/timeless_paragon_new.jpg',
  },
  {
    existingId: 'programme-word-at-work',
    title: 'THE WORD AT WORK – STUDIO BROADCAST',
    slug: 'the-word-at-work-studio-broadcast',
    category: 'TALK SHOWS',
    schedule: 'Thursdays at 8:30 PM',
    duration: '60 mins',
    tagline: 'Inspired, equipped, and empowered.',
    description: 'The Word at Work aims to make the Word of God relevant, understandable, and actionable, exploring a different topic in each episode and helping viewers discover how biblical principles can shape their thoughts, decisions, relationships, character, and purpose.',
    videoUrl: '/Videos/TheWordAtWork.mp4',
    imagePath: '../lbn_tv/src/assets/images/TheWordatWork.png',
  },
  {
    existingId: '7bf71629-4b17-4361-a2ae-dee831edf23b',
    title: 'IGNITE SHOW',
    slug: 'ignite-show',
    category: 'TEENS & YOUTH',
    schedule: 'Sundays at 2:00 PM',
    duration: '60 mins',
    tagline: 'We Burn.',
    description: 'Ignite creates a dynamic and engaging platform where young people openly discuss, debate, and share perspectives on relevant issues affecting their lives, while providing a strong spiritual foundation that inspires them to grow in faith, discover their God-given identity and purpose, and make values-driven decisions.',
    videoUrl: '/Videos/Ignite.mp4',
    // Already has image asset in Sanity: image-969a4f63eb49606f7ba12cb2a67b044ee6f063ec-1014x1550-png
  },
  {
    title: 'WHOLENESS WITH DR. PRASHANTI',
    slug: 'wholeness-with-dr-prashanti',
    category: 'HEALTH',
    schedule: 'Tuesdays at 9:30 AM',
    duration: '30 mins',
    tagline: 'Mind. Body. Purpose.',
    description: 'Dr. Prashanti brings a wholistic experience to educate and empower viewers with practical, accessible knowledge about physical health, body awareness, prevention, and emergency response, helping individuals better understand their bodies, recognize warning signs, and make informed decisions about their wellbeing.',
    videoUrl: '/Videos/WHOLENESS.mp4',
    imagePath: '../lbn_tv/src/assets/images/Wholeness (1).png',
  },
  {
    title: 'CRAFTING FAITH',
    slug: 'crafting-faith',
    category: 'TALK SHOWS',
    schedule: 'Wednesdays at 4:00 PM',
    duration: '30 mins',
    tagline: 'Create · Believe · Inspire — faith through art and craft.',
    description: 'Inspiring craft workshops where faith and creativity unite. Create, believe, and inspire through practical artistic projects and scripture insights.',
    videoUrl: '/CRAFTING%20FAITH.mp4',
    imagePath: '../lbn_tv/src/assets/images/Crafting Faith.png',
  },
  {
    title: 'MONEY MATTERS',
    slug: 'money-matters',
    category: 'TALK SHOWS',
    schedule: 'Mondays at 7:00 PM',
    duration: '45 mins',
    tagline: 'Biblical wisdom for financial growth.',
    description: 'Money Matters equips viewers with practical financial knowledge and responsible money-management skills, while providing biblical and spiritual insights that encourage wise stewardship, financial discipline, integrity, and purpose-driven living.',
    videoUrl: '/Videos/MoneyMatters.mp4',
    imagePath: '../lbn_tv/src/assets/images/MoneyMatter.jpeg',
  },
  {
    title: 'TEEVABLAZE',
    slug: 'teevablaze',
    category: 'TEENS & YOUTH',
    schedule: 'Monday to Friday at 11:30 AM',
    duration: '30 mins',
    tagline: 'Igniting the youth with vibrant faith and purpose.',
    description: 'Teevablaze To inspire, equip, and empower teens and young people through the study of Rhapsody TeeVo, helping them understand, embrace, and apply God’s Word in their everyday lives.',
    videoUrl: '/Videos/Teevablaze.mp4',
    imagePath: '../lbn_tv/src/assets/images/TEEVABLAZE .png',
  },
  {
    title: 'VOICE OF PRAISE',
    slug: 'voice-of-praise',
    category: 'WORSHIP',
    schedule: 'Weekly on LBN',
    duration: '30 mins',
    tagline: 'Where worship meets the heart.',
    description: 'Voice of Praise is a platform where praise becomes a lifestyle and worship becomes a deeper understanding of God, exploring important topics that strengthen believers’ of worshiping God.',
    videoUrl: '/Videos/VoiceOfPraise.mp4',
    imagePath: '../lbn_tv/src/assets/images/voice_of_praise.jpg',
  },
  {
    title: 'HEALTHY LIVING',
    slug: 'healthy-living',
    category: 'HEALTH',
    schedule: 'Weekly on LBN',
    duration: '30 mins',
    tagline: 'Faith, wellness, and wholeness.',
    description: 'Healthy Living is a program that educates, inspires, and empowers viewers to adopt healthier lifestyles by providing practical, accessible, and evidence-based guidance on nutrition, physical activity, mental wellbeing, healthy habits, and everyday wellness.',
    videoUrl: '/Videos/HL INTRO.mp4',
    imagePath: '../lbn_tv/src/assets/images/healthy_living.jpg',
  },
  {
    title: 'JUST BELIEVE',
    slug: 'just-believe',
    category: 'TALK SHOWS',
    schedule: 'Weekly on LBN',
    duration: '30 mins',
    tagline: 'Faith that inspires hope and action.',
    description: 'An uplifting programme encouraging viewers to trust God, strengthen their faith, and believe for the possibilities ahead.',
    videoUrl: '/Videos/JustBelieve.mp4',
    imagePath: '../lbn_tv/src/assets/images/Just_believe_banner .png',
  },
]

async function uploadImage(imageRelPath: string) {
  const fullPath = path.resolve(process.cwd(), imageRelPath)
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${fullPath}`)
    return null
  }
  console.log(`Uploading ${path.basename(fullPath)} to Sanity asset library...`)
  const asset = await client.assets.upload('image', fs.createReadStream(fullPath), {
    filename: path.basename(fullPath),
  })
  return {
    _type: 'image',
    asset: {
      _type: 'reference',
      _ref: asset._id,
    },
  }
}

async function run() {
  console.log('=== Step 1: Comparing existing Sanity programme records ===')
  const existingDocs = await client.fetch<Array<{ _id: string; title: string; category?: string; image?: any }>>(
    `*[_type == "programme"]{ _id, title, category, image }`
  )
  console.log(`Found ${existingDocs.length} existing programme(s) in Sanity:`)
  existingDocs.forEach((d) => {
    console.log(` - [${d._id}] "${d.title}" (${d.category || 'No category'}) - Image: ${d.image ? 'YES' : 'NO'}`)
  })

  console.log('\n=== Step 2: Transferring content without deleting or duplicating ===')
  for (const prog of targetProgrammes) {
    if (prog.existingId) {
      console.log(`\nUpdating existing record: ${prog.existingId} (${prog.title})`)
      const patch = client.patch(prog.existingId)
      
      const patchData: Record<string, any> = {
        title: prog.title,
        slug: { _type: 'slug', current: prog.slug },
        category: prog.category,
        schedule: prog.schedule,
        duration: prog.duration,
        tagline: prog.tagline,
        description: prog.description,
        videoUrl: prog.videoUrl,
      }

      if (prog.imagePath) {
        const imageAsset = await uploadImage(prog.imagePath)
        if (imageAsset) {
          patchData.image = imageAsset
        }
      }

      await patch.set(patchData).commit()
      console.log(`Successfully updated [${prog.existingId}]`)
    } else {
      // Check if document with matching title or slug already exists to prevent duplicate creation
      const existingMatch = existingDocs.find(
        (d) => d.title?.toLowerCase().trim() === prog.title.toLowerCase().trim()
      )

      if (existingMatch) {
        console.log(`\nRecord already exists for "${prog.title}" with ID [${existingMatch._id}]. Updating...`)
        const patch = client.patch(existingMatch._id)
        const patchData: Record<string, any> = {
          title: prog.title,
          slug: { _type: 'slug', current: prog.slug },
          category: prog.category,
          schedule: prog.schedule,
          duration: prog.duration,
          tagline: prog.tagline,
          description: prog.description,
          videoUrl: prog.videoUrl,
        }
        if (prog.imagePath && !existingMatch.image) {
          const imageAsset = await uploadImage(prog.imagePath)
          if (imageAsset) patchData.image = imageAsset
        }
        await patch.set(patchData).commit()
        console.log(`Successfully updated existing match [${existingMatch._id}]`)
      } else {
        console.log(`\nCreating new programme record: "${prog.title}"`)
        let imageAsset: any = null
        if (prog.imagePath) {
          imageAsset = await uploadImage(prog.imagePath)
        }

        const newDoc: { _type: string; [key: string]: any } = {
          _type: 'programme',
          title: prog.title,
          slug: { _type: 'slug', current: prog.slug },
          category: prog.category,
          schedule: prog.schedule,
          duration: prog.duration,
          tagline: prog.tagline,
          description: prog.description,
          videoUrl: prog.videoUrl,
          ...(imageAsset ? { image: imageAsset } : {}),
        }

        const created = await client.create(newDoc)
        console.log(`Successfully created new document [${created._id}] for "${prog.title}"`)
      }
    }
  }

  console.log('\n=== Step 3: Verification of final Sanity dataset ===')
  const finalDocs = await client.fetch<Array<{ _id: string; title: string; category: string; image?: any; videoUrl?: string }>>(
    `*[_type == "programme"] | order(_createdAt desc){ _id, title, category, "hasImage": defined(image), videoUrl }`
  )
  console.log(`Total programmes now in Sanity: ${finalDocs.length}`)
  console.table(finalDocs)
}

run().catch((err) => {
  console.error('Transfer script failed:', err)
  process.exit(1)
})
