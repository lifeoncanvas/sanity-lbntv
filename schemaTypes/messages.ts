import { defineField, defineType } from 'sanity'

export const messages = defineType({
  name: 'messages',
  title: 'Messages',
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
      title: 'Badge',
      type: 'string',
      options: {
        list: [
          { title: 'Message of the Month', value: 'MESSAGE OF THE MONTH' },
          { title: 'Message of the Year', value: 'MESSAGE OF THE YEAR' },
          { title: 'Featured Message', value: 'FEATURED MESSAGE' },
          { title: 'Special Message', value: 'SPECIAL MESSAGE' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Banner Image',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'objectPosition',
      title: 'Image Alignment (CSS Object Position)',
      type: 'string',
      initialValue: 'center center',
      description: 'e.g. center center, center 58%, top center',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'videoFile',
      title: 'Video File (Upload to Sanity)',
      type: 'file',
      options: { accept: 'video/*' },
      description: 'Upload video file directly to Sanity Content Lake',
    }),
    defineField({
      name: 'videoUrl',
      title: 'Video / Watch URL (External Fallback)',
      type: 'string',
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