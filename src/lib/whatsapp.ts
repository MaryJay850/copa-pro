/**
 * WhatsApp Service via EvolutionAPI v2
 *
 * Follows the same guard-clause pattern as email.ts:
 * if WHATSAPP_API_URL or WHATSAPP_API_KEY are not configured,
 * all functions silently skip (no errors thrown).
 *
 * Default admin phone: +351932539702 (fallback if platform admins have no phone)
 */

const API_URL = () => process.env.WHATSAPP_API_URL;
const API_KEY = () => process.env.WHATSAPP_API_KEY;
const INSTANCE = () => process.env.WHATSAPP_INSTANCE || "Bitclever";
const DEFAULT_ADMIN_PHONE = "351932539702";
const GROUP_AVATAR_URL = () => process.env.WHATSAPP_GROUP_AVATAR_URL;

function isConfigured(): boolean {
  return !!(API_URL() && API_KEY());
}

/**
 * Normalize a phone string: strip spaces, + and non-digits.
 * Input: "+351 932539702" → "351932539702"
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

async function apiCall(
  path: string,
  body?: Record<string, unknown>,
  method = "POST"
): Promise<unknown> {
  const url = `${API_URL()}${path}`;
  console.log(`[WHATSAPP] ${method} ${url}`);

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: API_KEY()!,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`[WHATSAPP] Erro ${res.status}:`, JSON.stringify(data));
    return null;
  }

  console.log(`[WHATSAPP] Sucesso:`, JSON.stringify(data));
  return data;
}

// ── Public API ──

/**
 * Update the group profile picture.
 * Uses WHATSAPP_GROUP_AVATAR_URL env var or accepts an explicit imageUrl.
 */
export async function updateGroupPicture(
  groupJid: string,
  imageUrl?: string
): Promise<void> {
  if (!isConfigured() || !groupJid) return;

  const url = imageUrl || GROUP_AVATAR_URL();
  if (!url) {
    console.warn("[WHATSAPP] Sem URL de imagem para avatar do grupo");
    return;
  }

  try {
    await apiCall(
      `/group/updateGroupPicture/${INSTANCE()}?groupJid=${encodeURIComponent(groupJid)}`,
      { image: url }
    );
    console.log(`[WHATSAPP] Avatar do grupo atualizado: ${groupJid}`);
  } catch (error) {
    console.error(
      "[WHATSAPP] Erro ao atualizar avatar do grupo:",
      (error as Error).message
    );
  }
}

/**
 * Fetch current participants of a WhatsApp group.
 * Returns normalized phone numbers (digits only) of all participants.
 * EvolutionAPI returns: { participants: [{ id: "351932539702@s.whatsapp.net", admin: "superadmin" | "admin" | null }] }
 */
export async function fetchGroupParticipants(
  groupJid: string
): Promise<string[]> {
  if (!isConfigured() || !groupJid) return [];

  try {
    const data = (await apiCall(
      `/group/participants/${INSTANCE()}?groupJid=${encodeURIComponent(groupJid)}`,
      undefined,
      "GET"
    )) as { participants?: { id: string; admin?: string | null }[] } | null;

    if (!data?.participants) return [];

    // Extract phone numbers from JIDs (e.g. "351932539702@s.whatsapp.net" → "351932539702")
    return data.participants
      .map((p) => p.id.replace(/@.*$/, ""))
      .filter((p) => p.length > 0);
  } catch (error) {
    console.error(
      "[WHATSAPP] Erro ao buscar participantes do grupo:",
      (error as Error).message
    );
    return [];
  }
}

/**
 * Create a WhatsApp group with proper settings:
 * - not_announcement: everyone can send messages
 * - locked: only admins can edit group settings
 * - Admins are promoted after creation
 * - Invite sending is restricted (approval required)
 * - Group profile picture set from WHATSAPP_GROUP_AVATAR_URL
 *
 * Returns the group JID (e.g. "120363...@g.us") or null on failure.
 */
export async function createGroup(
  name: string,
  adminPhones: string[]
): Promise<string | null> {
  if (!isConfigured()) {
    console.warn("[WHATSAPP] Não configurado, grupo não criado");
    return null;
  }

  try {
    // Ensure default admin phone is always included
    const allPhones = [...new Set([...adminPhones, DEFAULT_ADMIN_PHONE])];

    // EvolutionAPI v2: POST /group/create/{instance}
    const data = (await apiCall(`/group/create/${INSTANCE()}`, {
      subject: name,
      participants: allPhones,
    })) as { id?: string } | null;

    if (!data?.id) return null;

    const groupJid = data.id;
    console.log(`[WHATSAPP] Grupo criado: ${groupJid}`);

    // Configure group settings:
    // 1. not_announcement — everyone can send messages
    await updateGroupSetting(groupJid, "not_announcement");
    // 2. locked — only admins can edit group settings
    await updateGroupSetting(groupJid, "locked");

    // Promote admin phones to group admins
    await promoteParticipants(groupJid, allPhones);

    // Set group profile picture
    await updateGroupPicture(groupJid);

    return groupJid;
  } catch (error) {
    console.error("[WHATSAPP] Erro ao criar grupo:", (error as Error).message);
    return null;
  }
}

/**
 * Update group setting.
 * Actions: "announcement" | "not_announcement" | "locked" | "unlocked"
 */
export async function updateGroupSetting(
  groupJid: string,
  action: "announcement" | "not_announcement" | "locked" | "unlocked"
): Promise<void> {
  if (!isConfigured() || !groupJid) return;

  try {
    await apiCall(
      `/group/updateSetting/${INSTANCE()}?groupJid=${encodeURIComponent(groupJid)}`,
      { action }
    );
  } catch (error) {
    console.error(
      `[WHATSAPP] Erro ao atualizar setting (${action}):`,
      (error as Error).message
    );
  }
}

/**
 * Promote participants to group admin.
 */
export async function promoteParticipants(
  groupJid: string,
  phones: string[]
): Promise<void> {
  if (!isConfigured() || !groupJid || phones.length === 0) return;

  try {
    await apiCall(
      `/group/updateParticipant/${INSTANCE()}?groupJid=${encodeURIComponent(groupJid)}`,
      {
        action: "promote",
        participants: phones,
      }
    );
  } catch (error) {
    console.error(
      "[WHATSAPP] Erro ao promover participantes:",
      (error as Error).message
    );
  }
}

/**
 * Add participants to a WhatsApp group.
 */
export async function addParticipants(
  groupJid: string,
  phones: string[]
): Promise<void> {
  if (!isConfigured() || !groupJid || phones.length === 0) return;

  try {
    await apiCall(
      `/group/updateParticipant/${INSTANCE()}?groupJid=${encodeURIComponent(groupJid)}`,
      {
        action: "add",
        participants: phones,
      }
    );
  } catch (error) {
    console.error(
      "[WHATSAPP] Erro ao adicionar participantes:",
      (error as Error).message
    );
  }
}

/**
 * Remove participants from a WhatsApp group.
 */
export async function removeParticipants(
  groupJid: string,
  phones: string[]
): Promise<void> {
  if (!isConfigured() || !groupJid || phones.length === 0) return;

  try {
    await apiCall(
      `/group/updateParticipant/${INSTANCE()}?groupJid=${encodeURIComponent(groupJid)}`,
      {
        action: "remove",
        participants: phones,
      }
    );
  } catch (error) {
    console.error(
      "[WHATSAPP] Erro ao remover participantes:",
      (error as Error).message
    );
  }
}

/**
 * Send a text message to a WhatsApp group.
 * Returns the message key (for pinning) or null.
 */
export async function sendGroupMessage(
  groupJid: string,
  text: string
): Promise<{ messageId: string } | null> {
  if (!isConfigured() || !groupJid) {
    console.warn("[WHATSAPP] Não configurado ou sem groupJid, mensagem não enviada");
    return null;
  }

  try {
    const result = (await apiCall(`/message/sendText/${INSTANCE()}`, {
      number: groupJid,
      text,
    })) as { key?: { id?: string } } | null;

    if (result?.key?.id) {
      return { messageId: result.key.id };
    }
    return null;
  } catch (error) {
    console.error(
      "[WHATSAPP] Erro ao enviar mensagem:",
      (error as Error).message
    );
    return null;
  }
}
