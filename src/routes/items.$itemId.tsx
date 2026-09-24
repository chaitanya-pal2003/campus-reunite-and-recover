import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MapPin, Clock, Sparkles, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { ItemPhoto } from "@/components/ItemPhoto";
import { formatWhen, type Item } from "@/components/ItemCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { matchScore, matchReasons } from "@/lib/similarity";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/items/$itemId")({
  head: () => ({
    meta: [
      { title: "Item details — Campus Lost & Found" },
      {
        name: "description",
        content:
          "See where and when this item was lost or found, plus automatically suggested matching reports.",
      },
      { property: "og:title", content: "Item details — Campus Lost & Found" },
      {
        property: "og:description",
        content: "Where and when this item was lost or found, plus suggested matching reports.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ItemDetail,
});

function ItemDetail() {
  const { itemId } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  const { data: item, isLoading } = useQuery({
    queryKey: ["item", itemId],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*").eq("id", itemId).single();
      if (error) throw error;
      return data as Item;
    },
  });

  const { data: candidates } = useQuery({
    queryKey: ["candidates", item?.kind],
    enabled: !!item,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("kind", item!.kind === "lost" ? "found" : "lost")
        .eq("status", "open")
        .limit(300);
      if (error) throw error;
      return data as Item[];
    },
  });

  const { data: claims } = useQuery({
    queryKey: ["claims", itemId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("*")
        .eq("item_id", itemId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const matches = useMemo(() => {
    if (!item || !candidates) return [];
    return candidates
      .map((c) => ({ item: c, score: matchScore(item, c), reasons: matchReasons(item, c) }))
      .filter((m) => m.score > 0.08)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [item, candidates]);

  async function submitClaim() {
    if (!user) return;
    const { error } = await supabase
      .from("claims")
      .insert({ item_id: itemId, claimant_id: user.id, message });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "You already reached out." : error.message);
      return;
    }
    setMessage("");
    toast.success("Sent. The poster can now see your note.");
    queryClient.invalidateQueries({ queryKey: ["claims", itemId] });
  }

  if (isLoading || !item) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <div className="mx-auto max-w-5xl px-4 py-10">
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const isOwner = user?.id === item.user_id;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to the board
        </Link>

        <div className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="overflow-hidden rounded-2xl border bg-card">
            <ItemPhoto path={item.image_url} alt={item.title} className="h-80 w-full" />
            <div className="space-y-3 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.kind === "lost" ? "destructive" : "default"}>
                  {item.kind === "lost" ? "Lost" : "Found"}
                </Badge>
                {item.status === "resolved" && <Badge variant="secondary">Reunited</Badge>}
                <span className="text-xs capitalize text-muted-foreground">{item.category}</span>
              </div>
              <h1 className="text-2xl font-bold">{item.title}</h1>
              {item.description && <p className="text-muted-foreground">{item.description}</p>}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {item.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-4" /> {item.location}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-4" /> {formatWhen(item.occurred_at)}
                </span>
              </div>
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {item.tags.map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
              {item.contact && (
                <p className="pt-2 text-sm">
                  <span className="text-muted-foreground">Reach out: </span>
                  {item.contact}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-6">
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="size-4 text-primary" /> Possible matches
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.kind === "lost"
                  ? "Found posts that look like your item."
                  : "Open lost reports that look like what you found."}
              </p>

              {matches.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No likely matches yet. We&apos;ll keep comparing as new posts come in.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {matches.map(({ item: m, score, reasons }) => (
                    <li key={m.id}>
                      <Link
                        to="/items/$itemId"
                        params={{ itemId: m.id }}
                        className="flex gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50"
                      >
                        <ItemPhoto
                          path={m.image_url}
                          alt={m.title}
                          className="size-16 shrink-0 rounded-lg"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">{m.title}</p>
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                              {Math.round(score * 100)}%
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {m.location || "Place not given"} · {formatWhen(m.occurred_at)}
                          </p>
                          {reasons.length > 0 && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {reasons.join(" · ")}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border bg-card p-6">
              <h2 className="text-lg font-semibold">
                {isOwner ? "People who reached out" : "This is mine / I have seen it"}
              </h2>
              {isOwner ? (
                (claims ?? []).length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No messages yet.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {(claims ?? []).map((c) => (
                      <li key={c.id} className="rounded-lg border p-3 text-sm">
                        <p>{c.message || "(no note)"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatWhen(c.created_at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )
              ) : user ? (
                <div className="mt-3 space-y-3">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    placeholder="Describe a detail only the owner would know, and how to reach you."
                  />
                  <Button onClick={submitClaim} className="w-full">
                    Send a note to the poster
                  </Button>
                </div>
              ) : (
                <Button asChild className="mt-3 w-full">
                  <Link to="/auth">Sign in to respond</Link>
                </Button>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
