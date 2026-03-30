/**
 * Meta Pixel — Centralized User Data Collection & Persistence
 *
 * Collects all available PII from:
 * 1. Supabase Auth (logged-in user)
 * 2. Profile data (phone, address, birthday)
 * 3. localStorage session cache (for anonymous visitors who filled forms)
 *
 * Persists data in localStorage so it survives page navigations and is
 * available for EVERY event (PageView, ViewContent, etc.) even before auth loads.
 *
 * All PII is normalized per Meta spec before being passed to fbq() —
 * the SDK hashes it automatically. For CAPI, raw normalized values are sent
 * and the edge function hashes them server-side.
 */

import { supabase } from "@/integrations/supabase/client";
import { getFbc, getFbp, getClientIp } from "./useMetaParamBuilder";

const STORAGE_KEY = "_emk_ud";

export interface MetaUserDataRaw {
  em?: string;   // email
  ph?: string;   // phone (digits, with country code)
  fn?: string;   // first name
  ln?: string;   // last name
  ct?: string;   // city
  st?: string;   // state (2-letter)
  zp?: string;   // zip/CEP
  country?: string;
  db?: string;   // date of birth YYYYMMDD
  ge?: string;   // gender m/f
  external_id?: string;
  fb_login_id?: string;
  fbc?: string;
  fbp?: string;
  client_ip_address?: string;
  client_user_agent?: string;
}

// ─── localStorage persistence ─────────────────────────────────────────

function loadFromStorage(): Partial<MetaUserDataRaw> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch { return {}; }
}

export function saveUserDataToStorage(partial: Partial<MetaUserDataRaw>) {
  try {
    const existing = loadFromStorage();
    // Only overwrite with non-empty values
    const merged: Record<string, string> = { ...existing };
    for (const [k, v] of Object.entries(partial)) {
      if (v) merged[k] = v;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch { /* ignore */ }
}

// ─── Normalization helpers ────────────────────────────────────────────

function normalizeName(name: string): string {
  return name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizePhone(phone: string): string {
  let ph = phone.replace(/\D/g, "").replace(/^0+/, "");
  if (ph.length === 10 || ph.length === 11) ph = "55" + ph;
  return ph;
}

function normalizeZip(zip: string): string {
  return zip.replace(/\D/g, "").slice(0, 5);
}

function normalizeDob(dob: string): string | undefined {
  const raw = dob.replace(/\D/g, "");
  if (raw.length === 8 && (raw.startsWith("19") || raw.startsWith("20"))) return raw;
  if (raw.length === 8) return raw.slice(4) + raw.slice(2, 4) + raw.slice(0, 2);
  return undefined;
}

// ─── Build complete user data ─────────────────────────────────────────

/**
 * Synchronously returns the best available user data from cache + attribution params.
 * Call this before every event fire.
 */
export function getMetaUserData(): MetaUserDataRaw {
  const stored = loadFromStorage();
  const data: MetaUserDataRaw = { ...stored };

  // Always inject latest attribution params
  const fbc = getFbc();
  if (fbc) data.fbc = fbc;
  const fbp = getFbp();
  if (fbp) data.fbp = fbp;
  const ip = getClientIp();
  if (ip) data.client_ip_address = ip;
  data.client_user_agent = navigator.userAgent;
  if (!data.country) data.country = "br";

  return data;
}

/**
 * Async: loads user data from Supabase Auth + profile, persists to localStorage.
 * Called once on app init and on auth state change.
 * Returns the full user data object.
 */
export async function refreshMetaUserDataFromAuth(): Promise<MetaUserDataRaw> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return getMetaUserData();

  const fullName = user.user_metadata?.full_name || "";
  const parts = fullName.split(" ");

  const pii: Partial<MetaUserDataRaw> = {
    external_id: user.id,
    em: user.email ? user.email.trim().toLowerCase() : undefined,
    fn: parts[0] ? normalizeName(parts[0]) : undefined,
    ln: parts.slice(1).join(" ") ? normalizeName(parts.slice(1).join(" ")) : undefined,
  };

  // Phone from metadata
  const metaPhone = user.user_metadata?.phone;
  if (metaPhone) pii.ph = normalizePhone(metaPhone);

  // fb_login_id
  const identities = (user as any).identities || [];
  const fbIdentity = identities.find((i: any) => i.provider === "facebook");
  if (fbIdentity?.id) pii.fb_login_id = fbIdentity.id;

  // Enrich from profile
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone, address, cpf, birthday")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile) {
      if (profile.phone) pii.ph = normalizePhone(profile.phone);
      
      const addr = (profile.address as any) || {};
      if (addr.city) pii.ct = normalizeName(addr.city).replace(/\s/g, "");
      if (addr.state) pii.st = (addr.state as string).trim().toLowerCase().slice(0, 2);
      if (addr.zip || addr.cep) pii.zp = normalizeZip(addr.zip || addr.cep);

      if (profile.birthday) {
        const db = normalizeDob(profile.birthday);
        if (db) pii.db = db;
      }
    }
  } catch { /* ignore */ }

  pii.country = "br";

  // Persist everything
  saveUserDataToStorage(pii);

  return getMetaUserData();
}

/**
 * Save partial user data from form interactions (checkout, newsletter, etc.)
 * so subsequent events include this PII even without login.
 */
export function saveFormDataForMeta(data: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  cpf?: string;
  dateOfBirth?: string;
}) {
  const pii: Partial<MetaUserDataRaw> = {};

  if (data.email) pii.em = data.email.trim().toLowerCase();
  if (data.phone) pii.ph = normalizePhone(data.phone);
  if (data.firstName) pii.fn = normalizeName(data.firstName);
  if (data.lastName) pii.ln = normalizeName(data.lastName);
  if (data.city) pii.ct = normalizeName(data.city).replace(/\s/g, "");
  if (data.state) pii.st = data.state.trim().toLowerCase().slice(0, 2);
  if (data.zip) pii.zp = normalizeZip(data.zip);
  if (data.dateOfBirth) {
    const db = normalizeDob(data.dateOfBirth);
    if (db) pii.db = db;
  }
  pii.country = "br";

  saveUserDataToStorage(pii);
}

/**
 * Convert MetaUserDataRaw → CAPI field names for the edge function.
 */
export function toCapiUserData(raw: MetaUserDataRaw): Record<string, string> {
  const capi: Record<string, string> = {};
  if (raw.em) capi.email = raw.em;
  if (raw.ph) capi.phone = raw.ph;
  if (raw.fn) capi.first_name = raw.fn;
  if (raw.ln) capi.last_name = raw.ln;
  if (raw.db) capi.date_of_birth = raw.db;
  if (raw.ge) capi.gender = raw.ge;
  if (raw.external_id) capi.external_id = raw.external_id;
  if (raw.country) capi.country = raw.country;
  if (raw.st) capi.state = raw.st;
  if (raw.ct) capi.city = raw.ct;
  if (raw.zp) capi.zip = raw.zp;
  if (raw.fbc) capi.fbc = raw.fbc;
  if (raw.fbp) capi.fbp = raw.fbp;
  if (raw.client_ip_address) capi.client_ip_address = raw.client_ip_address;
  if (raw.client_user_agent) capi.client_user_agent = raw.client_user_agent;
  if (raw.fb_login_id) capi.fb_login_id = raw.fb_login_id;
  return capi;
}
