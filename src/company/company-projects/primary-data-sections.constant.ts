/**
 * Primary Data Form – sections are fully dynamic from DB (master_primary_data_checklist).
 * This file only exports types; no hardcoded section list. Run scripts/seed-primary-data-master.js to seed sections.
 */

export type PrimaryDataSectionInfo = {
  info_type: string;
  tab_id: string;
  label: string;
};
