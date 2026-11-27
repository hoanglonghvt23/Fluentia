"use server";

import { redirect } from "next/navigation";
import { MIN_PASSWORD, USERNAME_RE, getCurrentUser, normalizeUsername, usernameToEmail } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Mọi thao tác dùng secret key đều phải qua đây để kiểm tra admin trước.
async function requireAdmin() {
  const me = await getCurrentUser();
  if (me?.role !== "admin") redirect("/");
}

export async function createUser(formData: FormData) {
  await requireAdmin();
  const username = normalizeUsername(formData.get("username"));
  const password = String(formData.get("password") ?? "");
  if (!USERNAME_RE.test(username)) redirect("/admin?msg=err_username");
  if (password.length < MIN_PASSWORD) redirect("/admin?msg=err_password");

  const { error } = await createAdminClient().auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
  });
  redirect(`/admin?msg=${error ? (error.code === "email_exists" ? "err_exists" : "err_failed") : "ok_created"}`);
}

export async function addAllowedEmail(formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/admin?msg=err_email");
  const { error } = await createAdminClient().from("allowed_emails").upsert({ email });
  redirect(`/admin?msg=${error ? "err_failed" : "ok_email"}`);
}

export async function removeAllowedEmail(formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") ?? "");
  const { error } = await createAdminClient().from("allowed_emails").delete().eq("email", email);
  redirect(`/admin?msg=${error ? "err_failed" : "ok_email_removed"}`);
}

export async function resetPassword(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD) redirect("/admin?msg=err_password");

  const { error } = await createAdminClient().auth.admin.updateUserById(id, { password });
  redirect(`/admin?msg=${error ? "err_failed" : "ok_reset"}`);
}
