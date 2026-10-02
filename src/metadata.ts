import type { MergeDay } from './merge-activity';
import type { PullRequest } from './types';
export const BOARD_VIEW_TYPE = 'linear-prs';
export const METADATA_PATH = '.linear-prs/metadata.json';
export type Stage = 'A' | 'B' | 'C' | 'D';
export type StagingAssignment = 'none' | Stage;
export const STAGES: Stage[] = ['A', 'B', 'C', 'D'];
export type Metadata = {
  version: 1;
  reviewTypes: Record<string, StagingAssignment>;
  reviewMessage: string[];
  searchHistory: string[];
  mergeActivity: MergeDay[] | null;
  collapsed: string[];
  selectedRepo: string;
  hidden: string[];
  lastRefresh: string;
  pullRequests: PullRequest[];
};
export type Settings = {
  linearKey: string;
  githubKey: string;
  favoriteReviewers: string;
};
export const DEFAULT_SETTINGS: Settings = {
  linearKey: '',
  githubKey: '',
  favoriteReviewers: '',
};
export const createEmptyMetadata = (): Metadata => ({
  version: 1,
  reviewTypes: {},
  reviewMessage: [],
  searchHistory: [],
  mergeActivity: null,
  collapsed: [],
  selectedRepo: '',
  hidden: [],
  lastRefresh: '',
  pullRequests: [],
});

/** Keep the on-disk keys stable so upgrades preserve existing board assignments. */
export function migrateMetadata(
  saved: Omit<Partial<Metadata>, 'reviewTypes'> & {
    reviewTypes?: Record<string, StagingAssignment | 'review' | 'stamp'>;
  },
): Metadata {
  const { reviewTypes, ...fields } = saved;
  const metadata: Metadata = { ...createEmptyMetadata(), ...fields };
  metadata.reviewTypes = Object.fromEntries(
    Object.entries(reviewTypes ?? {}).map(([id, stage]) => [
      id,
      stage === 'review' ? 'A' : stage === 'stamp' ? 'B' : stage,
    ]),
  );
  metadata.collapsed = metadata.collapsed.map((id) => {
    if (id === 'queue:review') {
      return 'queue:A';
    }
    if (id === 'queue:stamp') {
      return 'queue:B';
    }
    return id;
  });
  return metadata;
}
