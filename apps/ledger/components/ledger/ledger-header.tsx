"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import UserProfileButton from '@walls/ui/user-profile-button';

const LEDGER_ICON =
  "https://assets.wallsentertainment.com/walls-app-icons/ledger.svg";

export function LedgerHeader() {
  const pathname = usePathname();
  const isForecast = pathname === "/forecast";
  const isRecipients = pathname.startsWith("/recipients");
  const isTransactions = pathname === "/transactions";
  const isInvoices = pathname.startsWith("/invoices");

  const pageLabel = isForecast
    ? "Forecast"
    : isRecipients
    ? "Recipients"
    : isTransactions
    ? "Transactions"
    : isInvoices
    ? "Invoices"
    : "Overview";

  return (
    <div className="w-full bg-transparent h-20 py-4 px-5 flex items-center justify-between gap-4">
      {/* Left: label + icon */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Image
          src={LEDGER_ICON}
          alt="Ledger"
          width={20}
          height={20}
          className="h-5 w-5 flex-shrink-0"
        />
        <span className="text-sm md:text-base font-light uppercase tracking-wider text-neutral-800">
          {pageLabel}
        </span>
      </div>

      {/* Right: user profile */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <UserProfileButton />
      </div>
    </div>
  );
}
