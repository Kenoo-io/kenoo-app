import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/app/auth/supabaseClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface UserDisplayProps {
  userId: string;
  className?: string;
}

export function UserDisplay({ userId, className = "" }: UserDisplayProps) {
  const [userData, setUserData] = useState<{
    displayName: string;
    photoURL: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("users")
          .select("first_name, last_name, email, avatar_url")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching user data:", error);
          setUserData(null);
          return;
        }

        if (data) {
          const displayName =
            `${data.first_name || ""} ${data.last_name || ""}`.trim() ||
            data.email ||
            "Unknown User";
          setUserData({
            displayName,
            photoURL: data.avatar_url ?? null,
          });
        } else {
          setUserData(null);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Avatar className="h-6 w-6">
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Avatar className="h-6 w-6">
        <AvatarImage src={userData?.photoURL || undefined} />
        <AvatarFallback>
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <span>{userData?.displayName || "Unknown User"}</span>
    </div>
  );
}
