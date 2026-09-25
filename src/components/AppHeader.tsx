import { Link, useNavigate } from "@tanstack/react-router";
import { Compass, Plus, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function AppHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="glass-surface sticky top-0 z-20 border-b bg-background/70 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="inline-flex items-center gap-2 text-primary">
          <Compass className="size-5" />
          <span className="font-display text-base font-bold sm:text-lg">
            Campus Lost &amp; Found
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/my-posts">My posts</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/report">
                  <Plus className="size-4" /> Report
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sign out"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/auth" });
                }}
              >
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
