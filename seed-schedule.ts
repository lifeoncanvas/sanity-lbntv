import { getCliClient } from 'sanity/cli'

const client = getCliClient({ apiVersion: '2026-02-01' })

const sampleSchedules = [
  {
    _type: 'scheduleItem',
    _id: 'schedule-mon-0700',
    title: 'THE TRUMPET LIVE',
    day: 'Monday',
    time: '07:00 AM',
    category: 'TALK SHOWS',
    duration: '240m',
    host: 'Deacon Vijay Bansode',
    live: true,
  },
  {
    _type: 'scheduleItem',
    _id: 'schedule-mon-1130',
    title: 'TEEVABLAZE',
    day: 'Monday',
    time: '11:30 AM',
    category: 'TEENS & KIDS',
    duration: '30m',
    host: 'LBN Youth',
    live: true,
  },
  {
    _type: 'scheduleItem',
    _id: 'schedule-mon-1200',
    title: 'Pray With Me',
    day: 'Monday',
    time: '12:00 PM',
    category: 'WORSHIP',
    duration: '30m',
    host: 'LBN Prayer Team',
    live: true,
  },
  {
    _type: 'scheduleItem',
    _id: 'schedule-fri-1000',
    title: 'TIMELESS PARAGON',
    day: 'Friday',
    time: '10:00 AM',
    category: 'TEENS & KIDS',
    duration: '45m',
    host: 'LBN Kids',
    live: false,
  },
]

async function seed() {
  console.log('Seeding sample schedule items to Sanity...')
  const transaction = client.transaction()
  for (const item of sampleSchedules) {
    transaction.createOrReplace(item)
  }
  await transaction.commit()
  console.log('Successfully seeded schedule items!')
}

seed().catch((err) => {
  console.error('Seeding schedule failed:', err)
  process.exit(1)
})
