export interface DealTalentItem {
  id: string;
  name: string;
  avatar_url?: string;
}

export interface DealContactItem {
  id: string;
  name: string;
  first_name?: string;
  avatar_url?: string;
}

export interface Deal {
  id: string;
  dealName: string;
  company: string;
  companyId?: string;
  /** Deal owner (user) – for Deal owner column */
  dealOwner: string;
  dealOwnerProfilePicture?: string;
  amount: number;
  /** Pre-formatted display string for the Value column, currency-aware (e.g. "€50K MRR + $10,000") */
  amountDisplay: string;
  /** When billing is recurring and there is no recurrence count: " MRR" | " ARR" | " WRR" | " BWRR" | " QRR" for Value column suffix; undefined otherwise */
  valueLabel?: string;
  /** When deal has both MRR (recurring no count) and VALUE (one-off or recurring with count), these are set for "X MRR + Y" display */
  mrrAmount?: number;
  valueAmount?: number;
  recurrence: string;
  submissionDueDate: string;
  conceptSubmissionDate: string;
  payoutDate: string;
  /** @deprecated use dealOwner for display */
  creator: string;
  creatorProfilePicture?: string;
  companyWebsite?: string;
  companyLogo?: string;
  createdAt?: Date | string | number | { seconds: number; nanoseconds: number };
  stage: string;
  stageData?: {
    is_won: boolean;
    is_lost: boolean;
    index_order: number;
  };
  pipeline?: string;
  deliverables?: Array<{ type: string; quantity: number }>;
  /** Talent linked to the deal (from deal_talent); used for Talent column and sticky button avatars */
  talent?: DealTalentItem[];
  /** Contacts from deal_contacts (people); used for Contacts column only */
  contacts?: DealContactItem[];
  /** Raw deal_stage_id (used by the kanban view to group cards into columns and persist stage moves) */
  dealStageId?: string;
}

export interface Filters {
  status: string;
  stage: string;
  owner: string;
  searchTerm: string;
  amountRange: string;
}

export interface ImageStates {
  [dealId: string]: {
    companyFailed: boolean;
  };
}

