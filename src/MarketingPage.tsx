import React from "react";
import { Download, Eye, Sparkles, BookOpen, Gift, Coins, Trophy, Users, Layers, ShieldCheck, ArrowRight } from "lucide-react";

export default function MarketingPage({ onLogout }: { onLogout?: () => void }) {
  return (
    <div className="dashboard" style={{ paddingBottom: "4rem" }}>
      {onLogout && (
        <button style={{ float: "right", margin: "0.5rem" }} onClick={onLogout}>
          Logout
        </button>
      )}
      {/* Hero Section */}
      <div className="surface" style={{ 
        position: "relative",
        background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)",
        border: "1px solid rgba(99, 102, 241, 0.2)",
        borderRadius: "24px",
        padding: "3rem 2rem",
        marginBottom: "2rem",
        overflow: "hidden"
      }}>
        <div style={{ position: "relative", zIndex: 2, maxWidth: "800px" }}>
          <span style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: "6px",
            background: "rgba(99, 102, 241, 0.2)", 
            color: "#a5b4fc", 
            padding: "6px 14px", 
            borderRadius: "9999px",
            fontSize: "0.85rem",
            fontWeight: 600,
            textTransform: "uppercase",
            marginBottom: "1.5rem"
          }}>
            <Sparkles size={14} /> ExMudra Smart QR
          </span>
          <h1 style={{ 
            fontSize: "3rem", 
            fontWeight: 800, 
            lineHeight: 1.15,
            background: "linear-gradient(to right, #ffffff, #c7d2fe)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "1rem"
          }}>
            खरीदी करा आणि बक्षीस जिंका!
          </h1>
          <p style={{ 
            fontSize: "1.2rem", 
            color: "var(--text-muted)", 
            lineHeight: 1.6, 
            marginBottom: "2rem" 
          }}>
            ExMudra is a digital customer loyalty and rewards platform designed to help local retail shops attract, engage, and retain repeat customers with smart scan rewards.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            <a 
              href="/deck.html" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="primary-action"
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", fontSize: "1rem", padding: "0.75rem 1.5rem" }}
            >
              <Eye size={18} />
              Open Pitch Deck
            </a>
            <a 
              href="/assets/exmudra_marketing.pdf" 
              download="ExMudra_Marketing_Materials.pdf" 
              className="secondary-action"
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", fontSize: "1rem", padding: "0.75rem 1.5rem" }}
            >
              <Download size={18} />
              Download Marketing PDF
            </a>
          </div>
        </div>

        {/* Ambient background glow */}
        <div style={{ 
          position: "absolute",
          top: "-50%",
          right: "-10%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)",
          zIndex: 1,
          pointerEvents: "none"
        }} />
      </div>

      {/* Grid of Main Concepts */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
        gap: "1.5rem",
        marginBottom: "3rem" 
      }}>
        {/* Card 1: Rewards */}
        <div className="surface" style={{ padding: "2rem" }}>
          <div style={{ 
            width: "48px", 
            height: "48px", 
            borderRadius: "12px", 
            background: "rgba(234, 179, 8, 0.15)", 
            display: "flex", 
            alignItems: "center", 
            justify: "center", 
            color: "#facc15",
            marginBottom: "1.25rem",
            justifyContent: "center"
          }}>
            <Gift size={24} />
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>Multiple Reward Types</h3>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.5, fontSize: "0.95rem" }}>
            Offers Cashback, Lucky Draw entries, Discount Coupons, and Free Gifts to motivate diverse shopping customer segments.
          </p>
        </div>

        {/* Card 2: Growth Strategy */}
        <div className="surface" style={{ padding: "2rem" }}>
          <div style={{ 
            width: "48px", 
            height: "48px", 
            borderRadius: "12px", 
            background: "rgba(34, 197, 94, 0.15)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            color: "#4ade80",
            marginBottom: "1.25rem"
          }}>
            <Layers size={24} />
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>In-Store Growth Tools</h3>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.5, fontSize: "0.95rem" }}>
            7 practical retail steps to drive scans: hook boards, QR stands, winner announcements, sticker placement, and festive campaigns.
          </p>
        </div>

        {/* Card 3: Shop Benefits */}
        <div className="surface" style={{ padding: "2rem" }}>
          <div style={{ 
            width: "48px", 
            height: "48px", 
            borderRadius: "12px", 
            background: "rgba(99, 102, 241, 0.15)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            color: "#818cf8",
            marginBottom: "1.25rem"
          }}>
            <Users size={24} />
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>Business & Setup Projections</h3>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.5, fontSize: "0.95rem" }}>
            Affordable subscriptions (₹199 - ₹499/month) for shops to build their loyalty databases and trigger repeat visits cost-effectively.
          </p>
        </div>
      </div>

      {/* Visual Content Section */}
      <h2 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "1.5rem" }}>ExMudra Marketing Materials & Visuals</h2>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "2rem" }}>
        
        {/* Visual 1: Main Marathi Poster */}
        <div className="surface" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ borderRadius: "12px", overflow: "hidden", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <img 
              src="/assets/poster_marathi.jpg" 
              alt="ExMudra Marathi Promotional Poster" 
              style={{ width: "100%", height: "auto", display: "block", objectFit: "contain", maxHeight: "400px" }}
            />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", background: "rgba(234, 179, 8, 0.2)", color: "#fef08a", padding: "3px 8px", borderRadius: "4px", fontWeight: "bold" }}>PROMOTIONAL POSTER</span>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0.5rem 0 0.25rem 0" }}>Main Customer Poster (Marathi)</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.4 }}>
              Poster displaying "Shop and Win" benefits, customer scanning guidelines, and active reward types.
            </p>
          </div>
        </div>

        {/* Visual 2: Types of Rewards */}
        <div className="surface" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ borderRadius: "12px", overflow: "hidden", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <img 
              src="/assets/reward_types.jpg" 
              alt="QR Rewards Types Infographic" 
              style={{ width: "100%", height: "auto", display: "block", objectFit: "contain", maxHeight: "400px" }}
            />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", background: "rgba(99, 102, 241, 0.2)", color: "#c7d2fe", padding: "3px 8px", borderRadius: "4px", fontWeight: "bold" }}>INFOGRAPHIC</span>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0.5rem 0 0.25rem 0" }}>QR Code Rewards Structure</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.4 }}>
              Visual breakdown of the different reward styles: cashback, fixed tokens, discount percentages, and referral codes.
            </p>
          </div>
        </div>

        {/* Visual 3: Project Report */}
        <div className="surface" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ borderRadius: "12px", overflow: "hidden", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <img 
              src="/assets/project_report.jpg" 
              alt="Project Report overview" 
              style={{ width: "100%", height: "auto", display: "block", objectFit: "contain", maxHeight: "400px" }}
            />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", background: "rgba(168, 85, 247, 0.2)", color: "#f3e8ff", padding: "3px 8px", borderRadius: "4px", fontWeight: "bold" }}>BUSINESS REPORT</span>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0.5rem 0 0.25rem 0" }}>ExMudra Business & Project Report</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.4 }}>
              Complete market overview containing Phase 1/Phase 2 launch targets, revenue projections, setup fee structures, and growth estimates.
            </p>
          </div>
        </div>

        {/* Visual 4: Onboarding Target */}
        <div className="surface" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ borderRadius: "12px", overflow: "hidden", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <img 
              src="/assets/onboarding_campaign.jpg" 
              alt="Onboarding campaign poster" 
              style={{ width: "100%", height: "auto", display: "block", objectFit: "contain", maxHeight: "400px" }}
            />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", background: "rgba(34, 197, 94, 0.2)", color: "#dcfce7", padding: "3px 8px", borderRadius: "4px", fontWeight: "bold" }}>CAMPAIGN POSTER</span>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0.5rem 0 0.25rem 0" }}>10 Shops & 100 Customers Campaign</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.4 }}>
              Marathi onboarding drive summary showcasing targeted segments, registration flow steps, and promotional lucky draw items.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
