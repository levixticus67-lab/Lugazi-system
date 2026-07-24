import { useLocation } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";

export default function Terms() {
  const [, setLocation] = useLocation();
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <button
          onClick={() => window.history.length > 1 ? window.history.back() : setLocation("/login")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#6D1F3C" }}>
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Deliverance Church Lugazi — DC Lugazi ERP</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border/50 p-8 space-y-8 text-sm text-foreground leading-relaxed">

          <p className="text-muted-foreground text-xs">Last updated: June {year}</p>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing or using the DC Lugazi ERP platform ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not access or use the Platform. These terms apply to all users, including church members, workforce, leadership, and administrators.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">2. About the Platform</h2>
            <p>The DC Lugazi ERP is a digital church management system operated by Deliverance Church Lugazi (DCL), located in Lugazi, Uganda. The Platform facilitates member management, attendance tracking, financial records, event coordination, and internal communication for the church and its affiliated ministries.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">3. User Accounts</h2>
            <p>Access to the Platform requires a personal account. You are responsible for:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
              <li>Keeping your password confidential and not sharing it with others</li>
              <li>All activity that occurs under your account</li>
              <li>Notifying the system administrator immediately of any unauthorised access</li>
              <li>Ensuring the information in your profile is accurate and up to date</li>
            </ul>
            <p>Account access is granted based on your role within the church. Role changes must be requested through the appropriate church leadership channels.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">4. Permitted Use</h2>
            <p>The Platform is provided exclusively for the internal operations of Deliverance Church Lugazi. You agree to use the Platform only for its intended church administration purposes and not to:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
              <li>Share, export, or distribute member or financial data without authorisation</li>
              <li>Attempt to access accounts, data, or features beyond your assigned role</li>
              <li>Use the Platform for commercial solicitation or personal business purposes</li>
              <li>Upload harmful, offensive, or misleading content</li>
              <li>Attempt to reverse-engineer, hack, or disrupt the Platform</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">5. Financial Records</h2>
            <p>Financial data recorded on the Platform — including tithes, offerings, and welfare funds — is managed by authorised personnel only. Access to financial records is restricted by role. The church maintains the right to audit all financial entries for accuracy and accountability purposes.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">6. Content and Communications</h2>
            <p>Any content you submit through the Platform (prayer requests, testimonies, chat messages, documents) must be truthful, respectful, and consistent with the values of Deliverance Church Lugazi. The church reserves the right to remove content that is deemed inappropriate, offensive, or contrary to church doctrine.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">7. Account Suspension</h2>
            <p>The church administration reserves the right to suspend or deactivate any account at any time for violations of these terms, departure from the church, or inactivity. Deactivated accounts lose access immediately upon deactivation.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">8. Disclaimer</h2>
            <p>The Platform is provided "as is" without warranties of any kind. Deliverance Church Lugazi does not guarantee uninterrupted availability of the Platform and shall not be liable for any loss of data arising from technical failures, subject to applicable Ugandan law.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">9. Governing Law</h2>
            <p>These Terms are governed by the laws of the Republic of Uganda. Any disputes arising from the use of the Platform shall be subject to the exclusive jurisdiction of the courts of Uganda.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">10. Changes to Terms</h2>
            <p>Deliverance Church Lugazi reserves the right to update these Terms at any time. Continued use of the Platform after changes are posted constitutes acceptance of the updated Terms.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">11. Contact</h2>
            <p>For questions about these Terms, contact the DC Lugazi administration through the church office in Lugazi, Uganda, or through the Platform's internal communication channels.</p>
          </section>

          <div className="pt-4 border-t border-border/50 text-xs text-muted-foreground">
            &copy; {year} Deliverance Church Lugazi. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
