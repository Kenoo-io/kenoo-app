import { Suspense } from "react";

import { GoogleAdsAccessApplicationPacket } from "@/components/console/google-ads-access/application-packet";
import { GOOGLE_ADS_ACCESS_DOC_TITLE } from "@/lib/google-ads-access-application";

export const metadata = {
  title: GOOGLE_ADS_ACCESS_DOC_TITLE,
};

export default function GoogleAdsAccessPage() {
  return (
    <Suspense>
      <GoogleAdsAccessApplicationPacket />
    </Suspense>
  );
}
