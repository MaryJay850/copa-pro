import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { requireLeagueManager } from "@/lib/auth-guards";

interface OcrResult {
  matchCode: string;
  roundIndex: number;
  courtName: string;
  set1A: number | null;
  set1B: number | null;
  set2A: number | null;
  set2B: number | null;
  set3A: number | null;
  set3B: number | null;
  confidence: "high" | "low";
}

interface MatchInfo {
  id: string;
  matchCode: string;
  roundIndex: number;
  courtName: string;
  teamAName: string;
  teamBName: string;
  status: string;
}

interface MatchedResult {
  matchId: string;
  matchCode: string;
  roundIndex: number;
  courtName: string;
  teamAName: string;
  teamBName: string;
  set1A: number | null;
  set1B: number | null;
  set2A: number | null;
  set2B: number | null;
  set3A: number | null;
  set3B: number | null;
  confidence: "high" | "low";
  status: "matched" | "unmatched";
}

// Build the OCR prompt text (shared between providers)
function buildPrompt(setsInfo: string, matchListText: string): string {
  return `Tens de analisar foto(s) de uma folha de resultados impressa de um torneio de padel.

ATENÇÃO À ORIENTAÇÃO DA FOTO:
- A foto pode estar rodada (90°, 180°, 270°) ou inclinada. Roda mentalmente a imagem até que o texto fique legível na orientação correta.
- A folha tem um cabeçalho no topo com o nome do torneio e data, seguido de uma tabela.

ESTRUTURA DA FOLHA:
- É uma tabela impressa com estas colunas da esquerda para a direita: Cod | Ronda | Campo | Equipa A | (vs) | Equipa B | Set 1 | Set 2 | Set 3
- A coluna "Cod" contém um código único por jogo (ex: M01, M02, M03...).
- As colunas "Set 1", "Set 2", "Set 3" são onde os resultados são ESCRITOS À MÃO com caneta/lápis.
- Os scores de cada set são escritos como dois números separados por um traço: "X - Y" onde X são os pontos da Equipa A e Y os pontos da Equipa B.
- Exemplos de scores escritos à mão: "6-3", "4-6", "7-5", "6 - 4", "4 - 1"

${setsInfo}

Estes são TODOS os jogos do torneio (usa isto para validar o que lês na foto):
${matchListText}

REGRAS DE LEITURA:
1. Primeiro identifica a orientação correta da foto e lê a tabela.
2. Para cada linha, lê o código (M01, M02, etc.) na primeira coluna e usa-o para associar ao jogo correto.
3. Lê os scores escritos à mão nas colunas Set. Cada score é um par de números "X-Y". Extrai X como pontos da Equipa A e Y como pontos da Equipa B.
4. Se conseguires ler claramente os números, coloca confidence "high". Só coloca "low" se realmente não tiveres a certeza do que está escrito.
5. Se a folha não tiver códigos, associa pelo número da ronda e nome do campo.
6. Se não conseguires identificar a que jogo pertence, usa matchCode como string vazia "".
7. Scores são números inteiros (0-99). Se leres algo que não é um número válido, coloca null.
8. Ignora jogos marcados como [JÁ JOGADO] — não retornes resultados para esses.
9. Se uma coluna de set estiver vazia (sem nada escrito à mão), coloca null para ambos os valores desse set.

Retorna APENAS um JSON válido (sem markdown, sem código, sem explicações) com este formato:
{
  "results": [
    {
      "matchCode": "M01",
      "roundIndex": 1,
      "courtName": "Campo 3",
      "set1A": 6, "set1B": 3,
      "set2A": 4, "set2B": 6,
      "set3A": null, "set3B": null,
      "confidence": "high"
    }
  ]
}`;
}

// Call Anthropic Claude Vision API
async function callAnthropic(
  images: { base64: string; mediaType: string }[],
  prompt: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada.");

  const anthropic = new Anthropic({ apiKey });

  const imageContent: Anthropic.Messages.ImageBlockParam[] = images.map(
    (img) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: img.mediaType as
          | "image/jpeg"
          | "image/png"
          | "image/gif"
          | "image/webp",
        data: img.base64,
      },
    })
  );

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20241022",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          ...imageContent,
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Resposta inesperada da API Anthropic.");
  }
  return textBlock.text;
}

// Call OpenAI GPT-4o Vision API
async function callOpenAI(
  images: { base64: string; mediaType: string }[],
  prompt: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada.");

  const openai = new OpenAI({ apiKey });

  const imageMessages: OpenAI.Chat.Completions.ChatCompletionContentPart[] =
    images.map((img) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${img.mediaType};base64,${img.base64}`,
        detail: "high" as const,
      },
    }));

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          ...imageMessages,
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error("Resposta inesperada da API OpenAI.");
  }
  return text;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const tournamentId = formData.get("tournamentId") as string;

    if (!tournamentId) {
      return NextResponse.json(
        { error: "tournamentId obrigatório." },
        { status: 400 }
      );
    }

    // Get tournament with matches
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        rounds: {
          orderBy: { index: "asc" },
          include: {
            matches: {
              include: {
                teamA: true,
                teamB: true,
                court: true,
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Torneio não encontrado." },
        { status: 404 }
      );
    }

    // Check permissions
    await requireLeagueManager(tournament.leagueId);

    // Collect images from form data
    const images: { base64: string; mediaType: string }[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === "images" && value instanceof File) {
        const buffer = Buffer.from(await value.arrayBuffer());
        const base64 = buffer.toString("base64");
        const mediaType = value.type || "image/jpeg";
        images.push({ base64, mediaType });
      }
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma imagem enviada." },
        { status: 400 }
      );
    }

    if (images.length > 5) {
      return NextResponse.json(
        { error: "Máximo de 5 imagens por vez." },
        { status: 400 }
      );
    }

    // Build match list with sequential codes (M01, M02, ...) matching the printed sheet
    const allMatches: MatchInfo[] = [];
    let matchSeq = 0;
    for (const round of tournament.rounds) {
      for (const match of round.matches) {
        matchSeq++;
        allMatches.push({
          id: match.id,
          matchCode: `M${String(matchSeq).padStart(2, "0")}`,
          roundIndex: round.index,
          courtName: match.court?.name || `Campo ${match.courtId}`,
          teamAName: match.teamA.name,
          teamBName: match.teamB.name,
          status: match.status,
        });
      }
    }

    const scheduledMatches = allMatches.filter(
      (m) => m.status === "SCHEDULED"
    );

    if (scheduledMatches.length === 0) {
      return NextResponse.json(
        { error: "Não há jogos pendentes neste torneio." },
        { status: 400 }
      );
    }

    const numberOfSets = tournament.numberOfSets;

    const matchListText = allMatches
      .map(
        (m) =>
          `${m.matchCode} | Ronda ${m.roundIndex} | ${m.courtName} | ${m.teamAName} vs ${m.teamBName}${m.status === "FINISHED" ? " [JÁ JOGADO]" : ""}`
      )
      .join("\n");

    const setsInfo =
      numberOfSets === 1
        ? "Cada jogo tem 1 set. Preenche apenas set1A e set1B. Os outros sets devem ser null."
        : numberOfSets === 2
          ? "Cada jogo tem 2 sets. Preenche set1A, set1B, set2A, set2B. Set 3 é null (não há)."
          : "Cada jogo tem melhor de 3 sets. Preenche set1 e set2 sempre. Set 3 só se necessário (caso contrário null).";

    const prompt = buildPrompt(setsInfo, matchListText);

    // Try Anthropic first, fallback to OpenAI
    let responseText: string;
    let provider: string;

    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;

    if (!hasAnthropic && !hasOpenAI) {
      return NextResponse.json(
        {
          error:
            "Nenhuma API de IA configurada. Adicione ANTHROPIC_API_KEY ou OPENAI_API_KEY.",
        },
        { status: 500 }
      );
    }

    try {
      if (hasAnthropic) {
        responseText = await callAnthropic(images, prompt);
        provider = "anthropic";
      } else {
        responseText = await callOpenAI(images, prompt);
        provider = "openai";
      }
    } catch (firstError) {
      console.warn(
        `[OCR] Primary provider failed:`,
        firstError instanceof Error ? firstError.message : firstError
      );

      // Fallback to the other provider
      try {
        if (hasAnthropic && hasOpenAI) {
          // Primary was Anthropic, fallback to OpenAI
          responseText = await callOpenAI(images, prompt);
          provider = "openai (fallback)";
        } else {
          // Only one provider configured and it failed
          throw firstError;
        }
      } catch (secondError) {
        console.error(
          `[OCR] Both providers failed. Second error:`,
          secondError instanceof Error ? secondError.message : secondError
        );
        const message =
          firstError instanceof Error
            ? firstError.message
            : "Erro ao processar imagens.";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    console.log(`[OCR] Using provider: ${provider}`);
    console.log(`[OCR] Raw response:`, responseText);

    // Parse response
    let ocrResults: OcrResult[];
    try {
      let jsonText = responseText.trim();
      // Handle possible markdown wrapping (```json ... ```)
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      const parsed = JSON.parse(jsonText);
      console.log(`[OCR] Parsed results:`, JSON.stringify(parsed.results, null, 2));
      ocrResults = parsed.results || [];
    } catch {
      console.error("[OCR] Failed to parse response:", responseText);
      return NextResponse.json(
        {
          error:
            "Não foi possível interpretar os resultados. Tente novamente com fotos mais claras.",
        },
        { status: 422 }
      );
    }

    // Match OCR results with tournament matches
    const matchedResults: MatchedResult[] = ocrResults.map((ocr) => {
      // Try matching by code first (most reliable)
      let match = ocr.matchCode
        ? scheduledMatches.find(
            (m) =>
              m.matchCode.toUpperCase() === ocr.matchCode.toUpperCase()
          )
        : undefined;

      // Fallback: match by roundIndex + courtName
      if (!match) {
        match = scheduledMatches.find(
          (m) =>
            m.roundIndex === ocr.roundIndex &&
            m.courtName.toLowerCase().trim() ===
              ocr.courtName.toLowerCase().trim()
        );
      }

      if (match) {
        return {
          matchId: match.id,
          matchCode: match.matchCode,
          roundIndex: match.roundIndex,
          courtName: match.courtName,
          teamAName: match.teamAName,
          teamBName: match.teamBName,
          set1A: ocr.set1A,
          set1B: ocr.set1B,
          set2A: ocr.set2A,
          set2B: ocr.set2B,
          set3A: ocr.set3A,
          set3B: ocr.set3B,
          confidence: ocr.confidence,
          status: "matched" as const,
        };
      }

      return {
        matchId: "",
        matchCode: ocr.matchCode || "",
        roundIndex: ocr.roundIndex,
        courtName: ocr.courtName,
        teamAName: "?",
        teamBName: "?",
        set1A: ocr.set1A,
        set1B: ocr.set1B,
        set2A: ocr.set2A,
        set2B: ocr.set2B,
        set3A: ocr.set3A,
        set3B: ocr.set3B,
        confidence: ocr.confidence,
        status: "unmatched" as const,
      };
    });

    return NextResponse.json({
      results: matchedResults,
      totalDetected: ocrResults.length,
      totalMatched: matchedResults.filter((r) => r.status === "matched")
        .length,
      provider,
      debug: { rawOcr: ocrResults },
    });
  } catch (error) {
    console.error("[OCR] Error:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao processar imagens.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
