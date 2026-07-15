"use client";

import * as React from "react";
import { useLoadingCallback } from "react-loading-hook";
import { Loader2, ChevronLeft } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { getSupabaseClient } from "@walls/auth";
import { Button } from "@walls/ui/button";
import { Input } from "@walls/ui/input";
import { Separator } from "@walls/ui/separator";

type InviteSessionType = "invite" | "recovery" | "signup" | "magiclink";

function isInviteSessionType(value: string | null): value is InviteSessionType {
  return (
    value === "invite" ||
    value === "recovery" ||
    value === "signup" ||
    value === "magiclink"
  );
}

export default function CreatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isReady, setIsReady] = React.useState(false);
  const [isBootstrapping, setIsBootstrapping] = React.useState(true);

  React.useEffect(() => {
    const bootstrapInviteSession = async () => {
      const supabase = getSupabaseClient();
      setError(null);

      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const hashType = hashParams.get("type");
      const tokenHash =
        queryParams.get("token_hash") ?? hashParams.get("token_hash");
      const queryType = queryParams.get("type") ?? hashParams.get("type");

      if (accessToken && isInviteSessionType(hashType)) {
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        });

        if (sessionError || !data.session) {
          setError("Invalid or expired invite link. Please ask for a new invite.");
          setIsBootstrapping(false);
          return;
        }

        setIsReady(true);
        window.history.replaceState({}, "", "/create-password");
        setIsBootstrapping(false);
        return;
      }

      if (tokenHash && isInviteSessionType(queryType)) {
        const otpType =
          queryType === "recovery"
            ? "recovery"
            : queryType === "signup"
              ? "signup"
              : queryType === "magiclink"
                ? "magiclink"
                : "invite";

        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });

        if (verifyError || !data.session) {
          setError("Invalid or expired invite link. Please ask for a new invite.");
          setIsBootstrapping(false);
          return;
        }

        setIsReady(true);
        window.history.replaceState({}, "", "/create-password");
        setIsBootstrapping(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setIsReady(true);
        setIsBootstrapping(false);
        return;
      }

      setError("Open the invite link from your email to create your password.");
      setIsBootstrapping(false);
    };

    void bootstrapInviteSession();
  }, []);

  const [handleCreatePassword, isCreating] = useLoadingCallback(async () => {
    try {
      setError(null);
      setSuccess(null);
      const supabase = getSupabaseClient();

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess("Password created! Redirecting to your apps...");

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again.",
      );
    }
  });

  return (
    <div className="flex h-screen bg-walls-white">
      <div className="absolute top-4 right-4 pr-6">
        <Button
          onClick={() => router.push("/login")}
          variant="ghost"
          className="group flex items-center gap-2 text-black hover:bg-transparent hover:text-black transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-black group-hover:-translate-x-1 transition-transform duration-200" />
          <span className="text-black font-light">Back to login</span>
        </Button>
      </div>

      <div className="hidden md:flex w-1/2 relative bg-walls-yellow rounded-r-[150px] items-center justify-center shadow-inner border border-neutral-200/50">
        <Image
          src="https://assets.wallsentertainment.com/logo-variations/black-gradient-indented.png"
          alt="WALLS Logo"
          width={400}
          height={400}
          className="object-contain"
        />
      </div>

      <div className="md:hidden flex justify-center">
        <Separator orientation="horizontal" className="w-full bg-border/50" />
      </div>

      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="text-center max-w-md w-full space-y-8">
          <div className="space-y-2 flex items-center justify-center">
            <Image
              src="https://assets.wallsentertainment.com/logo-variations/black-gradient-indented.png"
              alt="WALLS Logo"
              width={65}
              height={65}
              className="mr-4 mt-2 md:hidden"
            />
            <h1 className="text-6xl font-bold tracking-tight">
              Create Password.
            </h1>
          </div>

          <p className="text-sm font-light text-neutral-500">
            Set a password to access the apps your organization has available.
          </p>

          <div className="space-y-4 w-full">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20 text-green-700 text-sm">
                {success}
              </div>
            )}

            {isBootstrapping ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
              </div>
            ) : isReady ? (
              <>
                <div className="space-y-4">
                  <Input
                    type="password"
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isCreating}
                    className="h-12 bg-walls-white backdrop-blur-md shadow-inner border border-neutral-200/50 transition-all duration-300"
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !isCreating &&
                        password.trim() &&
                        confirmPassword.trim()
                      ) {
                        handleCreatePassword();
                      }
                    }}
                  />
                  <Input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isCreating}
                    className="h-12 bg-walls-white backdrop-blur-md shadow-inner border border-neutral-200/50 transition-all duration-300"
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !isCreating &&
                        password.trim() &&
                        confirmPassword.trim()
                      ) {
                        handleCreatePassword();
                      }
                    }}
                  />
                </div>

                <Button
                  onClick={handleCreatePassword}
                  className="w-full rounded-full font-bold text-xl h-16 bg-walls-yellow/80 hover:bg-walls-yellow/90 text-black transition-all duration-300 shadow-inner border border-neutral-200/50 relative z-10"
                  disabled={
                    isCreating || !password.trim() || !confirmPassword.trim()
                  }
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Create Password"
                  )}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
