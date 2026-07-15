export interface Pitch {
  id: string;
  companyId: string | null;
  companyName: string;
  companyWebsite: string;
  companyLogoUrl: string | null;
  pitchedTo: string;
  personId: string | null;
  sentBy: string;
  agentId: string | null;
  channel: string;
  message: string | null;
  timestamp: string | null;
  createdAt: string | null;
  creatorsCount: number;
  creatorNames: string[];
  creatorProfileNames: string[];
}

export interface PitchFilters {
  searchTerm: string;
  channel: string;
  pitchedBy: string;
  pitchedTo: string;
  company: string;
  creator: string;
}

export interface ImageStates {
  [pitchId: string]: {
    logoFailed: boolean;
  };
}

export type ColumnWidths = {
  company: number;
  pitchedTo: number;
  sentBy: number;
  channel: number;
  creators: number;
  date: number;
  created: number;
};
