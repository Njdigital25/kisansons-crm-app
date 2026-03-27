import { supabase, type Lead } from "./supabase";

export type CustomerData = {
  name: string;
  phone: string;
  village: string;
};

export type CheckResult =
  | { ready: true }
  | { ready: false; missing: string[] };

/**
 * Checks which of name / phone / village are missing on a lead.
 */
export function getMissingFields(lead: Lead): string[] {
  const missing: string[] = [];
  if (!lead.name?.trim()) missing.push("name");
  if (!lead.phone?.trim()) missing.push("phone");
  if (!lead.village?.trim()) missing.push("village");
  return missing;
}

/**
 * Inserts a customer record, skipping if a customer with the same phone
 * already exists. Returns { created: true } or { created: false, reason }.
 */
export async function createCustomer(
  data: CustomerData
): Promise<{ created: boolean; reason?: string; error?: string }> {
  // 1. Check for duplicate by phone
  const { data: existing, error: checkError } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", data.phone)
    .maybeSingle();

  if (checkError) {
    return { created: false, error: checkError.message };
  }

  if (existing) {
    return { created: false, reason: "A customer with this phone number already exists." };
  }

  // 2. Insert new customer
  const { error: insertError } = await supabase.from("customers").insert([
    { name: data.name, phone: data.phone, village: data.village },
  ]);

  if (insertError) {
    return { created: false, error: insertError.message };
  }

  return { created: true };
}

/**
 * Updates a lead's status to "Qualified" in Supabase.
 */
export async function updateLeadStatus(
  leadId: string,
  status: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", leadId);

  if (error) return { error: error.message };
  return {};
}

/**
 * Main orchestrator: checks fields, creates customer, updates lead status.
 * Returns a CheckResult so the caller knows whether to show the modal.
 */
export function checkFields(lead: Lead): CheckResult {
  const missing = getMissingFields(lead);
  if (missing.length === 0) return { ready: true };
  return { ready: false, missing };
}
