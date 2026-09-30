export type ImageUploadTarget =
  | { kind: "user-avatar" }
  | { kind: "organization-icon"; organizationId: string }
  | { kind: "branding-logo"; accountId: string; variant: "dark" | "light" };

export type UploadImageResult = {
  url: string;
  key: string;
  message: string;
};
