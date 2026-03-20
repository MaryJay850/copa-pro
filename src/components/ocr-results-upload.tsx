"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { saveMatchScore } from "@/lib/actions";
import { sanitizeError } from "@/lib/error-utils";

interface MatchInfo {
  id: string;
  roundIndex: number;
  courtName: string;
  teamAName: string;
  teamBName: string;
  status: string;
}

interface OcrResultsUploadProps {
  tournamentId: string;
  matches: MatchInfo[];
  numberOfSets: number;
}

interface MatchedResult {
  matchId: string;
  roundIndex: number;
  courtName: string;
  teamAName: string;
  teamBName: string;
  matchCode: string;
  set1A: number | null;
  set1B: number | null;
  set2A: number | null;
  set2B: number | null;
  set3A: number | null;
  set3B: number | null;
  confidence: "high" | "low";
  status: "matched" | "unmatched";
  selected: boolean;
}

type Phase = "upload" | "processing" | "preview" | "saving";

/**
 * Pre-process image for better OCR: high contrast grayscale + sharpen.
 * Returns a Blob of the processed JPEG image.
 */
async function preprocessImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Limit max dimension to 2048px to reduce API cost while keeping quality
      const maxDim = 2048;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        const scale = maxDim / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      // Draw original
      ctx.drawImage(img, 0, 0, w, h);

      // Get pixel data
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      // Pass 1: Convert to grayscale and calculate histogram for adaptive threshold
      const grayValues = new Uint8Array(w * h);
      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        grayValues[i / 4] = gray;
      }

      // Calculate Otsu's threshold for adaptive binarization hint
      let sum = 0;
      const histogram = new Array(256).fill(0);
      for (let i = 0; i < grayValues.length; i++) {
        histogram[grayValues[i]]++;
        sum += grayValues[i];
      }

      let sumB = 0;
      let wB = 0;
      let maxVariance = 0;
      let threshold = 128;
      const total = grayValues.length;

      for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0) continue;
        const wF = total - wB;
        if (wF === 0) break;
        sumB += t * histogram[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const variance = wB * wF * (mB - mF) * (mB - mF);
        if (variance > maxVariance) {
          maxVariance = variance;
          threshold = t;
        }
      }

      // Pass 2: Apply contrast stretch + soft thresholding
      // Instead of hard black/white, we boost contrast aggressively
      // This preserves some gradation for the AI to read
      for (let i = 0; i < grayValues.length; i++) {
        let v = grayValues[i];

        // Contrast stretch: expand range around threshold
        if (v < threshold) {
          // Dark pixels: make darker (ink/handwriting)
          v = Math.max(0, Math.round((v / threshold) * 80));
        } else {
          // Light pixels: make lighter (paper background)
          v = Math.min(255, Math.round(180 + ((v - threshold) / (255 - threshold)) * 75));
        }

        const idx = i * 4;
        data[idx] = v;
        data[idx + 1] = v;
        data[idx + 2] = v;
        // alpha stays 255
      }

      ctx.putImageData(imageData, 0, 0);

      // Export as JPEG with good quality
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to process image"));
        },
        "image/jpeg",
        0.92
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export function OcrResultsUpload({
  tournamentId,
  matches,
  numberOfSets,
}: OcrResultsUploadProps) {
  const [phase, setPhase] = useState<Phase>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [results, setResults] = useState<MatchedResult[]>([]);
  const [saveProgress, setSaveProgress] = useState({ done: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scheduledMatches = matches.filter((m) => m.status === "SCHEDULED");

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).slice(0, 5);
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      toast.error("Selecione pelo menos uma foto.");
      return;
    }

    setPhase("processing");

    try {
      // Pre-process images for better OCR (contrast + grayscale)
      const processedFiles: Blob[] = [];
      for (const file of files) {
        try {
          const processed = await preprocessImage(file);
          processedFiles.push(processed);
        } catch {
          // If processing fails, use original
          processedFiles.push(file);
        }
      }

      const formData = new FormData();
      formData.append("tournamentId", tournamentId);
      for (let i = 0; i < processedFiles.length; i++) {
        formData.append("images", processedFiles[i], files[i].name);
      }

      const response = await fetch("/api/ocr-results", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao analisar fotos.");
      }

      // Debug: log raw API response to browser console
      console.log("[OCR] API response:", JSON.stringify(data, null, 2));

      const matchedResults: MatchedResult[] = (data.results || []).map(
        (r: any) => ({
          ...r,
          selected: r.status === "matched",
        })
      );

      setResults(matchedResults);
      setPhase("preview");

      const matched = matchedResults.filter((r) => r.status === "matched").length;
      const total = matchedResults.length;
      toast.success(`${matched}/${total} resultados identificados.`);
    } catch (e) {
      toast.error(sanitizeError(e, "Erro ao analisar fotos."));
      setPhase("upload");
    }
  };

  const updateScore = (
    index: number,
    field: "set1A" | "set1B" | "set2A" | "set2B" | "set3A" | "set3B",
    value: string
  ) => {
    setResults((prev) =>
      prev.map((r, i) =>
        i === index
          ? { ...r, [field]: value === "" ? null : parseInt(value, 10) }
          : r
      )
    );
  };

  const toggleSelected = (index: number) => {
    setResults((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, selected: !r.selected } : r
      )
    );
  };

  const handleSave = async () => {
    const toSave = results.filter(
      (r) => r.selected && r.status === "matched" && r.matchId
    );

    if (toSave.length === 0) {
      toast.error("Nenhum resultado selecionado para guardar.");
      return;
    }

    setPhase("saving");
    setSaveProgress({ done: 0, total: toSave.length });

    let saved = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const result of toSave) {
      try {
        const res = await saveMatchScore(result.matchId, {
          set1A: result.set1A,
          set1B: result.set1B,
          set2A: result.set2A,
          set2B: result.set2B,
          set3A: result.set3A,
          set3B: result.set3B,
        });

        if ("success" in res && !res.success) {
          failed++;
          errors.push(
            `${result.matchCode}: ${res.error}`
          );
        } else {
          saved++;
        }
      } catch (e) {
        failed++;
        errors.push(
          `${result.matchCode}: ${sanitizeError(e, "Erro")}`
        );
      }

      setSaveProgress((prev) => ({ ...prev, done: prev.done + 1 }));
    }

    if (failed === 0) {
      toast.success(`${saved} resultado${saved !== 1 ? "s" : ""} guardado${saved !== 1 ? "s" : ""} com sucesso.`);
    } else {
      toast.error(
        `${saved} guardado${saved !== 1 ? "s" : ""}, ${failed} falharam.`
      );
      console.error("[OCR Save errors]", errors);
    }

    // Reload to show updated scores
    setTimeout(() => window.location.reload(), 800);
  };

  const handleReset = () => {
    setPhase("upload");
    setFiles([]);
    setPreviews([]);
    setResults([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (scheduledMatches.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          OCR de Resultados
        </CardTitle>
      </CardHeader>

      <div className="px-5 pb-5">
        {/* Upload Phase */}
        {phase === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Tire foto(s) das folhas de resultados escritos à mão. A IA irá
              identificar os jogos e scores automaticamente.
            </p>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handleFilesSelected}
                className="hidden"
                id="ocr-file-input"
              />
              <label
                htmlFor="ocr-file-input"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors text-sm"
              >
                <svg
                  className="w-5 h-5 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Selecionar fotos (máx. 5)
              </label>
            </div>

            {previews.length > 0 && (
              <div className="flex gap-3 flex-wrap">
                {previews.map((src, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={src}
                      alt={`Foto ${i + 1}`}
                      className="w-24 h-24 object-cover rounded-lg border border-border"
                    />
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}

            {files.length > 0 && (
              <Button onClick={handleAnalyze}>
                Analisar {files.length} foto{files.length !== 1 ? "s" : ""}
              </Button>
            )}

            <p className="text-xs text-text-muted">
              {scheduledMatches.length} jogo{scheduledMatches.length !== 1 ? "s" : ""} pendente{scheduledMatches.length !== 1 ? "s" : ""} neste torneio.
            </p>
          </div>
        )}

        {/* Processing Phase */}
        {phase === "processing" && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-text-muted">A analisar fotos com IA...</p>
            <p className="text-xs text-text-muted">Isto pode demorar alguns segundos.</p>
          </div>
        )}

        {/* Preview Phase */}
        {phase === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-muted">
                {results.filter((r) => r.status === "matched").length} de{" "}
                {results.length} resultados associados a jogos.
              </p>
              <Button size="sm" variant="ghost" onClick={handleReset}>
                Nova Análise
              </Button>
            </div>

            {/* Results table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 pr-2 w-8"></th>
                    <th className="pb-2 pr-2 w-12">Cod</th>
                    <th className="pb-2 pr-2">Ronda</th>
                    <th className="pb-2 pr-2">Equipa A</th>
                    <th className="pb-2 pr-2 text-center" colSpan={numberOfSets === 1 ? 1 : numberOfSets === 2 ? 2 : 3}>
                      Resultado
                    </th>
                    <th className="pb-2">Equipa B</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const bgColor =
                      r.status === "unmatched"
                        ? "bg-red-50"
                        : r.confidence === "low"
                        ? "bg-amber-50"
                        : "bg-green-50";

                    return (
                      <tr key={i} className={`${bgColor} border-b border-border/50`}>
                        <td className="py-2 pr-2">
                          {r.status === "matched" && (
                            <input
                              type="checkbox"
                              checked={r.selected}
                              onChange={() => toggleSelected(i)}
                              className="rounded"
                            />
                          )}
                        </td>
                        <td className="py-2 pr-2 font-mono text-xs text-text-muted">
                          {r.matchCode || "?"}
                        </td>
                        <td className="py-2 pr-2 text-text-muted text-xs">
                          R{r.roundIndex > 0 ? r.roundIndex : "?"}
                        </td>
                        <td className="py-2 pr-2 font-medium">{r.teamAName}</td>
                        <td className="py-2 pr-1 text-center" colSpan={numberOfSets === 1 ? 1 : numberOfSets === 2 ? 2 : 3}>
                          <div className="flex items-center justify-center gap-1">
                            <ScoreInput
                              value={r.set1A}
                              onChange={(v) => updateScore(i, "set1A", v)}
                              disabled={r.status === "unmatched"}
                            />
                            <span className="text-text-muted">-</span>
                            <ScoreInput
                              value={r.set1B}
                              onChange={(v) => updateScore(i, "set1B", v)}
                              disabled={r.status === "unmatched"}
                            />
                            {numberOfSets >= 2 && (
                              <>
                                <span className="text-text-muted mx-1">/</span>
                                <ScoreInput
                                  value={r.set2A}
                                  onChange={(v) => updateScore(i, "set2A", v)}
                                  disabled={r.status === "unmatched"}
                                />
                                <span className="text-text-muted">-</span>
                                <ScoreInput
                                  value={r.set2B}
                                  onChange={(v) => updateScore(i, "set2B", v)}
                                  disabled={r.status === "unmatched"}
                                />
                              </>
                            )}
                            {numberOfSets >= 3 && (
                              <>
                                <span className="text-text-muted mx-1">/</span>
                                <ScoreInput
                                  value={r.set3A}
                                  onChange={(v) => updateScore(i, "set3A", v)}
                                  disabled={r.status === "unmatched"}
                                />
                                <span className="text-text-muted">-</span>
                                <ScoreInput
                                  value={r.set3B}
                                  onChange={(v) => updateScore(i, "set3B", v)}
                                  disabled={r.status === "unmatched"}
                                />
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-2 font-medium">{r.teamBName}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-xs text-text-muted flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-200 inline-block" /> Identificado
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-amber-200 inline-block" /> Baixa confiança
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-200 inline-block" /> Não identificado
              </span>
            </div>

            {/* Save button */}
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={results.filter((r) => r.selected && r.status === "matched").length === 0}
              >
                Guardar {results.filter((r) => r.selected && r.status === "matched").length} Resultado{results.filter((r) => r.selected && r.status === "matched").length !== 1 ? "s" : ""}
              </Button>
              <Button variant="ghost" onClick={handleReset}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Saving Phase */}
        {phase === "saving" && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-text-muted">
              A guardar {saveProgress.done}/{saveProgress.total} resultados...
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

function ScoreInput({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <input
      type="number"
      min={0}
      max={99}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-10 h-7 text-center text-sm rounded border border-border bg-white disabled:bg-gray-100 disabled:text-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}
