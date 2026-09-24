import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { ItemCard, type Item } from "@/components/ItemCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/my-posts")({
  head: () => ({
    meta: [
      { title: "My posts — Campus Lost & Found" },
      {
        name: "description",
        content: "Track the items you reported lost or found and mark them as reunited.",
      },
      { property: "og:title", content: "My posts — Campus Lost & Found" },
      {
        property: "og:description",
        content: "Track the items you reported and mark them as reunited.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyPosts,
});

function MyPosts() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-items"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: rows, error } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", auth.user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return rows as Item[];
    },
  });

  async function toggle(item: Item) {
    const next = item.status === "open" ? "resolved" : "open";
    const { error } = await supabase.from("items").update({ status: next }).eq("id", item.id);
    if (error) {
      toast.error("Could not update the post");
      return;
    }
    toast.success(next === "resolved" ? "Marked as reunited" : "Reopened");
    queryClient.invalidateQueries({ queryKey: ["my-items"] });
    queryClient.invalidateQueries({ queryKey: ["items"] });
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold">My posts</h1>
        {isLoading ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : (data ?? []).length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed p-12 text-center">
            <p className="text-sm text-muted-foreground">You haven&apos;t posted anything yet.</p>
            <Button asChild className="mt-4">
              <Link to="/report">Post an item</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((item) => (
              <div key={item.id} className="space-y-2">
                <ItemCard item={item} />
                <Button variant="outline" size="sm" className="w-full" onClick={() => toggle(item)}>
                  {item.status === "open" ? "Mark as reunited" : "Reopen post"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
