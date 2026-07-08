"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/book", label: "Book" },
  { href: "/consult", label: "Consult" },
  { href: "/news", label: "News" },
  { href: "/manage", label: "Manage" },
];

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold text-primary">
          SMIRE AI
        </Link>

        <ul className="hidden items-center gap-x-6 sm:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "text-sm font-medium text-muted-foreground transition-colors hover:text-primary",
                  pathname === link.href && "text-primary",
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
          >
            {user?.email ? user.email[0].toUpperCase() : "?"}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-border bg-card p-2 shadow-md">
                <div className="px-2 py-1.5">
                  <p className="truncate text-sm font-medium">{user?.email ?? "Not logged in"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.user_metadata?.full_name ?? ""}
                  </p>
                </div>
                <div className="my-1 border-t border-border" />
                <button
                  onClick={handleLogout}
                  className="w-full rounded-sm px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </nav>

      <ul className="flex items-center gap-x-4 overflow-x-auto border-t border-border px-4 py-2 sm:hidden">
        {NAV_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={cn(
                "text-sm font-medium text-muted-foreground whitespace-nowrap hover:text-primary",
                pathname === link.href && "text-primary",
              )}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </header>
  );
}
