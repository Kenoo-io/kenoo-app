export interface EmailSequence {
  id: string;
  name: string;
  description: string | null;
  status: string;
  use_case?: string | null;
  sequence_owner: string;
  owner_avatar_url: string | null;
  contact_count: number;
  active_count: number;
  paused_count: number;
  complete_count: number;
  replied_count: number;
  created_at: string | null;
  talent?: Array<{
    id: string;
    avatar_url: string | null;
  }>;
}

export interface Filters {
  status: string;
  is_campaign: string;
  searchTerm: string;
  talent: string;
  owner: string;
  use_case: string;
}

export type ColumnWidths = {
  name: number;
  createdBy: number;
  pitching: number;
  contacts: number;
  active: number;
  paused: number;
  complete: number;
  replied: number;
};

