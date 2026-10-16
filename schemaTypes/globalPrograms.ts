import { defineField, defineType } from 'sanity'

export const globalPrograms = defineType({
  name: 'globalPrograms',
  title: 'Global Programmes',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'badge',
      title: 'Badge / Status',
      type: 'string',
      initialValue: 'LIVE BROADCAST',
      description: 'e.g. LIVE BROADCAST, UPCOMING, SPECIAL EVENT',
    }),
    defineField({
      name: 'image',
      title: 'Banner Image',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'broadcastDate',
      title: 'Broadcast Date / Schedule',
      type: 'string',
      description: 'e.g. October 2026 or specific date',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'linkUrl',
      title: 'Watch URL / External Link',
      type: 'url',
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      initialValue: 0,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'badge',
      media: 'image',
    },
  },
})