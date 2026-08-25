export type PlatformAccountType = "personal" | "organization";

export type PlatformAccount = {
  id: string;
  name: string;
  accountType: PlatformAccountType;
  iconUrl: string | null;
  role: string;
  isDefault: boolean;
  hasAppAccess: boolean;
};

export type PlatformAccountMember = {
  id: string;
  userId: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarUrl: string | null;
};
