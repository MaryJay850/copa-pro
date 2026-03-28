"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateUserProfile, updateUserPassword } from "@/lib/actions";
import { sanitizeError } from "@/lib/error-utils";

type ProfileData = {
  id: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  player: {
    id: string;
    fullName: string;
    nickname: string | null;
    level: string | null;
    eloRating: number;
  } | null;
};

type ActiveTab = "settings";

export function ProfileContent({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>("settings");

  // Personal data form
  const [fullName, setFullName] = useState(profile.player?.fullName ?? "");
  const [nickname, setNickname] = useState(profile.player?.nickname ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [level, setLevel] = useState(profile.player?.level ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const initials = profile.player?.fullName
    ? profile.player.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : profile.email?.[0]?.toUpperCase() ?? "?";

  const displayName = profile.player?.fullName || profile.email;
  const roleLabel =
    profile.role === "ADMINISTRADOR"
      ? "Administrador"
      : profile.role === "GESTOR"
        ? "Gestor"
        : "Jogador";

  const memberSince = new Date(profile.createdAt).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserProfile({ fullName, nickname, phone, level });
      toast.success("Perfil atualizado com sucesso!");
      router.refresh();
    } catch (err) {
      toast.error(sanitizeError(err, "Erro ao guardar perfil."));
    }
    setSavingProfile(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("A nova palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As palavras-passe não coincidem.");
      return;
    }
    setSavingPassword(true);
    try {
      await updateUserPassword({ currentPassword, newPassword });
      toast.success("Palavra-passe alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(sanitizeError(err, "Erro ao alterar palavra-passe."));
    }
    setSavingPassword(false);
  };

  const inputClass = "w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors";

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ─── Top Header Card ─── */}
      <div className="rounded-lg shadow-card bg-surface border border-border overflow-hidden">
        {/* Gradient banner */}
        <div className="h-28" style={{ background: "linear-gradient(to right, #5766da, #7c6fe0, #a78bfa)" }} />

        <div className="px-6 pb-6 relative">
          {/* Avatar overlapping banner */}
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border-4 border-surface absolute -top-10 left-6" style={{ background: "linear-gradient(to bottom right, #5766da, #8b9cf7)" }}>
            <span className="text-2xl font-extrabold text-white">{initials}</span>
          </div>

          {/* Content below avatar */}
          <div className="pt-14 flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Name & Role */}
            <div className="flex-1">
              <h1 className="text-xl font-extrabold tracking-tight">{displayName}</h1>
              <div className="flex items-center gap-2 mt-1">
                {profile.player?.nickname && (
                  <span className="text-sm text-text-muted">&quot;{profile.player.nickname}&quot;</span>
                )}
                <Badge variant="default">{roleLabel}</Badge>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-6">
              {profile.player && (
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-primary">{profile.player.eloRating}</p>
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Rating Elo</p>
                </div>
              )}
              {profile.player?.level && (
                <div className="text-center">
                  <p className="text-sm font-bold text-text">{profile.player.level}</p>
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Nível</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-sm font-bold text-text">{memberSince.split(" ").slice(1).join(" ")}</p>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Membro desde</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Body: Sidebar + Content ─── */}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Left Sidebar */}
        <div className="space-y-5">
          {/* Navigation tabs */}
          <Card className="p-3">
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "settings"
                  ? "text-primary bg-primary/8"
                  : "text-text hover:bg-surface-hover"
              }`}
            >
              Definições
            </button>
          </Card>

          {/* Personal Information */}
          <Card className="py-5 px-5">
            <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">Informação Pessoal</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-text-muted font-medium">Sobre</p>
                <p className="text-sm text-text mt-0.5">
                  {profile.player?.level
                    ? `Jogador de padel de nível ${profile.player.level.toLowerCase()}.`
                    : "Jogador de padel registado na plataforma CopaPro."}
                </p>
              </div>
            </div>
          </Card>

          {/* Contact */}
          <Card className="py-5 px-5">
            <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">Contacto</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">Email</p>
                  <p className="text-sm font-medium text-text truncate">{profile.email}</p>
                </div>
              </div>
              {profile.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-text-muted">Telefone</p>
                    <p className="text-sm font-medium text-text">{profile.phone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">Membro desde</p>
                  <p className="text-sm font-medium text-text">{memberSince}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Content Area */}
        <div className="space-y-6">
          {activeTab === "settings" && (
            <>
              {/* Profile Settings Form */}
              <Card className="py-5 px-6">
                <h2 className="text-base font-bold mb-5 flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Dados Pessoais
                </h2>
                <form onSubmit={handleSaveProfile} className="space-y-5">
                  {profile.player && (
                    <>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-text-muted mb-1.5">
                            Nome Completo
                          </label>
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-text-muted mb-1.5">
                            Alcunha
                          </label>
                          <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Ex: Zé, Manel..."
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-text-muted mb-1.5">
                            Email
                          </label>
                          <input
                            type="email"
                            value={profile.email}
                            disabled
                            className={`${inputClass} opacity-60 cursor-not-allowed`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-text-muted mb-1.5">
                            Telefone
                          </label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+351 912 345 678"
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-text-muted mb-1.5">
                            Nível
                          </label>
                          <select
                            value={level}
                            onChange={(e) => setLevel(e.target.value)}
                            className={inputClass}
                          >
                            <option value="">Não definido</option>
                            <option value="Iniciante">Iniciante</option>
                            <option value="Intermédio">Intermédio</option>
                            <option value="Avançado">Avançado</option>
                            <option value="Competição">Competição</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {!profile.player && (
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-text-muted mb-1.5">
                          Email
                        </label>
                        <input
                          type="email"
                          value={profile.email}
                          disabled
                          className={`${inputClass} opacity-60 cursor-not-allowed`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-muted mb-1.5">
                          Telefone
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+351 912 345 678"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={savingProfile}>
                      {savingProfile ? "A guardar..." : "Guardar Alterações"}
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Change Password */}
              <Card className="py-5 px-6">
                <h2 className="text-base font-bold mb-5 flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Alterar Palavra-passe
                </h2>
                <form onSubmit={handleChangePassword} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">
                      Palavra-passe atual
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1.5">
                        Nova palavra-passe
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="Mínimo 6 caracteres"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1.5">
                        Confirmar nova palavra-passe
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={savingPassword || !currentPassword || !newPassword}
                    >
                      {savingPassword ? "A alterar..." : "Alterar Palavra-passe"}
                    </Button>
                  </div>
                </form>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
