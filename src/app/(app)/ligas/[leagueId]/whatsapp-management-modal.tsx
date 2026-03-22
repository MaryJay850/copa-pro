"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { WhatsAppGroupButton } from "./whatsapp-group-button";
import { WhatsAppMessageSender } from "@/components/whatsapp-message-sender";

export function WhatsAppManagementModal({
  leagueId,
  hasGroup,
  whatsappGroupId,
}: {
  leagueId: string;
  hasGroup: boolean;
  whatsappGroupId: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Gestão WhatsApp
        </span>
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Gestão WhatsApp">
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-text mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Grupo WhatsApp
            </h3>
            <div className="flex items-center gap-3">
              <WhatsAppGroupButton leagueId={leagueId} hasGroup={hasGroup} />
              {whatsappGroupId && (
                <span className="text-xs text-text-muted">
                  ID: <code className="bg-surface-hover px-1.5 py-0.5 rounded-md font-mono text-[10px]">{whatsappGroupId}</code>
                </span>
              )}
            </div>
          </div>
          <WhatsAppMessageSender leagueId={leagueId} whatsappGroupId={whatsappGroupId} />
        </div>
      </Modal>
    </>
  );
}
