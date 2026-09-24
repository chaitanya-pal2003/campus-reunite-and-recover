import { useQuery } from "@tanstack/react-query";
import { ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function useSignedPhoto(path: string | null) {
  return useQuery({
    queryKey: ["photo", path],
    enabled: !!path,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("item-photos")
        .createSignedUrl(path as string, 3600);
      if (error) return null;
      return data.signedUrl;
    },
  });
}

export function ItemPhoto({
  path,
  alt,
  className = "",
}: {
  path: string | null;
  alt: string;
  className?: string;
}) {
  const { data: url } = useSignedPhoto(path);

  if (!path || !url) {
    return (
      <div
        className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}
      >
        <ImageOff className="size-6" />
      </div>
    );
  }
  return <img src={url} alt={alt} className={`object-cover ${className}`} loading="lazy" />;
}
