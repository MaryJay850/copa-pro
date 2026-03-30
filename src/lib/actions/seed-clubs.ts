"use server";

import { prisma } from "../db";
import { requireAdmin } from "../auth-guards";

// Complete list of padel clubs in Portugal, compiled from multiple sources
const PADEL_CLUBS_PORTUGAL = [
  // ═══════════════════════════════════════
  // PORTO & NORTE
  // ═══════════════════════════════════════
  { name: "PAC - Padel Athletic Club", location: "Porto", courts: 14 },
  { name: "Padel Inn", location: "Porto", courts: 10 },
  { name: "Top-padel Fluvial Indoor Center", location: "Porto, Lordelo do Ouro", courts: 6 },
  { name: "Top-padel Quinta do Fojo", location: "Vila Nova de Gaia", courts: 4 },
  { name: "Padel Tribe", location: "Leça da Palmeira", courts: 4 },
  { name: "ProRacket Squash & Padel", location: "Porto", courts: 8 },
  { name: "M9 Padel Center", location: "Maia", courts: 4 },
  { name: "Norte Padel", location: "Senhora da Hora", courts: 4 },
  { name: "PadeLovers Matosinhos", location: "Leça da Palmeira", courts: 3 },
  { name: "Total Padel", location: "Vila Nova de Gaia", courts: 4 },
  { name: "Just Club Vila Nova de Gaia", location: "Vila Nova de Gaia", courts: 4 },
  { name: "Quinta de Monserrate Gaia", location: "Valadares", courts: 4 },
  { name: "Quinta de Monserrate Clube", location: "Matosinhos", courts: 8 },
  { name: "Quinta de Monserrate Indoor", location: "Matosinhos", courts: 6 },
  { name: "Quinta de Monserrate Parque da Cidade", location: "Porto, Aldoar", courts: 4 },
  { name: "ProPadel Sports", location: "Espinho", courts: 3 },
  { name: "Pure Sports", location: "Porto, Foz", courts: 3 },
  { name: "Studio Wave", location: "Porto, Ramalde", courts: 2 },
  { name: "Parque da Aguda Ginásio", location: "Arcozelo", courts: 2 },
  { name: "D'Ouro Padel", location: "Porto", courts: 4 },
  { name: "Padel Up", location: "Maia", courts: 4 },
  { name: "Rio Padel", location: "Vila das Aves", courts: 3 },
  { name: "Major Padel Clube Douro", location: "Douro", courts: 8 },
  { name: "Spin Padel", location: "Rio de Mouro", courts: 3 },
  { name: "Fourlux Padel Center Paredes", location: "Paredes", courts: 4 },
  { name: "Fourlux Padel Center Felgueiras", location: "Felgueiras", courts: 4 },
  { name: "Fourlux Padel Center Marco de Canaveses", location: "Marco de Canaveses", courts: 3 },
  { name: "Fourlux Padel Center Paços de Ferreira", location: "Paços de Ferreira", courts: 4 },
  { name: "Padel Pedra", location: "Santo Tirso", courts: 3 },
  { name: "Padel Beat Freamunde", location: "Penafiel", courts: 3 },
  { name: "Padel Beat Lousada", location: "Lousada", courts: 3 },
  { name: "Padel Beat Penafiel", location: "Penafiel", courts: 3 },
  { name: "Pedras Tennis & Padel Academy", location: "Porto", courts: 4 },
  { name: "Clube Fluvial Portuense", location: "Porto", courts: 4 },

  // ═══════════════════════════════════════
  // BRAGA & MINHO
  // ═══════════════════════════════════════
  { name: "Top-padel Braga Center", location: "Braga", courts: 9 },
  { name: "DumePadel", location: "Braga", courts: 4 },
  { name: "Aru Sport - Relva Artificial", location: "Braga", courts: 3 },
  { name: "Bpadel", location: "Braga", courts: 4 },
  { name: "ASA Padel Guimarães", location: "Guimarães", courts: 6 },
  { name: "Warrior Padel Arena", location: "Guimarães", courts: 4 },
  { name: "Feel Padel", location: "Guimarães", courts: 3 },
  { name: "Fábrica do Ferro Padel", location: "Guimarães", courts: 4 },
  { name: "Padel Nation Vizela", location: "Vizela", courts: 3 },
  { name: "Famapadel", location: "Vila Nova de Famalicão", courts: 4 },
  { name: "Kampus Padel", location: "Vila Nova de Famalicão", courts: 4 },
  { name: "Padel Smash Club", location: "Viana do Castelo", courts: 2 },

  // ═══════════════════════════════════════
  // LISBOA & GRANDE LISBOA
  // ═══════════════════════════════════════
  { name: "Padel Campo Grande", location: "Lisboa, Alvalade", courts: 9 },
  { name: "Lisboa Racket Centre", location: "Lisboa", courts: 8 },
  { name: "LX Indoor Padel", location: "Loures", courts: 7 },
  { name: "Padel Clube VII", location: "Lisboa", courts: 7 },
  { name: "Rackets Pro Clube EUL", location: "Lisboa, Alvalade", courts: 6 },
  { name: "W Padel Country Club Monsanto", location: "Lisboa, Monsanto", courts: 6 },
  { name: "Indoor Padel Center", location: "Carnaxide", courts: 5 },
  { name: "Padel Factory Sintra", location: "Sintra", courts: 5 },
  { name: "AZ Padel Sintra", location: "Sintra, Abrunheira", courts: 8 },
  { name: "AirPadel", location: "Sacavém", courts: 4 },
  { name: "Sports Club Cascais", location: "Oeiras", courts: 4 },
  { name: "Padcenter", location: "Odivelas", courts: 4 },
  { name: "Ténis e Padel Boa Hora", location: "Lisboa, Ajuda", courts: 3 },
  { name: "ACE Team - Clube de Ténis & Padel de Alfragide", location: "Amadora", courts: 4 },
  { name: "Club de Padel Paiã", location: "Amadora", courts: 3 },
  { name: "Rackets Pro Clube Nacional Padel", location: "Lisboa, Campo de Ourique", courts: 4 },
  { name: "AZ Padel Tejo", location: "Alverca do Ribatejo", courts: 4 },
  { name: "JetSet Padel Club", location: "Sacavém", courts: 6 },
  { name: "CPA - Capital Padel Academy", location: "Cascais", courts: 4 },
  { name: "Padel Lemonfit", location: "Lisboa, Areeiro", courts: 3 },
  { name: "Rackets Pro Clube Saldanha", location: "Lisboa, Saldanha", courts: 4 },
  { name: "Zone Pro Padel", location: "São Domingos de Rana", courts: 4 },
  { name: "Direct Padel Indoor Bobadela", location: "Loures", courts: 4 },
  { name: "Quinta dos Lombos Padel", location: "Carcavelos", courts: 3 },
  { name: "Padel Set Club Parede", location: "Parede", courts: 3 },
  { name: "Carcavelos Ténis e Padel", location: "Carcavelos", courts: 3 },
  { name: "Padel Clube TAP by LXTEAM", location: "Lisboa, Olivais", courts: 4 },
  { name: "Vive Padel", location: "Lisboa, Marvila", courts: 4 },
  { name: "CIF Padel", location: "Lisboa, Ajuda", courts: 3 },
  { name: "Central Park Massamá", location: "Queluz", courts: 4 },
  { name: "Alverca Padel Club", location: "Alverca do Ribatejo", courts: 4 },
  { name: "Clube de Padel Alcântara", location: "Lisboa, Alcântara", courts: 3 },
  { name: "Padel Factory Expo", location: "Lisboa, Parque das Nações", courts: 5 },
  { name: "EPA - Evolution Padel Academy", location: "Sintra", courts: 4 },
  { name: "Clube Alto do Duque", location: "Amadora", courts: 4 },
  { name: "Ténis4You", location: "Lisboa", courts: 3 },
  { name: "Clube de Padel", location: "Lisboa", courts: 4 },
  { name: "Padel Tercena | GRT", location: "Queluz", courts: 3 },
  { name: "Quinta da Marinha", location: "Cascais", courts: 4 },
  { name: "Padel Sports Club", location: "Sintra", courts: 3 },

  // ═══════════════════════════════════════
  // SETÚBAL & MARGEM SUL
  // ═══════════════════════════════════════
  { name: "Game Set Padel", location: "Azeitão", courts: 3 },
  { name: "Rackets Pro Nova", location: "Almada", courts: 4 },
  { name: "Smash Padel Almada", location: "Almada", courts: 4 },
  { name: "Academia de Padel Pinhal Vidal", location: "Charneca de Caparica", courts: 3 },
  { name: "Almada Padel Academy", location: "Almada", courts: 4 },
  { name: "W Padel & Ténis Parque", location: "Barreiro", courts: 4 },
  { name: "PIC Padel Club", location: "Seixal", courts: 3 },
  { name: "A2N Padel Academy", location: "Seixal, Corroios", courts: 4 },
  { name: "G.O.A.T Padel", location: "Seixal", courts: 3 },
  { name: "Best Lane Padel", location: "Seixal", courts: 3 },
  { name: "Quinta do Anjo Padel", location: "Palmela", courts: 3 },
  { name: "KnockOut Padel", location: "Almada", courts: 3 },
  { name: "One Padel Club", location: "Montijo", courts: 3 },
  { name: "Clube Arrábida Padel", location: "Azeitão", courts: 3 },
  { name: "Alcochete Indoor Padel", location: "Alcochete", courts: 3 },
  { name: "Mr. Padel", location: "Moita", courts: 3 },
  { name: "Rackets Pro Clube Aquafitness", location: "Costa de Caparica", courts: 3 },
  { name: "PadelMode", location: "Almada, Verdizela", courts: 3 },
  { name: "TERRA CAFÉ - Padel Setúbal", location: "Setúbal", courts: 3 },
  { name: "Dream Padel Center", location: "Setúbal", courts: 4 },
  { name: "Padel In Sado", location: "Setúbal", courts: 3 },
  { name: "NovoPadel Club Setúbal", location: "Setúbal", courts: 4 },

  // ═══════════════════════════════════════
  // COIMBRA
  // ═══════════════════════════════════════
  { name: "Arena Padel Coimbra", location: "Coimbra", courts: 6 },
  { name: "Star Padel Outdoor Coimbra", location: "Coimbra", courts: 6 },
  { name: "77'Academy", location: "Coimbra", courts: 4 },
  { name: "Prime Padel", location: "Coimbra", courts: 3 },
  { name: "WePadel", location: "Coimbra", courts: 3 },
  { name: "N10 Padel", location: "Coimbra", courts: 3 },
  { name: "VCPadel", location: "Cernache, Coimbra", courts: 2 },
  { name: "Coimbra Rackets Club", location: "Coimbra", courts: 3 },

  // ═══════════════════════════════════════
  // LEIRIA
  // ═══════════════════════════════════════
  { name: "LisPadel Indoor", location: "Leiria", courts: 4 },
  { name: "Padel XXL", location: "Batalha", courts: 4 },
  { name: "Boa Vista Padel", location: "Leiria", courts: 3 },
  { name: "Elite Padel Club", location: "Leiria, Regueira de Pontes", courts: 3 },
  { name: "Racket Sports Club Leiria", location: "Leiria", courts: 3 },
  { name: "PadCampus", location: "Leiria", courts: 3 },
  { name: "Vila Padel Fátima", location: "Fátima", courts: 3 },
  { name: "Fatima Sports Center", location: "Fátima", courts: 3 },

  // ═══════════════════════════════════════
  // AVEIRO
  // ═══════════════════════════════════════
  { name: "4Padel Club Ílhavo", location: "Ílhavo, Aveiro", courts: 4 },
  { name: "Fbox Fitness & Padel Club", location: "Aveiro", courts: 3 },
  { name: "Fly Padel", location: "Aveiro", courts: 3 },
  { name: "Just Club Santa Maria da Feira", location: "Santa Maria da Feira", courts: 4 },
  { name: "Padel Star Oia", location: "Ovar", courts: 3 },

  // ═══════════════════════════════════════
  // ALGARVE (FARO)
  // ═══════════════════════════════════════
  { name: "Padel4Move", location: "Faro", courts: 3 },
  { name: "Albufeira Padel Clube", location: "Albufeira", courts: 3 },
  { name: "Quinta do Lago - The Campus", location: "Almancil", courts: 6 },
  { name: "Centro de Ténis e Padel de Faro", location: "Faro", courts: 7 },
  { name: "Vale do Lobo Tennis Academy", location: "Almancil", courts: 6 },
  { name: "Vilamoura Tennis & Padel Academy", location: "Quarteira", courts: 4 },
  { name: "Padel Club Alsakia", location: "Quarteira", courts: 3 },
  { name: "QR Padel - Quinta do Romão", location: "Quarteira", courts: 3 },
  { name: "Health Club do Browns", location: "Quarteira", courts: 3 },
  { name: "CTQ Quarteira Tennis Club", location: "Quarteira", courts: 3 },
  { name: "Clube Ténis e Padel São Brás de Alportel", location: "São Brás de Alportel", courts: 2 },
  { name: "Ocean Padel Club", location: "Lagos", courts: 4 },
  { name: "Dunas Douradas Beach Club", location: "Almancil", courts: 2 },

  // ═══════════════════════════════════════
  // VISEU
  // ═══════════════════════════════════════
  { name: "New Padel Chão da Fonte", location: "Viseu", courts: 3 },
  { name: "Padel Viseu Academy", location: "Viseu", courts: 4 },

  // ═══════════════════════════════════════
  // CASTELO BRANCO
  // ═══════════════════════════════════════
  { name: "Padel Castelo", location: "Castelo Branco", courts: 3 },
  { name: "Wolf Padel Club", location: "Covilhã", courts: 3 },

  // ═══════════════════════════════════════
  // SANTARÉM
  // ═══════════════════════════════════════
  { name: "Santarém Padel Center", location: "Santarém", courts: 3 },

  // ═══════════════════════════════════════
  // ÉVORA / ALENTEJO
  // ═══════════════════════════════════════
  { name: "Villa Padel - Padelmoz", location: "Estremoz", courts: 3 },
  { name: "Padel SW Alentejo", location: "Vila Nova de Milfontes", courts: 2 },

  // ═══════════════════════════════════════
  // MADEIRA
  // ═══════════════════════════════════════
  { name: "Play Padel Madeira", location: "Funchal", courts: 3 },
  { name: "Quinta do Padel", location: "Funchal", courts: 5 },
  { name: "Centro de Padel e Lazer", location: "Funchal", courts: 3 },
  { name: "Padel Centro Caniço", location: "Caniço, Madeira", courts: 2 },
  { name: "Quinta Magnólia", location: "Funchal", courts: 3 },

  // ═══════════════════════════════════════
  // AÇORES
  // ═══════════════════════════════════════
  { name: "Padel Azores", location: "Ponta Delgada, Açores", courts: 2 },
];

/**
 * Seeds the database with padel clubs from Portugal.
 * Only creates clubs that don't already exist (matched by name).
 * Requires admin access.
 */
export async function seedPadelClubsPortugal() {
  await requireAdmin();

  const existingClubs = await prisma.club.findMany({
    select: { name: true },
  });
  const existingNames = new Set(existingClubs.map((c) => c.name.toLowerCase()));

  let created = 0;
  let skipped = 0;

  for (const club of PADEL_CLUBS_PORTUGAL) {
    if (existingNames.has(club.name.toLowerCase())) {
      skipped++;
      continue;
    }

    const newClub = await prisma.club.create({
      data: {
        name: club.name,
        location: club.location,
      },
    });

    // Create courts for this club
    for (let i = 0; i < club.courts; i++) {
      await prisma.court.create({
        data: {
          clubId: newClub.id,
          name: `Campo ${i + 1}`,
          quality: "GOOD",
          orderIndex: i,
        },
      });
    }

    created++;
  }

  return {
    total: PADEL_CLUBS_PORTUGAL.length,
    created,
    skipped,
    message: `Importados ${created} clubes (${skipped} já existiam). Total de clubes no catálogo: ${PADEL_CLUBS_PORTUGAL.length}.`,
  };
}

/**
 * Returns the count of clubs that would be imported.
 */
export async function getImportPreview() {
  const existingClubs = await prisma.club.findMany({
    select: { name: true },
  });
  const existingNames = new Set(existingClubs.map((c) => c.name.toLowerCase()));

  const toCreate = PADEL_CLUBS_PORTUGAL.filter(
    (c) => !existingNames.has(c.name.toLowerCase())
  );
  const totalCourts = toCreate.reduce((acc, c) => acc + c.courts, 0);

  return {
    totalInCatalog: PADEL_CLUBS_PORTUGAL.length,
    alreadyExists: PADEL_CLUBS_PORTUGAL.length - toCreate.length,
    toCreate: toCreate.length,
    totalCourtsToCreate: totalCourts,
    byRegion: [
      { region: "Porto & Norte", count: toCreate.filter((c) => ["Porto", "Vila Nova de Gaia", "Maia", "Matosinhos", "Espinho", "Leça da Palmeira", "Senhora da Hora", "Valadares", "Arcozelo", "Vila das Aves", "Douro", "Rio de Mouro", "Paredes", "Felgueiras", "Marco de Canaveses", "Paços de Ferreira", "Santo Tirso", "Penafiel", "Lousada"].some((loc) => c.location.includes(loc))).length },
      { region: "Braga & Minho", count: toCreate.filter((c) => ["Braga", "Guimarães", "Vizela", "Famalicão", "Viana do Castelo"].some((loc) => c.location.includes(loc))).length },
      { region: "Lisboa", count: toCreate.filter((c) => ["Lisboa", "Loures", "Carnaxide", "Sintra", "Sacavém", "Oeiras", "Odivelas", "Amadora", "Alverca", "Cascais", "Queluz", "Carcavelos", "Parede", "São Domingos de Rana"].some((loc) => c.location.includes(loc))).length },
      { region: "Setúbal", count: toCreate.filter((c) => ["Almada", "Seixal", "Barreiro", "Setúbal", "Azeitão", "Palmela", "Montijo", "Moita", "Alcochete", "Caparica", "Verdizela", "Corroios"].some((loc) => c.location.includes(loc))).length },
      { region: "Coimbra", count: toCreate.filter((c) => c.location.includes("Coimbra") || c.location.includes("Cernache")).length },
      { region: "Leiria", count: toCreate.filter((c) => ["Leiria", "Batalha", "Fátima"].some((loc) => c.location.includes(loc))).length },
      { region: "Aveiro", count: toCreate.filter((c) => ["Aveiro", "Ílhavo", "Feira", "Ovar"].some((loc) => c.location.includes(loc))).length },
      { region: "Algarve", count: toCreate.filter((c) => ["Faro", "Albufeira", "Almancil", "Quarteira", "São Brás", "Lagos"].some((loc) => c.location.includes(loc))).length },
      { region: "Outros", count: toCreate.filter((c) => ["Viseu", "Castelo Branco", "Covilhã", "Santarém", "Estremoz", "Milfontes", "Funchal", "Caniço", "Madeira", "Açores", "Ponta Delgada"].some((loc) => c.location.includes(loc))).length },
    ],
  };
}
