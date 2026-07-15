export const emptyVendorInfo = {
  legal_name: "",
  city: "",
  state: "",
  country: "",
  address: "",
  post_code: "",
  vendor_email: "",
};

export type VendorBillingInfo = typeof emptyVendorInfo;

export function isVendorInfoComplete(v: {
  legal_name?: string;
  vendor_email?: string;
  address?: string;
  city?: string;
  state?: string;
  post_code?: string;
  country?: string;
}) {
  const s = (x: unknown) => String(x ?? "").trim();
  return (
    !!s(v.legal_name) &&
    !!s(v.vendor_email) &&
    !!s(v.address) &&
    !!s(v.city) &&
    !!s(v.state) &&
    !!s(v.post_code) &&
    !!s(v.country)
  );
}
