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
  return `Analisa foto(s) de uma folha de resultados de padel com scores escritos à mão.

ORIENTAÇÃO:
- A foto pode estar rodada ou inclinada. Roda mentalmente até o texto ficar legível.
- Procura o cabeçalho com o nome do torneio para identificar o topo da página.

ESTRUTURA DA TABELA IMPRESSA:
Colunas: Cod | Ronda | Campo | Equipa A | vs | Equipa B | Set 1 | Set 2 | Set 3
- "Cod" = código do jogo (M01, M02, M03...)
- Nas colunas Set, os resultados são ESCRITOS À MÃO (caneta/lápis)
- Cada score é "X - Y" onde X = pontos Equipa A, Y = pontos Equipa B

DICAS PARA LER NÚMEROS MANUSCRITOS:
- Em padel, scores típicos são entre 0 e 7 (os mais comuns são 0,1,2,3,4,5,6,7)
- Scores acima de 7 são raros mas possíveis (8, 9, 10 em tiebreak)
- Números confusos comuns: 1 vs 7 (o 7 geralmente tem barra horizontal), 4 vs 9, 6 vs 0
- O "4" manuscrito pode ter topo aberto ou fechado — se parecer um triângulo é 4, não 6
- O "1" é um traço vertical simples, o "7" tem traço horizontal no topo
- Se dois números formam um score impossível (ex: 6-6), verifica se leste bem — empates exatos são raros
- Olha para o contexto: se numa linha lês "4 - 1", e na mesma coluna de outras linhas os números estão escritos de forma similar, usa isso para calibrar a leitura
- Os números são escritos dentro de células/colunas da tabela — o número da ESQUERDA na célula do Set é da Equipa A, o da DIREITA é da Equipa B

${setsInfo}

LISTA COMPLETA DE JOGOS DO TORNEIO (usa para validar):
${matchListText}

REGRAS:
1. Identifica a orientação, depois lê linha a linha.
2. Lê o código (M01, M02...) na coluna Cod para associar ao jogo.
3. Para cada score manuscrito na coluna Set: extrai o número à esquerda do traço como pontos Equipa A, e à direita como pontos Equipa B.
4. confidence = "high" se lês claramente. Só "low" se houver ambiguidade real.
5. Sem código, associa por ronda + campo.
6. Jogo não identificável: matchCode = "".
7. Scores são inteiros 0-99. Se ilegível, coloca null.
8. Ignora jogos marcados [JÁ JOGADO].
9. Set sem nada escrito = null para ambos valores.
10. IMPORTANTE: Analisa CADA IMAGEM enviada. Se forem múltiplas fotos, cada uma pode ter jogos diferentes. Combina todos os resultados de todas as imagens.

Retorna APENAS JSON válido (sem markdown, sem \`\`\`, sem texto extra):
{
  "results": [
    {
      "matchCode": "M01",
      "roundIndex": 1,
      "courtName": "Campo 3",
      "set1A": 6, "set1B": 3,
      "set2A": null, "set2B": null,
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
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    temperature: 0.1,
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
    temperature: 0.1,
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
    const courtId = formData.get("courtId") as string | null;

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
    await requireLeagueManager(tournament.leagueId ?? "");

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
    // If courtId is specified, only include matches from that court (per-court sheet)
    const allMatches: MatchInfo[] = [];
    let matchSeq = 0;
    for (const round of tournament.rounds) {
      for (const match of round.matches) {
        matchSeq++;
        const matchCourtId = match.court?.id || match.courtId || "";
        // If a specific court is selected, skip matches from other courts
        if (courtId && matchCourtId !== courtId) continue;
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

    // If a specific court was selected, add context to the prompt
    const courtContext = courtId
      ? `\nIMPORTANTE: Esta folha é especificamente do ${allMatches[0]?.courtName || "campo selecionado"}. Todos os resultados pertencem a este campo. A coluna "Campo" não existe na folha pois é do mesmo campo.`
      : "";

    const prompt = buildPrompt(setsInfo, matchListText + courtContext);

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
