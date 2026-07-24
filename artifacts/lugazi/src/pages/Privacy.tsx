import { useLocation } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";

export default function Privacy() {
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
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Deliverance Church Lugazi — DC Lugazi ERP</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border/50 p-8 space-y-8 text-sm text-foreground leading-relaxed">

          <p className="text-muted-foreground text-xs">Last updated: June {year}</p>

          <p>Deliverance Church Lugazi ("DCL", "we", "us") is committed to protecting the privacy of all individuals whose data is held on the DC Lugazi ERP platform. This policy explains what data we collect, how we use it, who can access it, and your rights.</p>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">1. Data We Collect</h2>
            <p>We collect and store the following categories of personal information:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
              <li><strong className="text-foreground">Identity data:</strong> Full name, date of birth, gender, marital status, nationality</li>
              <li><strong className="text-foreground">Contact data:</strong> Email address, phone number, physical address</li>
              <li><strong className="text-foreground">Church participation:</strong> Attendance records, cell group membership, ministry team assignments, role in church</li>
              <li><strong className="text-foreground">Financial data:</strong> Tithe and offering records, welfare contributions and receipts (amounts and dates only — no payment card details are stored)</li>
              <li><strong className="text-foreground">Account data:</strong> Email, hashed password, role, login timestamps, IP addresses (for security logging)</li>
              <li><strong className="text-foreground">User-submitted content:</strong> Prayer requests, testimonies, chat messages, documents uploaded to the Platform</li>
              <li><strong className="text-foreground">Profile photo:</strong> If uploaded voluntarily</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">2. How We Use Your Data</h2>
            <p>Your data is used solely for church administration purposes, including:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
              <li>Managing church membership records and member communication</li>
              <li>Tracking attendance for services, cell groups, and events</li>
              <li>Processing and reporting financial giving and welfare activities</li>
              <li>Coordinating events, ministry teams, and duty rosters</li>
              <li>Generating reports for church leadership and accountability</li>
              <li>Sending birthday greetings and internal announcements</li>
              <li>Maintaining security logs and preventing unauthorised access</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">3. Who Can See Your Data</h2>
            <p>Access to your data is strictly controlled by role:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-2 border border-border/50 font-medium">Data Category</th>
                    <th className="text-left p-2 border border-border/50 font-medium">Member</th>
                    <th className="text-left p-2 border border-border/50 font-medium">Workforce</th>
                    <th className="text-left p-2 border border-border/50 font-medium">Leadership</th>
                    <th className="text-left p-2 border border-border/50 font-medium">Admin</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr><td className="p-2 border border-border/50">Own profile</td><td className="p-2 border border-border/50">✓</td><td className="p-2 border border-border/50">✓</td><td className="p-2 border border-border/50">✓</td><td className="p-2 border border-border/50">✓</td></tr>
                  <tr className="bg-muted/20"><td className="p-2 border border-border/50">Own giving records</td><td className="p-2 border border-border/50">✓</td><td className="p-2 border border-border/50">✓</td><td className="p-2 border border-border/50">✓</td><td className="p-2 border border-border/50">✓</td></tr>
                  <tr><td className="p-2 border border-border/50">All members list</td><td className="p-2 border border-border/50">—</td><td className="p-2 border border-border/50">Limited</td><td className="p-2 border border-border/50">✓</td><td className="p-2 border border-border/50">✓</td></tr>
                  <tr className="bg-muted/20"><td className="p-2 border border-border/50">Financial reports</td><td className="p-2 border border-border/50">—</td><td className="p-2 border border-border/50">—</td><td className="p-2 border border-border/50">✓</td><td className="p-2 border border-border/50">✓</td></tr>
                  <tr><td className="p-2 border border-border/50">Activity logs</td><td className="p-2 border border-border/50">—</td><td className="p-2 border border-border/50">—</td><td className="p-2 border border-border/50">—</td><td className="p-2 border border-border/50">✓</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">4. Data Security</h2>
            <p>We take the security of your personal data seriously:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
              <li>Passwords are stored as one-way cryptographic hashes (bcrypt) — we cannot read your password</li>
              <li>All data is transmitted over HTTPS (TLS encryption)</li>
              <li>Session tokens are stored in HttpOnly cookies, protected against JavaScript access</li>
              <li>Access is rate-limited to prevent brute-force login attempts</li>
              <li>All login activity is logged with IP addresses for security auditing</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">5. Data Sharing</h2>
            <p>We do not sell, rent, or share your personal data with third parties for commercial purposes. Data may only be shared externally where required by Ugandan law or a valid court order. The Platform is hosted on third-party cloud infrastructure (Render and Neon DB) under data processing agreements.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">6. Data Retention</h2>
            <p>Member and financial records are retained for as long as you are an active or former member of DCL, or as required for legal and accountability purposes. If you leave the church, your account will be deactivated. You may request deletion of personal data that is not required for ongoing financial accountability records.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data in your profile</li>
              <li>Request deletion of data that is no longer necessary (subject to financial record-keeping obligations)</li>
              <li>Object to processing of your data for non-essential purposes</li>
            </ul>
            <p>To exercise these rights, contact the church administration or the system administrator through the Platform.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">8. Cookies & Sessions</h2>
            <p>The Platform uses a single session cookie (<code className="bg-muted px-1 rounded text-xs">dcl_token</code>) to keep you logged in. This cookie is HttpOnly (not accessible to scripts), scoped to this domain, and expires after 2 days (or 14 days if you choose "Remember me"). No third-party tracking cookies are used.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">9. Changes to This Policy</h2>
            <p>This Privacy Policy may be updated from time to time. Changes will be communicated through the Platform. Continued use of the Platform after updates constitutes acceptance of the revised policy.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">10. Contact Us</h2>
            <p>For privacy-related queries or to exercise your rights, please contact the DC Lugazi administration through the church office in Lugazi, Uganda, or through the internal communication channels on the Platform.</p>
          </section>

          <div className="pt-4 border-t border-border/50 text-xs text-muted-foreground">
            &copy; {year} Deliverance Church Lugazi. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
