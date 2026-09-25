import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { ItemCard, type Item } from "@/components/ItemCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Campus Lost & Found — reunite students with their things" },
      {
        name: "description",
        content:
          "Post lost or found items with photos, places and times. Smart suggestions pair new found posts with open lost reports.",
      },
      { property: "og:title", content: "Campus Lost & Found" },
      {
        property: "og:description",
        content:
          "Post lost or found items with photos, places and times, and get automatic match suggestions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"all" | "lost" | "found">("all");
  const [q, setQ] = useState("");

  const { data: items, isLoading } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Item[];
    },
  });

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return (items ?? []).filter((i) => {
      if (tab !== "all" && i.kind !== tab) return false;
      if (!needle) return true;
      return (
        i.title.toLowerCase().includes(needle) ||
        i.description.toLowerCase().includes(needle) ||
        i.location.toLowerCase().includes(needle) ||
        i.category.toLowerCase().includes(needle) ||
        i.tags.some((t) => t.toLowerCase().includes(needle))
      );
    });
  }, [items, tab, q]);

  const openLost = (items ?? []).filter((i) => i.kind === "lost" && i.status === "open").length;
  const openFound = (items ?? []).filter((i) => i.kind === "found" && i.status === "open").length;
  const reunited = (items ?? []).filter((i) => i.status === "resolved").length;

  return (
    <div className="min-h-screen">
      <AppHeader />

      <section className="bg-campus-hero border-b">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="glass-control inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3 text-primary" /> Auto-suggested matches
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold sm:text-5xl">
            Lost something on campus? Someone probably found it.
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Post what you lost or found with a photo, the place and the time. Every post is compared
            against open reports, so likely matches surface on their own.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to={user ? "/report" : "/auth"}>Post an item</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#feed">Browse the board</a>
            </Button>
          </div>
          <dl className="mt-10 flex flex-wrap gap-8">
            {[
              ["Open lost reports", openLost],
              ["Items waiting to be claimed", openFound],
              ["Reunited", reunited],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                <dd className="font-display text-2xl font-bold">{value as number}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <main id="feed" className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="all">Everything</TabsTrigger>
              <TabsTrigger value="lost">Lost</TabsTrigger>
              <TabsTrigger value="found">Found</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search bottle, library, keys…"
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-surface mt-10 rounded-2xl border border-dashed p-12 text-center">
            <h2 className="text-lg font-semibold">Nothing here yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Be the first to post a lost or found item.
            </p>
            <Button asChild className="mt-4">
              <Link to={user ? "/report" : "/auth"}>Post an item</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
