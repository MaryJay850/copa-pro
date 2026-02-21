"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type RankingRow = {
  position: number;
  playerName: string;
  pointsTotal: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setsDiff: number;
};

export function ExportPDF({
  title,
  rankings,
  type = "ranking",
}: {
  title: string;
  rankings: RankingRow[];
  type?: "ranking" | "results";
}) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.setTextColor(37, 99, 235); // primary blue
      doc.text(title, 14, 22);

      // Date
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-PT")}`, 14, 30);

      // Subtitle
      doc.setFontSize(10);
      doc.text("CopaPro - Gest\u00E3o de Ligas de Padel", 14, 36);

      // Table
      autoTable(doc, {
        startY: 42,
        head: [["#", "Jogador", "Pts", "J", "V", "E", "D", "SG", "SP", "DS"]],
        body: rankings.map((r) => [
          r.position,
          r.playerName,
          r.pointsTotal,
          r.matchesPlayed,
          r.wins,
          r.draws,
          r.losses,
          r.setsWon,
          r.setsLost,
          r.setsDiff > 0 ? `+${r.setsDiff}` : r.setsDiff,
        ]),
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: {
          0: { cellWidth: 12, halign: "center" },
          1: { cellWidth: 45 },
          2: { cellWidth: 14, halign: "center", fontStyle: "bold" },
          3: { cellWidth: 12, halign: "center" },
          4: { cellWidth: 12, halign: "center" },
          5: { cellWidth: 12, halign: "center" },
          6: { cellWidth: 12, halign: "center" },
          7: { cellWidth: 14, halign: "center" },
          8: { cellWidth: 14, halign: "center" },
          9: { cellWidth: 14, halign: "center" },
        },
      });

      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text("Gerado por CopaPro", 14, pageHeight - 10);

      doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (e) {
      console.error("PDF export error:", e);
      toast.error("Erro ao exportar PDF.");
    }
    setExporting(false);
  };

  if (rankings.length === 0) return null;

  return (
    <Button onClick={handleExport} disabled={exporting} size="sm" variant="secondary">
      {exporting ? "A exportar..." : "\u{1F4C4} Exportar PDF"}
    </Button>
  );
}
