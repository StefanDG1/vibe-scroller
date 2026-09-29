"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { signOut } from "@workos-inc/authkit-nextjs";
import { ConvexError } from "convex/values";
import { backend, api } from "@/lib/backend";
import type { Id } from "../../../convex/_generated/dataModel";
import type { FormState } from "@/components/action-form";
import { recipes } from "@companynerve/design-recipes";
const val = (d: FormData, key: string) => String(d.get(key) ?? "");
const org = (d: FormData) => val(d, "organizationId") as Id<"organizations">;
const signOutUrl = () =>
  new URL(process.env.APP_URL || "http://localhost:3001").origin;
async function run(
  work: () => Promise<FormState & { path?: string }>,
): Promise<FormState> {
  let result;
  try {
    result = await work();
  } catch (e) {
    return {
      error:
        e instanceof ConvexError
          ? String(e.data)
          : "The action could not be completed. Check the input and integration setup, then try again.",
    };
  }
  revalidatePath("/app", "layout");
  if (result.path) redirect(result.path);
  return result;
}
export async function createOrganization(_: FormState, d: FormData) {
  return run(async () => {
    const c = await backend();
    const id = await c.mutation(api.organizations.create, {
      name: val(d, "name"),
    });
    return { path: `/app/${id}` };
  });
}
export async function saveProject(_: FormState, d: FormData) {
  return run(async () => {
    const c = await backend();
    await c.mutation(api.projects.save, {
      organizationId: org(d),
      id: val(d, "id") ? (val(d, "id") as Id<"projects">) : undefined,
      name: val(d, "name"),
      description: val(d, "description"),
    });
    return { path: `/app/${org(d)}` };
  });
}
export async function removeProject(_: FormState, d: FormData) {
  return run(async () => {
    const c = await backend();
    if (val(d, "confirmation") !== "DELETE")
      return { error: "Type DELETE to confirm." };
    await c.mutation(api.projects.remove, {
      organizationId: org(d),
      id: val(d, "id") as Id<"projects">,
    });
    return { path: `/app/${org(d)}` };
  });
}
export async function renameOrganization(_: FormState, d: FormData) {
  return run(async () => {
    await (
      await backend()
    ).mutation(api.organizations.rename, {
      organizationId: org(d),
      name: val(d, "name"),
    });
    return { message: "Organization name updated." };
  });
}
export async function changeMember(_: FormState, d: FormData) {
  return run(async () => {
    const role = val(d, "role");
    if (!["owner", "admin", "member", "remove"].includes(role))
      return { error: "Choose a role." };
    await (
      await backend()
    ).mutation(api.organizations.changeMember, {
      organizationId: org(d),
      membershipId: val(d, "membershipId") as Id<"memberships">,
      role: role as "owner" | "admin" | "member" | "remove",
    });
    return { message: "Membership updated." };
  });
}
export async function inviteMember(_: FormState, d: FormData) {
  return run(async () => {
    const role = val(d, "role");
    if (role !== "admin" && role !== "member")
      return { error: "Choose a role." };
    const token = randomBytes(32).toString("hex");
    await (
      await backend()
    ).mutation(api.organizations.invite, {
      organizationId: org(d),
      email: val(d, "email"),
      role,
      tokenHash: createHash("sha256").update(token).digest("hex"),
    });
    const origin = process.env.APP_URL || "http://localhost:3001";
    return {
      message:
        "Invitation created. Share this link privately with the invited person. No email was sent.",
      link: `${origin}/join/${token}`,
    };
  });
}
export async function revokeInvite(_: FormState, d: FormData) {
  return run(async () => {
    await (
      await backend()
    ).mutation(api.organizations.revokeInvite, {
      organizationId: org(d),
      id: val(d, "invitationId") as Id<"invitations">,
    });
    return { message: "Invitation revoked." };
  });
}
export async function acceptInvite(_: FormState, d: FormData) {
  return run(async () => {
    const token = val(d, "token");
    if (!/^[a-f0-9]{64}$/.test(token)) return { error: "Invalid invitation." };
    const id = await (
      await backend()
    ).mutation(api.organizations.acceptInvite, {
      tokenHash: createHash("sha256").update(token).digest("hex"),
    });
    return { path: `/app/${id}` };
  });
}
export async function startCheckout(_: FormState, d: FormData) {
  return run(async () => {
    const url = await (
      await backend()
    ).action(api.payments.checkout, { organizationId: org(d) });
    return { path: url };
  });
}
export async function billingPortal(_: FormState, d: FormData) {
  return run(async () => ({
    path: await (
      await backend()
    ).action(api.payments.portal, { organizationId: org(d) }),
  }));
}
export async function refreshBilling(_: FormState, d: FormData) {
  return run(async () => {
    await (
      await backend()
    ).action(api.payments.refreshBilling, { organizationId: org(d) });
    return { message: "Billing refreshed from Stripe." };
  });
}
export async function deleteOrganization(_: FormState, d: FormData) {
  return run(async () => {
    await (
      await backend()
    ).mutation(api.organizations.remove, {
      organizationId: org(d),
      confirmation: val(d, "confirmation"),
    });
    return { path: "/app" };
  });
}
export async function deleteAccount(_: FormState, d: FormData) {
  const result = await run(async () => {
    await (
      await backend()
    ).mutation(api.accounts.deleteAccount, {
      confirmation: val(d, "confirmation"),
    });
    return {
      message: "Account access is locked. Identity deletion is processing.",
    };
  });
  if (!result.error) {
    // Identity deletion also revokes provider sessions. Do not send the user
    // to a provider logout endpoint for a session that may already be gone.
    (await cookies()).delete(process.env.WORKOS_COOKIE_NAME || "wos-session");
    redirect("/");
  }
  return result;
}
export async function logout() {
  await signOut({ returnTo: signOutUrl() });
}
export async function changeRecipe(d: FormData) {
  const recipe = val(d, "recipe");
  if (!recipes.some((r) => r.id === recipe)) return;
  (await cookies()).set("recipe", recipe, {
    sameSite: "lax",
    httpOnly: true,
    path: "/",
    maxAge: 31536000,
    secure: process.env.NODE_ENV === "production",
  });
  revalidatePath("/", "layout");
}
