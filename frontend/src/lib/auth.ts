import { createClient } from "./supabase/server";

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export const MIN_PASSWORD = 8;

// Supabase Auth cần email, nên username được ghép thành email giả.
export const usernameToEmail = (username: string) => `${username}@fluteria.local`;
export const normalizeUsername = (v: FormDataEntryValue | null) =>
  String(v ?? "").trim().toLowerCase();

export type CurrentUser = { id: string; username: string; role: "admin" | "user" };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles").select("username, role").eq("id", user.id).single();
  return data ? { id: user.id, username: data.username, role: data.role } : null;
}
