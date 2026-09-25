import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORIES, CAMPUS_PLACES } from "@/lib/categories";

export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({
    meta: [
      { title: "Post a lost or found item — Campus Lost & Found" },
      {
        name: "description",
        content:
          "Describe the item, add a photo, the place and the time. Matching reports are suggested straight away.",
      },
      { property: "og:title", content: "Post a lost or found item" },
      {
        property: "og:description",
        content: "Describe the item, add a photo, the place and the time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportPage,
});

function localNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function ReportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<"lost" | "found">("lost");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [tags, setTags] = useState("");
  const [location, setLocation] = useState("");
  const [occurredAt, setOccurredAt] = useState(localNow());
  const [contact, setContact] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Please sign in again.");

      let imagePath: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("item-photos")
          .upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        imagePath = path;
      }

      const { data, error } = await supabase
        .from("items")
        .insert({
          user_id: userId,
          kind,
          title,
          description,
          category,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          location,
          occurred_at: new Date(occurredAt).toISOString(),
          contact,
          image_url: imagePath,
        })
        .select("id")
        .single();
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Posted. Checking for possible matches…");
      navigate({ to: "/items/$itemId", params: { itemId: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post the item");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-bold">Post an item</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The more detail you add, the better the automatic match suggestions.
        </p>

        <form onSubmit={onSubmit} className="glass-surface mt-8 space-y-6 rounded-2xl border p-6">
          <Tabs value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
            <TabsList className="w-full">
              <TabsTrigger value="lost" className="flex-1">
                I lost this
              </TabsTrigger>
              <TabsTrigger value="found" className="flex-1">
                I found this
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="title">Item</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Black steel water bottle"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Details</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dented near the base, blue sticker of a mountain on the side."
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c.replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Place</Label>
              <Input
                id="location"
                list="campus-places"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Library, 2nd floor"
              />
              <datalist id="campus-places">
                {CAMPUS_PLACES.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="when">When</Label>
              <Input
                id="when"
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="black, steel, sticker"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">How should people reach you?</Label>
            <Input
              id="contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Room 204, or 98xxxxxx90"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo">Photo</Label>
            <label
              htmlFor="photo"
               className="glass-control flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground transition-all hover:bg-primary/5 hover:text-primary"
            >
              <Upload className="size-4" />
              {file ? file.name : "Add a clear photo of the item"}
            </label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Posting…" : "Post and find matches"}
          </Button>
        </form>
      </main>
    </div>
  );
}
