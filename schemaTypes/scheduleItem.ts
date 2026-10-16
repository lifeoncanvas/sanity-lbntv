import { defineField, defineType } from 'sanity'

export const scheduleItem = defineType({
  name: 'scheduleItem',
  title: 'EPG Schedule Item',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'day',
      title: 'Day of Week',
      type: 'string',
      options: {
        list: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'time',
      title: 'Air Time',
      type: 'string',
      description: 'e.g. 06:00 AM or 08:30 PM',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Sequence Order',
      type: 'number',
      description: 'Sequence position within the daily schedule (0, 1, 2, ...)',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'startMinutes',
      title: 'Start Minutes',
      type: 'number',
      description: 'Normalized minutes from midnight for chronological time-slot sorting (0–1439)',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Worship', value: 'WORSHIP' },
          { title: 'Teaching', value: 'TEACHING' },
          { title: 'Healing', value: 'HEALING' },
          { title: 'Teens & Youths', value: 'TEENS & YOUTHS' },
          { title: 'Kiddies', value: 'KIDDIES' },
          { title: 'ROR', value: 'ROR' },
          { title: 'Talk Shows', value: 'TALK SHOWS' },
          { title: 'Prayer', value: 'PRAYER' },
          { title: 'Specials', value: 'SPECIALS' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'duration',
      title: 'Duration',
      type: 'string',
      description: 'e.g. 30m, 60m, 120m, 240m',
    }),
    defineField({
      name: 'host',
      title: 'Host / Presenter',
      type: 'string',
      description: 'e.g. Pastor Chris, LBN, Healing School, Vijay Bansode',
    }),
    defineField({
      name: 'live',
      title: 'Is Live Broadcast',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'image',
      title: 'Broadcast Image',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'programmeRef',
      title: 'Linked Programme',
      type: 'reference',
      to: [{ type: 'programme' }],
      description: 'Optional reference to full Programme document in Sanity',
    }),
  ],
  orderings: [
    {
      title: 'Daily Sequence Order',
      name: 'dayOrderAsc',
      by: [
        { field: 'day', direction: 'asc' },
        { field: 'order', direction: 'asc' },
      ],
    },
    {
      title: 'Air Time',
      name: 'startMinutesAsc',
      by: [
        { field: 'day', direction: 'asc' },
        { field: 'startMinutes', direction: 'asc' },
      ],
    },
  ],
  preview: {
    select: {
      title: 'title',
      day: 'day',
      time: 'time',
      category: 'category',
      order: 'order',
      live: 'live',
      media: 'image',
    },
    prepare({ title, day, time, category, order, live, media }) {
      const liveBadge = live ? '🔴 LIVE · ' : ''
      const seq = order != null ? `#${order + 1} ` : ''
      return {
        title: `${seq}${title}`,
        subtitle: `${day} @ ${time} · [${category || 'SPECIALS'}] · ${liveBadge}`,
        media,
      }
    },
  },
})
