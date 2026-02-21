const APP_URL = process.env.APP_URL || "http://localhost:3000";

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f8fafc;color:#1e293b;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="font-size:28px;margin:0;color:#1e293b;font-weight:800;">
        Copa<span style="color:#10b981;">Pro</span>
      </h1>
      <p style="font-size:12px;color:#94a3b8;margin:4px 0 0;">Gestão de Ligas de Padel</p>
    </div>
    <div style="background:white;border-radius:12px;border:1px solid #e2e8f0;padding:32px;">
      ${content}
    </div>
    <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:24px;">
      Este email foi enviado automaticamente pela plataforma CopaPro.<br>
      <a href="${APP_URL}" style="color:#10b981;text-decoration:none;">${APP_URL}</a>
    </p>
  </div>
</body>
</html>`;
}

function button(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#10b981;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:16px 0;">${text}</a>`;
}

function statusBadge(text: string, color: string): string {
  const colors: Record<string, string> = {
    green: "background:#dcfce7;color:#166534;",
    yellow: "background:#fef9c3;color:#854d0e;",
    red: "background:#fee2e2;color:#991b1b;",
    blue: "background:#dbeafe;color:#1e40af;",
  };
  return `<span style="display:inline-block;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:600;${colors[color] || colors.green}">${text}</span>`;
}

// ── Template 1: Boas-vindas ──

export function welcomeEmail(data: { fullName: string; email: string }): string {
  return baseLayout(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#1e293b;">Bem-vindo ao CopaPro! 🎾</h2>
    <p style="color:#475569;line-height:1.6;margin:0 0 12px;">
      Olá <strong>${data.fullName}</strong>,
    </p>
    <p style="color:#475569;line-height:1.6;margin:0 0 12px;">
      A sua conta foi criada com sucesso. Já pode aceder à plataforma e juntar-se a ligas de padel.
    </p>
    <p style="color:#475569;line-height:1.6;margin:0 0 4px;">
      <strong>Email:</strong> ${data.email}
    </p>
    <div style="text-align:center;margin:24px 0 8px;">
      ${button("Aceder ao CopaPro", `${APP_URL}/dashboard`)}
    </div>
    <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;">
      Se não criou esta conta, pode ignorar este email.
    </p>
  `);
}

// ── Template 2: Recuperação de password ──

export function passwordRecoveryEmail(data: { fullName: string; tempPassword: string }): string {
  return baseLayout(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#1e293b;">Recuperação de Palavra-passe 🔑</h2>
    <p style="color:#475569;line-height:1.6;margin:0 0 12px;">
      Olá <strong>${data.fullName}</strong>,
    </p>
    <p style="color:#475569;line-height:1.6;margin:0 0 12px;">
      Foi solicitada a recuperação da sua palavra-passe. Aqui está a sua palavra-passe temporária:
    </p>
    <div style="background:#f1f5f9;border:2px dashed #cbd5e1;border-radius:8px;padding:16px;text-align:center;margin:16px 0;">
      <code style="font-size:24px;font-weight:700;letter-spacing:3px;color:#1e293b;">${data.tempPassword}</code>
    </div>
    <p style="color:#475569;line-height:1.6;margin:0 0 12px;">
      Use esta palavra-passe para iniciar sessão. Será obrigado a definir uma nova palavra-passe no primeiro acesso.
    </p>
    <div style="text-align:center;margin:24px 0 8px;">
      ${button("Iniciar Sessão", `${APP_URL}/login`)}
    </div>
    <p style="color:#ef4444;font-size:12px;font-weight:600;margin:16px 0 0;">
      ⚠️ Se não solicitou esta recuperação, altere a sua palavra-passe imediatamente.
    </p>
  `);
}

// ── Template 3: Lembrete 24h antes do torneio (para gestores/admin) ──

export function tournamentReminderManagerEmail(data: {
  tournamentName: string;
  leagueName: string;
  startDate: string;
  inscriptions: { playerName: string; status: string }[];
}): string {
  const statusMap: Record<string, { label: string; color: string }> = {
    TITULAR: { label: "Titular", color: "green" },
    SUPLENTE: { label: "Suplente", color: "yellow" },
    PROMOVIDO: { label: "Promovido", color: "green" },
    DESISTIU: { label: "Desistiu", color: "red" },
  };

  const rows = data.inscriptions
    .map((i) => {
      const s = statusMap[i.status] || statusMap.TITULAR;
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${i.playerName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">${statusBadge(s.label, s.color)}</td>
      </tr>`;
    })
    .join("");

  const titulares = data.inscriptions.filter((i) => i.status === "TITULAR" || i.status === "PROMOVIDO").length;
  const suplentes = data.inscriptions.filter((i) => i.status === "SUPLENTE").length;

  return baseLayout(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#1e293b;">Torneio Amanhã! 📋</h2>
    <p style="color:#475569;line-height:1.6;margin:0 0 12px;">
      O torneio <strong>${data.tournamentName}</strong> da liga <strong>${data.leagueName}</strong>
      está agendado para <strong>${data.startDate}</strong>.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin:16px 0;">
      <strong style="color:#166534;">${titulares} titulares</strong>
      ${suplentes > 0 ? ` · <strong style="color:#854d0e;">${suplentes} suplentes</strong>` : ""}
    </div>
    <h3 style="font-size:14px;color:#64748b;margin:16px 0 8px;">Lista de Inscritos</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:8px 12px;text-align:left;font-weight:600;color:#64748b;font-size:12px;">Jogador</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;color:#64748b;font-size:12px;">Estado</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:#475569;line-height:1.6;margin:16px 0 0;">
      Por favor confirme que está tudo em ordem para o torneio de amanhã.
    </p>
    <div style="text-align:center;margin:24px 0 8px;">
      ${button("Ver Torneio", `${APP_URL}/dashboard`)}
    </div>
  `);
}

// ── Template 4: Dia do torneio (para jogadores) ──

export function tournamentDayPlayerEmail(data: {
  playerName: string;
  tournamentName: string;
  leagueName: string;
  teamName: string;
  teamPartner: string | null;
  rounds: { roundIndex: number; opponent: string; courtName: string }[];
}): string {
  const roundRows = data.rounds
    .map(
      (r) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;">Ronda ${r.roundIndex}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">vs ${r.opponent}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#64748b;">${r.courtName}</td>
      </tr>`
    )
    .join("");

  return baseLayout(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#1e293b;">Hoje é Dia de Torneio! 🏆</h2>
    <p style="color:#475569;line-height:1.6;margin:0 0 12px;">
      Olá <strong>${data.playerName}</strong>,
    </p>
    <p style="color:#475569;line-height:1.6;margin:0 0 16px;">
      Hoje joga no torneio <strong>${data.tournamentName}</strong> da liga <strong>${data.leagueName}</strong>.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 4px;font-size:12px;color:#64748b;font-weight:600;">A SUA EQUIPA</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#166534;">${data.teamName}</p>
      ${data.teamPartner ? `<p style="margin:4px 0 0;color:#475569;">Parceiro: <strong>${data.teamPartner}</strong></p>` : ""}
    </div>
    ${data.rounds.length > 0 ? `
    <h3 style="font-size:14px;color:#64748b;margin:16px 0 8px;">Os Seus Jogos</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:8px 12px;text-align:left;font-weight:600;color:#64748b;font-size:12px;">Ronda</th>
          <th style="padding:8px 12px;text-align:left;font-weight:600;color:#64748b;font-size:12px;">Adversário</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;color:#64748b;font-size:12px;">Campo</th>
        </tr>
      </thead>
      <tbody>${roundRows}</tbody>
    </table>
    ` : ""}
    <p style="color:#475569;line-height:1.6;margin:16px 0 0;">
      Boa sorte e bons jogos! 💪
    </p>
  `);
}

// ── Template 5: Suplente promovido ──

export function substitutePromotedEmail(data: {
  playerName: string;
  tournamentName: string;
  leagueName: string;
  teamName: string;
}): string {
  return baseLayout(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#1e293b;">Foi Promovido a Titular! 🎉</h2>
    <p style="color:#475569;line-height:1.6;margin:0 0 12px;">
      Olá <strong>${data.playerName}</strong>,
    </p>
    <p style="color:#475569;line-height:1.6;margin:0 0 12px;">
      Boas notícias! Foi promovido de <strong>suplente</strong> a <strong>titular</strong> no torneio
      <strong>${data.tournamentName}</strong> da liga <strong>${data.leagueName}</strong>.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;color:#64748b;font-weight:600;">A SUA EQUIPA</p>
      <p style="margin:0;font-size:20px;font-weight:700;color:#166534;">${data.teamName}</p>
    </div>
    <p style="color:#475569;line-height:1.6;margin:0 0 12px;">
      Confirme a sua disponibilidade e prepare-se para jogar!
    </p>
    <div style="text-align:center;margin:24px 0 8px;">
      ${button("Ver Torneio", `${APP_URL}/dashboard`)}
    </div>
  `);
}

// ── Template 6: Confirmação de inscrição ──

export function inscriptionConfirmationEmail(data: {
  playerName: string;
  tournamentName: string;
  leagueName: string;
  status: "TITULAR" | "SUPLENTE";
  orderIndex?: number;
}): string {
  const isTitular = data.status === "TITULAR";

  return baseLayout(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#1e293b;">Inscrição Confirmada! ✅</h2>
    <p style="color:#475569;line-height:1.6;margin:0 0 12px;">
      Olá <strong>${data.playerName}</strong>,
    </p>
    <p style="color:#475569;line-height:1.6;margin:0 0 12px;">
      A sua inscrição no torneio <strong>${data.tournamentName}</strong> da liga
      <strong>${data.leagueName}</strong> foi confirmada.
    </p>
    <div style="background:${isTitular ? "#f0fdf4;border:1px solid #bbf7d0" : "#fffbeb;border:1px solid #fde68a"};border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;color:#64748b;font-weight:600;">ESTADO DA INSCRIÇÃO</p>
      <p style="margin:0;font-size:20px;font-weight:700;color:${isTitular ? "#166534" : "#854d0e"};">
        ${isTitular ? "Titular" : `Suplente #${data.orderIndex || ""}`}
      </p>
    </div>
    ${!isTitular ? `
    <p style="color:#475569;line-height:1.6;margin:0 0 12px;">
      Está atualmente na lista de suplentes. Caso algum jogador titular desista,
      será automaticamente promovido por ordem de inscrição.
    </p>
    ` : `
    <p style="color:#475569;line-height:1.6;margin:0 0 12px;">
      Está confirmado como titular. Receberá mais detalhes sobre equipas e calendário
      mais perto da data do torneio.
    </p>
    `}
    <div style="text-align:center;margin:24px 0 8px;">
      ${button("Ver Torneio", `${APP_URL}/dashboard`)}
    </div>
  `);
}

// ── Template 7: Torneio terminado ──

export function tournamentFinishedEmail(data: {
  playerName: string;
  tournamentName: string;
  leagueName: string;
  rankings: { position: number; teamName: string; points: number; wins: number; losses: number }[];
  tournamentUrl: string;
}): string {
  const rows = data.rankings
    .map(
      (r) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:700;${r.position <= 3 ? "color:#10b981;" : ""}">${r.position}º</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:${r.position <= 3 ? "700" : "400"};">${r.teamName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${r.points}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#16a34a;">${r.wins}V</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#dc2626;">${r.losses}D</td>
      </tr>`
    )
    .join("");

  return baseLayout(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#1e293b;">Torneio Terminado! 🏆</h2>
    <p style="color:#475569;line-height:1.6;margin:0 0 12px;">
      Olá <strong>${data.playerName}</strong>,
    </p>
    <p style="color:#475569;line-height:1.6;margin:0 0 16px;">
      O torneio <strong>${data.tournamentName}</strong> da liga <strong>${data.leagueName}</strong> terminou.
      Aqui estão os resultados finais:
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:8px 12px;text-align:center;font-weight:600;color:#64748b;font-size:12px;">#</th>
          <th style="padding:8px 12px;text-align:left;font-weight:600;color:#64748b;font-size:12px;">Equipa</th>
          <th style="padding:8px 12px;text-align:center;font-weight:600;color:#64748b;font-size:12px;">Pts</th>
          <th style="padding:8px 12px;text-align:center;font-weight:600;color:#64748b;font-size:12px;">V</th>
          <th style="padding:8px 12px;text-align:center;font-weight:600;color:#64748b;font-size:12px;">D</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="text-align:center;margin:24px 0 8px;">
      ${button("Ver Detalhes", data.tournamentUrl)}
    </div>
    <p style="color:#475569;line-height:1.6;margin:16px 0 0;">
      Obrigado por participar! Até ao próximo torneio! 🎾
    </p>
  `);
}

// ── Template 8: Link de convite para liga ──

export function leagueInviteLinkEmail(data: {
  managerName: string;
  leagueName: string;
  inviteUrl: string;
  expiresAt: string;
}): string {
  return baseLayout(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#1e293b;">Link de Convite Criado 🔗</h2>
    <p style="color:#475569;line-height:1.6;margin:0 0 12px;">
      Olá <strong>${data.managerName}</strong>,
    </p>
    <p style="color:#475569;line-height:1.6;margin:0 0 12px;">
      Foi criado um novo link de convite para a liga <strong>${data.leagueName}</strong>.
      Partilhe este link com os jogadores que deseja convidar:
    </p>
    <div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
      <a href="${data.inviteUrl}" style="font-size:14px;color:#10b981;word-break:break-all;font-weight:600;">${data.inviteUrl}</a>
    </div>
    <p style="color:#94a3b8;font-size:12px;margin:8px 0 16px;text-align:center;">
      Válido até: ${data.expiresAt}
    </p>
    <p style="color:#475569;line-height:1.6;margin:0 0 12px;">
      Os jogadores que utilizarem este link serão automaticamente adicionados à liga.
    </p>
  `);
}
