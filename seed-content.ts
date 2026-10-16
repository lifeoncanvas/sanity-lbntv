import fs from 'fs'
import path from 'path'
import { getCliClient } from 'sanity/cli'

const client = getCliClient({ apiVersion: '2026-02-01' })

const sampleProgrammes = [
  {
    _type: 'programme',
    _id: 'programme-the-trumpet',
    title: 'THE TRUMPET – DEACON VIJAY BANSODE',
    slug: { _type: 'slug', current: 'the-trumpet-deacon-vijay-bansode' },
    category: 'TALK SHOWS',
    schedule: 'Tuesday to Friday at 11:00 AM',
    duration: '60 mins',
    tagline: 'Prophetic conversations, truth, and faith.',
    description: 'Inspiring insights and prophetic conversations on faith, ministry, and current events hosted by Deacon Vijay Bansode with anointed guest speakers.',
    videoUrl: '/Videos/THE_TRUMPET_NEW.mp4',
    imagePath: '../lbn_tv/src/assets/images/Trumpet.png',
  },
  {
    _type: 'programme',
    _id: 'programme-timeless-paragon',
    title: 'TIMELESS PARAGON – KIDS SHOW',
    slug: { _type: 'slug', current: 'timeless-paragon-kids-show' },
    category: 'KIDS',
    schedule: 'Saturdays at 10:00 AM',
    duration: '45 mins',
    tagline: 'Empowering children with scripture wisdom.',
    description: 'Fun, engaging studio episodes empowering children with scripture wisdom, character-building stories, and timeless faith values for growing minds.',
    videoUrl: '/Videos/TIMELESS.mp4',
    imagePath: '../lbn_tv/src/assets/images/timeless_paragon.jpg',
  },
  {
    _type: 'programme',
    _id: 'programme-word-at-work',
    title: 'WORD AT WORK – STUDIO BROADCAST',
    slug: { _type: 'slug', current: 'word-at-work-studio-broadcast' },
    category: 'TALK SHOWS',
    schedule: 'Thursdays at 8:30 PM',
    duration: '60 mins',
    tagline: 'Inspired, equipped, and empowered.',
    description: 'Panel discussions exploring God’s Word in action, equipping believers with practical application of biblical truths and life-transforming revelations.',
    videoUrl: '/Videos/TheWordAtWork.mp4',
    imagePath: '../lbn_tv/src/assets/images/Word at work.png',
  },
  {
    _type: 'programme',
    _id: 'programme-wholeness',
    title: 'WHOLENESS WITH DR. PRASHANTI',
    slug: { _type: 'slug', current: 'wholeness-with-dr-prashanti' },
    category: 'HEALTH',
    schedule: 'Tuesdays at 9:30 AM',
    duration: '30 mins',
    tagline: 'Mind. Body. Purpose.',
    description: 'Inspiring health, wellness, and divine vitality from a faith-filled perspective with Dr. Prashanti, equipping you to live in wholeness across mind, body, and purpose.',
    imagePath: '../lbn_tv/src/assets/images/Wholeness (1).png',
  },
  {
    _type: 'programme',
    _id: 'programme-pray-with-me',
    title: 'PRAY WITH ME – GLOBAL INTERCESSION',
    slug: { _type: 'slug', current: 'pray-with-me-global-intercession' },
    category: 'PRAYER',
    schedule: 'Thursdays at 12:00 PM',
    duration: '30 mins',
    tagline: 'Fervent prayer shaking the nations.',
    description: 'Lifting nations, families, and churches in fervent prayer and spiritual intercession across the globe alongside devoted prayer leaders.',
    imagePath: '../lbn_tv/src/assets/images/pray_with_me.jpg',
  },
  {
    _type: 'programme',
    _id: 'programme-ignite-show',
    title: 'IGNITE SHOW',
    slug: { _type: 'slug', current: 'ignite-show' },
    category: 'TEENS & YOUTH',
    schedule: 'Sundays at 3:00 PM',
    duration: '60 mins',
    tagline: 'We Burn.',
    description: 'Ignite explores the real-life intersection of culture, lifestyle, and faith. Engaging discussions, young panels, and inspiring stories show how faith lights the way through life’s trials.',
    videoUrl: '/Videos/Ignite.mp4',
    imagePath: '../lbn_tv/src/assets/images/YOUTHIgnite.png',
  },
  {
    _type: 'programme',
    _id: 'programme-crafting-faith',
    title: 'CRAFTING FAITH',
    slug: { _type: 'slug', current: 'crafting-faith' },
    category: 'TALK SHOWS',
    schedule: 'Wednesdays at 4:00 PM',
    duration: '30 mins',
    tagline: 'Create · Believe · Inspire — faith through art and craft.',
    description: 'Inspiring craft workshops where faith and creativity unite. Create, believe, and inspire through practical artistic projects and scripture insights.',
    imagePath: '../lbn_tv/src/assets/images/Crafting Faith.png',
  },
  {
    _type: 'programme',
    _id: 'programme-money-matters',
    title: 'MONEY MATTERS',
    slug: { _type: 'slug', current: 'money-matters' },
    category: 'TALK SHOWS',
    schedule: 'Mondays at 7:00 PM',
    duration: '45 mins',
    tagline: 'Biblical wisdom for financial growth.',
    description: 'Practical insights and spiritual guidance on stewardship, financial intelligence, and prosperity according to biblical principles.',
    imagePath: '../lbn_tv/src/assets/images/MONEY MATTERS (1).png',
  },
  {
    _type: 'programme',
    _id: 'programme-teev-blaze',
    title: 'TEEV-BLAZE',
    slug: { _type: 'slug', current: 'teev-blaze' },
    category: 'TEENS & YOUTH',
    schedule: 'Monday to Friday at 11:30 AM',
    duration: '30 mins',
    tagline: 'Igniting the youth with vibrant faith and purpose.',
    description: 'An electrifying youth-centric broadcast celebrating youth culture, energetic discussions, faith testimonies, and talent for teens and young adults.',
    imagePath: '../lbn_tv/src/assets/images/TEEVABLAZE (1).png',
  },
]

async function seed() {
  console.log('Seeding sample programmes to Sanity Content Lake...')
  const transaction = client.transaction()
  
  for (const item of sampleProgrammes) {
    let imageAsset = undefined
    if (item.imagePath) {
      const fullPath = path.resolve(__dirname, item.imagePath)
      if (fs.existsSync(fullPath)) {
        console.log(`Uploading image for ${item.title}...`)
        const asset = await client.assets.upload('image', fs.createReadStream(fullPath), {
          filename: path.basename(fullPath),
        })
        imageAsset = {
          _type: 'image',
          asset: {
            _type: 'reference',
            _ref: asset._id,
          },
        }
      } else {
        console.warn(`Image file not found: ${fullPath}`)
      }
    }

    const doc = {
      _type: 'programme',
      _id: item._id,
      title: item.title,
      slug: item.slug,
      category: item.category,
      schedule: item.schedule,
      duration: item.duration,
      tagline: item.tagline,
      description: item.description,
      ...(item.videoUrl ? { videoUrl: item.videoUrl } : {}),
      ...(imageAsset ? { image: imageAsset } : {}),
    }

    transaction.createOrReplace(doc)
  }

  await transaction.commit()
  console.log('Successfully seeded all 9 sample programmes!')
}

seed().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
})

