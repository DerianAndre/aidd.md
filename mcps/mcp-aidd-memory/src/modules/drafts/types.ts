// ---------------------------------------------------------------------------
// Draft content types
// ---------------------------------------------------------------------------

export type DraftCategory = 'rules' | 'knowledge' | 'skills' | 'workflows';
export type DraftStatus = 'pending' | 'approved' | 'rejected';

export interface DraftEntry {
  id: string;
  category: DraftCategory;
  title: string;
  filename: string;
  confidence: number;
  source: 'evolution' | 'manual';
  evolutionCandidateId?: string;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedReason?: string;
}

export interface DraftManifest {
  drafts: DraftEntry[];
  updatedAt: string;
}
