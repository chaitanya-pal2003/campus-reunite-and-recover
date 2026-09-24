import { Link } from "@tanstack/react-router";
import { MapPin, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ItemPhoto } from "@/components/ItemPhoto";
import type { Tables } from "@/integrations/supabase/types";

export type Item = Tables<"items">;

export function formatWhen(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ItemCard({ item }: { item: Item }) {
  return (
    <Link
      to="/items/$itemId"
      params={{ itemId: item.id }}
      className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <ItemPhoto path={item.image_url} alt={item.title} className="h-40 w-full" />
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <Badge variant={item.kind === "lost" ? "destructive" : "default"}>
            {item.kind === "lost" ? "Lost" : "Found"}
          </Badge>
          {item.status === "resolved" && <Badge variant="secondary">Reunited</Badge>}
          <span className="text-xs text-muted-foreground capitalize">{item.category}</span>
        </div>
        <h3 className="line-clamp-1 font-semibold tracking-tight">{item.title}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
          {item.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" /> {item.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" /> {formatWhen(item.occurred_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}
