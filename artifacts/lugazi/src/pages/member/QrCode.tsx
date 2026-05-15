import { useGetMemberQr } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { memberNavItems } from "./navItems";
import { useState, useEffect } from "react";
import { useListMembers } from "@workspace/api-client-react";

type Member = { id: number; userId?: number | null; fullName: string };

export default function MemberQrCode() {
  const { user } = useAuth();
  const [QRComponent, setQRComponent] = useState<any>(null);
  const [memberId, setMemberId] = useState<number | null>(null);

  useEffect(() => {
    import("qrcode.react").then(mod => setQRComponent(() => mod.QRCodeSVG));
  }, []);

  // Find the member record for this user
  const { data: members = [] } = useListMembers();
  useEffect(() => {
    const myMember = (members as Member[]).find(m => m.userId === user?.id);
    if (myMember) setMemberId(myMember.id);
  }, [members, user?.id]);

  const { data: qrData } = useGetMemberQr(memberId ?? 0, {
    query: { enabled: !!memberId && memberId > 0, queryKey: ["memberQr", memberId] }
  });

  return (
    <PortalLayout navItems={memberNavItems} portalLabel="Member Portal">
      <PageHeader title="My QR Code" description="Show this when checking into events" />
      <div className="flex flex-col items-center gap-6 py-8">
        {qrData ? (
          <>
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-card-border">
              {QRComponent ? (
                <QRComponent value={qrData.qrToken} size={220} />
              ) : (
                <div className="w-[220px] h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                  Loading QR...
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground text-lg">{qrData.memberName}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Present this QR code at events to be checked in
              </p>
              <p className="text-xs text-muted-foreground mt-3 font-mono bg-muted px-3 py-2 rounded-lg break-all max-w-xs">
                {qrData.qrToken}
              </p>
            </div>
          </>
        ) : memberId === null ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No member profile found for your account.</p>
            <p className="text-sm mt-1">Contact your administrator to link your member record.</p>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>Loading QR code...</p>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
