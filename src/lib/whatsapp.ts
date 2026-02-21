/**
 * WhatsApp Service via EvolutionAPI v2
 *
 * Follows the same guard-clause pattern as email.ts:
 * if WHATSAPP_API_URL or WHATSAPP_API_KEY are not configured,
 * all functions silently skip (no errors thrown).
 */

const API_URL = () => process.env.WHATSAPP_API_URL;
const API_KEY = () => process.env.WHATSAPP_API_KEY;
const INSTANCE = () => process.env.WHATSAPP_INSTANCE || "Bitclever";

function isConfigured(): boolean {
  return !!(API_URL() && API_KEY());
}

async function apiCall(
  path: string,
  body: Record<string, unknown>,
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
    body: JSON.stringify(body),
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
 * Create a WhatsApp group.
 * Returns the group JID (e.g. "120363...@g.us") or null on failure.
 */
export async function createGroup(
  name: string,
  phones: string[]
): Promise<string | null> {
  if (!isConfigured()) {
    console.warn("[WHATSAPP] Não configurado, grupo não criado");
    return null;
  }

  try {
    // EvolutionAPI v2: POST /group/create/{instance}
    // participants must be in format "55119999@s.whatsapp.net" or just the phone number
    const data = (await apiCall(`/group/create/${INSTANCE()}`, {
      subject: name,
      participants: phones,
    })) as { id?: string } | null;

    if (data?.id) {
      console.log(`[WHATSAPP] Grupo criado: ${data.id}`);
      return data.id;
    }

    return null;
  } catch (error) {
    console.error("[WHATSAPP] Erro ao criar grupo:", (error as Error).message);
    return null;
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
    // EvolutionAPI v2: POST /group/updateParticipant/{instance}?groupJid=...
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
 */
export async function sendGroupMessage(
  groupJid: string,
  text: string
): Promise<void> {
  if (!isConfigured() || !groupJid) {
    console.warn("[WHATSAPP] Não configurado ou sem groupJid, mensagem não enviada");
    return;
  }

  try {
    // EvolutionAPI v2: POST /message/sendText/{instance}
    await apiCall(`/message/sendText/${INSTANCE()}`, {
      number: groupJid,
      text,
    });
  } catch (error) {
    console.error(
      "[WHATSAPP] Erro ao enviar mensagem:",
      (error as Error).message
    );
  }
}
