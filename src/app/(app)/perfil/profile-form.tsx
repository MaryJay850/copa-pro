"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateUserProfile, updateUserPassword } from "@/lib/actions";

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

export function ProfileForm({ profile }: { profile: ProfileData }) {
  const router = useRouter();

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserProfile({ fullName, nickname, phone, level });
      toast.success("Perfil atualizado com sucesso!");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "Erro ao guardar perfil.");
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
      toast.error((err as Error).message || "Erro ao alterar palavra-passe.");
    }
    setSavingPassword(false);
  };

  const roleLabel =
    profile.role === "ADMINISTRADOR"
      ? "Administrador"
      : profile.role === "GESTOR"
        ? "Gestor"
        : "Jogador";

  return (
    <div className="space-y-6">
      {/* Account Info (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informação da Conta</CardTitle>
        </CardHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="px-3 py-2 bg-surface-alt rounded-lg">
            <p className="text-xs text-text-muted">Email</p>
            <p className="text-sm font-medium">{profile.email}</p>
          </div>
          <div className="px-3 py-2 bg-surface-alt rounded-lg">
            <p className="text-xs text-text-muted">Perfil</p>
            <p className="text-sm font-medium">{roleLabel}</p>
          </div>
          {profile.player && (
            <div className="px-3 py-2 bg-surface-alt rounded-lg">
              <p className="text-xs text-text-muted">Rating Elo</p>
              <p className="text-sm font-bold text-primary">{profile.player.eloRating}</p>
            </div>
          )}
          <div className="px-3 py-2 bg-surface-alt rounded-lg">
            <p className="text-xs text-text-muted">Membro desde</p>
            <p className="text-sm font-medium">
              {new Date(profile.createdAt).toLocaleDateString("pt-PT", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </Card>

      {/* Editable Profile Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados Pessoais</CardTitle>
        </CardHeader>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {profile.player && (
            <>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Alcunha (opcional)
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ex: Zé, Manel..."
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Nível (opcional)
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Não definido</option>
                  <option value="Iniciante">Iniciante</option>
                  <option value="Intermédio">Intermédio</option>
                  <option value="Avançado">Avançado</option>
                  <option value="Competição">Competição</option>
                </select>
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Telefone (opcional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+351 912 345 678"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? "A guardar..." : "Guardar Alterações"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alterar Palavra-passe</CardTitle>
        </CardHeader>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Palavra-passe atual
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Nova palavra-passe
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Confirmar nova palavra-passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex justify-end">
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
    </div>
  );
}
