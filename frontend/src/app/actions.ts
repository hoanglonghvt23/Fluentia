"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeUsername, usernameToEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function setLocale(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "vi";
  (await cookies()).set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout"); // vẽ lại trang hiện tại bằng ngôn ngữ mới
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(normalizeUsername(formData.get("username"))),
    password: String(formData.get("password") ?? ""),
  });
  redirect(error ? "/login?error=invalid" : "/");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  redirect(error || !data.url ? "/login?error=google" : data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
