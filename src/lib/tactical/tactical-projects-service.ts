/**
 * Service facade for tactical project persistence and import/export operations.
 * Isolates UI components from direct DB module imports.
 */
export type { TacticalProjectSummary } from '@/lib/db/tactical-projects-db';
export {
  createNewTacticalProject,
  deleteTacticalProject,
  deleteTacticalProjects,
  duplicateTacticalProject,
  exportTacticalProjectsAsZip,
  exportTacticalProjectToJson,
  getMatchForTacticalProject,
  getTacticalProjectById,
  importMultipleTacticalProjects,
  importTacticalProjectFromJson,
  listTacticalProjects,
  renameTacticalProject,
  saveTacticalProject,
} from '@/lib/db/tactical-projects-db';
