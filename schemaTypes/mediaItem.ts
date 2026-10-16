import { defineField, defineType } from 'sanity'

export const mediaItem = defineType({
  name: 'mediaItem',
  title: 'Media',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title / Label',
      type: 'string',
      validation: (Rule) => Rule.required(),
      description: 'Name of the photo, video clip, or promo',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
    }),
    defineField({
      name: 'mediaType',
      title: 'Media Type',
      type: 'string',
      options: {
        list: [
          { title: 'Video (Promo / Clip / Loop)', value: 'video' },
          { title: 'Photo / Banner / Graphic', value: 'image' },
        ],
        layout: 'radio',
      },
      initialValue: 'video',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'section',
      title: 'Placement / Section',
      type: 'string',
      options: {
        list: [
          { title: 'Network Promo / Background Video', value: 'PROMO' },
          { title: 'Image & Video Gallery', value: 'GALLERY' },
          { title: 'Hero / Banner', value: 'BANNER' },
          { title: 'VOD Showcase', value: 'VOD' },
          { title: 'General Media', value: 'GENERAL' },
        ],
      },
      initialValue: 'PROMO',
    }),
    defineField({
      name: 'videoFile',
      title: 'Video File (MP4 / WebM)',
      type: 'file',
      options: {
        accept: 'video/*',
      },
      description: 'Upload video file directly to Sanity Content Lake',
      hidden: ({ parent }) => parent?.mediaType === 'image',
    }),
    defineField({
      name: 'externalVideoUrl',
      title: 'External Video URL (Fallback / Stream)',
      type: 'string',
      description: 'Alternative direct video link or YouTube/Vimeo URL',
      hidden: ({ parent }) => parent?.mediaType === 'image',
    }),
    defineField({
      name: 'image',
      title: 'Photo / Poster / Cover',
      type: 'image',
      options: {
        hotspot: true,
      },
      description: 'Upload image asset directly to Sanity',
    }),
    defineField({
      name: 'caption',
      title: 'Caption / Description',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'programmeRef',
      title: 'Associated Programme (Optional)',
      type: 'reference',
      to: [{ type: 'programme' }],
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
      mediaType: 'mediaType',
      section: 'section',
      image: 'image',
    },
    prepare({ title, mediaType, section, image }) {
      return {
        title: title || 'Untitled Media',
        subtitle: `${(mediaType || 'media').toUpperCase()} • ${section || 'GENERAL'}`,
        media: image,
      }
    },
  },
})
