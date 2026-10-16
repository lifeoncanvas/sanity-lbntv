import { defineArrayMember, defineField, defineType } from 'sanity'

export const programme = defineType({
  name: 'programme',
  title: 'Programme',
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
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Talk Shows', value: 'TALK SHOWS' },
          { title: 'Prayer', value: 'PRAYER' },
          { title: 'Health', value: 'HEALTH' },
          { title: 'Teens & Youth', value: 'TEENS & YOUTH' },
          { title: 'Kiddies', value: 'KIDDIES' },
          { title: 'Kids', value: 'KIDS' },
          { title: 'Worship', value: 'WORSHIP' },
        ],
      },
    }),
    defineField({
      name: 'image',
      title: 'Cover Image',
      type: 'image',
      options: { hotspot: true },
      description: 'Upload banner or poster image directly to Sanity',
    }),
    defineField({
      name: 'videoFile',
      title: 'Promo Video (File Upload)',
      type: 'file',
      options: {
        accept: 'video/*',
      },
      description: 'Upload an MP4 or WebM video file directly to Sanity Content Lake',
    }),
    defineField({
      name: 'videoUrl',
      title: 'Video URL / Fallback Path',
      type: 'string',
      description: 'External video URL or local path (used if no video file is uploaded)',
    }),
    defineField({
      name: 'schedule',
      title: 'Schedule',
      type: 'string',
      description: 'e.g. Tuesday to Friday at 11:00 AM',
    }),
    defineField({
      name: 'duration',
      title: 'Duration',
      type: 'string',
      description: 'e.g. 60 mins',
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
    defineField({
      name: 'body',
      title: 'Detailed Content',
      type: 'array',
      of: [defineArrayMember({ type: 'block' }), defineArrayMember({ type: 'image' })],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'category',
      media: 'image',
    },
  },
})
