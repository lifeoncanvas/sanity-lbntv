import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

import {ScheduleExcelImporter, ExcelIcon} from './tools/ScheduleExcelImporter'

export default defineConfig({
  name: 'default',
  title: 'LIBN TV',

  projectId: 'h44j4cf5',
  dataset: 'production',

  plugins: [structureTool(), visionTool()],

  tools: (prev) => [
    ...prev,
    {
      name: 'excel-schedule-sync',
      title: 'Excel Schedule Sync',
      icon: ExcelIcon,
      component: ScheduleExcelImporter,
    },
  ],

  schema: {
    types: schemaTypes,
  },
})
