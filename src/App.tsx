import { useEffect, useMemo, useState } from "react";
import Login from "./Login";
import QRCode from "qrcode";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Download,
  Eye,
  Gift,
  Key,
  QrCode,
  ScanLine,
  Settings2,
  ShieldCheck,
  Store,
  Trash2,
  Trophy,
  Users,
  Pencil,
  Plus,
  GlassWater,
  Coffee,
  Shirt,
  Umbrella,
  Watch,
  BookOpen,
  ShoppingBag,
  Sparkles,
  PenTool,
  Headphones,
  Gamepad2,
  Tv,
  Smartphone,
  X,
} from "lucide-react";
import {
  fraudSignals as seedFraudSignals,
  shops as seedShops,
  transactions as seedTransactions,
} from "./data";
import { submitReward } from "./rewardEngine";
import {
  isSheetsConfigured,
  loadPublicData,
  loadSheetsData,
  submitSheetsReward,
  submitSheetsLead,
  addSheetsShop,
  deleteSheetsShop,
  updateSheetsShop,
  lookupSheetsCustomer,
  addSheetsGift,
  deleteSheetsGift,
  updateSheetsGift,
  uploadSheetsGiftImage,
} from "./sheetsApi";
import type { FraudSignal, Session, Shop, Transaction, VisitorContext, GiftItem, Lead } from "./types";
import { loadVisitorContext } from "./visitorContext";
import InvoiceModal from "./InvoiceModal";
import ShopEditModal from "./ShopEditModal";

type View = "customer" | "shop" | "admin" | "leads";
type ActiveSession = Session | null;

function getGiftIcon(giftItemName: string) {
  const name = giftItemName.toLowerCase().trim();
  if (name.includes("pen") || name.includes("pencil") || name.includes("stationery")) {
    return <PenTool size={56} className="gift-item-icon" />;
  }
  if (name.includes("bottle") || name.includes("flask") || name.includes("thermos") || name.includes("water") || name.includes("glass")) {
    return <GlassWater size={56} className="gift-item-icon" />;
  }
  if (name.includes("mug") || name.includes("cup") || name.includes("coffee") || name.includes("tea")) {
    return <Coffee size={56} className="gift-item-icon" />;
  }
  if (name.includes("keyring") || name.includes("keychain") || name.includes("key")) {
    return <Key size={56} className="gift-item-icon" />;
  }
  if (name.includes("shirt") || name.includes("tshirt") || name.includes("clothes") || name.includes("t-shirt") || name.includes("cap") || name.includes("hat")) {
    return <Shirt size={56} className="gift-item-icon" />;
  }
  if (name.includes("umbrella")) {
    return <Umbrella size={56} className="gift-item-icon" />;
  }
  if (name.includes("watch") || name.includes("clock") || name.includes("smartwatch")) {
    return <Watch size={56} className="gift-item-icon" />;
  }
  if (name.includes("book") || name.includes("diary") || name.includes("notebook") || name.includes("journal")) {
    return <BookOpen size={56} className="gift-item-icon" />;
  }
  if (name.includes("bag") || name.includes("backpack") || name.includes("pouch")) {
    return <ShoppingBag size={56} className="gift-item-icon" />;
  }
  if (name.includes("headphone") || name.includes("earphone") || name.includes("buds") || name.includes("audio")) {
    return <Headphones size={56} className="gift-item-icon" />;
  }
  if (name.includes("game") || name.includes("toy") || name.includes("play")) {
    return <Gamepad2 size={56} className="gift-item-icon" />;
  }
  if (name.includes("tv") || name.includes("speaker") || name.includes("device")) {
    return <Tv size={56} className="gift-item-icon" />;
  }
  if (name.includes("mobile") || name.includes("phone") || name.includes("smartphone") || name.includes("iphone")) {
    return <Smartphone size={56} className="gift-item-icon" />;
  }
  return <Sparkles size={56} className="gift-item-icon" />;
}

function normalizeDriveUrl(url: string): string {
  if (!url) return "";
  // Check for docs.google.com/uc?id=... or export=view&id=...
  const ucMatch = url.match(/docs\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
  if (ucMatch && ucMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${ucMatch[1]}`;
  }
  // Check for drive.google.com/open?id=...
  const openMatch = url.match(/drive\.google\.com\/open\?.*id=([a-zA-Z0-9_-]+)/);
  if (openMatch && openMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${openMatch[1]}`;
  }
  // Check for drive.google.com/file/d/...
  const fileDMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${fileDMatch[1]}`;
  }
  return url;
}

function GiftImageWithFallback({ 
  src, 
  alt, 
  className, 
  fallbackElement 
}: { 
  src?: string; 
  alt?: string; 
  className?: string; 
  fallbackElement: React.ReactNode 
}) {
  const [error, setError] = useState(false);
  const normalizedSrc = src ? normalizeDriveUrl(src) : "";

  if (normalizedSrc && !error) {
    return (
      <img 
        src={normalizedSrc} 
        alt={alt} 
        className={className} 
        onError={() => setError(true)} 
        style={{ width: "100%", height: "100%", objectFit: "contain" }} 
      />
    );
  }

  return <>{fallbackElement}</>;
}

const pointNumber = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

const plainNumber = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

function formatPoints(value: number) {
  return `${pointNumber.format(value)} mudra`;
}

function formatPlainNumber(value: number) {
  return plainNumber.format(value);
}

const readableDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const readableTime = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

function getDateKey(timestamp: string) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
}

function formatDateKey(dateKey: string) {
  if (!dateKey || dateKey === "Unknown") return dateKey || "Any date";
  const [year, month, day] = dateKey.split("-").map(Number);
  return readableDate.format(new Date(year, month - 1, day));
}

function formatTransactionDate(timestamp?: string) {
  const dateKey = timestamp ? getDateKey(timestamp) : "";
  return dateKey ? formatDateKey(dateKey) : "Unknown";
}

function formatTransactionTime(timestamp?: string) {
  if (!timestamp) return "Unknown";
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "Unknown" : readableTime.format(date);
}

function normalizeShopLookup(value?: string) {
  return (value || "").replace(/\s+/g, "").toLowerCase();
}

function normalizeRole(value?: string) {
  return (value || "").trim().toLowerCase();
}

const fallbackVisitorContext: VisitorContext = {
  ipAddress: "Unknown",
  location: "Unknown",
  latitude: null,
  longitude: null,
};

function downloadCSV(filename: string, rows: any[][]) {
  const csvContent = rows
    .map((e) =>
      e
        .map((cell) => {
          if (typeof cell === "string") {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const initialShopId = params.get("shop");
  const [view, setView] = useState<View>("customer");
  const [selectedShopId, setSelectedShopId] = useState<string | null>(initialShopId);
  const [shops, setShops] = useState<Shop[]>(() => {
    if (isSheetsConfigured) {
      return seedShops;
    }
    const saved = localStorage.getItem("smart-mudra-shops");
    return saved ? JSON.parse(saved) : seedShops;
  });
  const [fraudSignals, setFraudSignals] = useState<FraudSignal[]>(seedFraudSignals);
  const [gifts, setGifts] = useState<GiftItem[]>(() => {
    if (isSheetsConfigured) {
      return [];
    }
    const saved = localStorage.getItem("smart-mudra-gifts");
    return saved ? JSON.parse(saved) : [];
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (isSheetsConfigured) {
      return seedTransactions;
    }
    const saved = localStorage.getItem("smart-mudra-transactions");
    return saved ? JSON.parse(saved) : seedTransactions;
  });
  const [session, setSession] = useState<ActiveSession | null>(() => {
    const saved = localStorage.getItem("smart-mudra-session");
    return saved ? JSON.parse(saved) : null;
  });
  const [shopPasswords, setShopPasswords] = useState<Record<string, string>>(() => {
    if (!isSheetsConfigured) {
      return {
        kalemedical: "kale123",
        patilstore: "patil123",
        joshimart: "joshi123"
      };
    }
    return {};
  });
  const [dataStatus, setDataStatus] = useState(
    isSheetsConfigured ? "Connecting to Google Sheets..." : "Local demo mode"
  );
  const [hasLoadedArchive, setHasLoadedArchive] = useState(false);
  const [invoiceTxn, setInvoiceTxn] = useState<Transaction | null>(null);
  const [leads, setLeads] = useState<Lead[]>(() => {
    if (isSheetsConfigured) {
      return [];
    }
    const saved = localStorage.getItem("smart-mudra-leads");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (isSheetsConfigured) {
      return;
    }
    localStorage.setItem("smart-mudra-leads", JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    if (isSheetsConfigured) {
      return;
    }
    localStorage.setItem("smart-mudra-transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    if (isSheetsConfigured) {
      return;
    }
    localStorage.setItem("smart-mudra-shops", JSON.stringify(shops));
  }, [shops]);

  useEffect(() => {
    if (isSheetsConfigured) {
      return;
    }
    localStorage.setItem("smart-mudra-gifts", JSON.stringify(gifts));
  }, [gifts]);

  useEffect(() => {
    if (session) {
      localStorage.setItem("smart-mudra-session", JSON.stringify(session));
      return;
    }

    localStorage.removeItem("smart-mudra-session");
  }, [session]);

  useEffect(() => {
    if (!isSheetsConfigured) {
      return;
    }

    loadPublicData()
      .then((data) => {
        setShops(data.shops.length ? data.shops : seedShops);
        setGifts(data.gifts || []);
        setDataStatus("Google Sheets connected");
      })
      .catch((error) => {
        setDataStatus(error instanceof Error ? error.message : "Google Sheets connection failed");
      });
  }, []);

  useEffect(() => {
    if (!isSheetsConfigured || !session?.token || hasLoadedArchive) {
      return;
    }

    loadSheetsData({ includeArchive: true, token: session.token })
      .then((data) => {
        setShops(data.shops.length ? data.shops : seedShops);
        setTransactions(data.transactions);
        setFraudSignals(data.fraudSignals);
        setShopPasswords(data.shopPasswords || {});
        setGifts(data.gifts || []);
        if (data.leads) {
          setLeads(data.leads);
        }
        setDataStatus("Google Sheets connected");
        setHasLoadedArchive(true);
      })
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : "Google Sheets connection failed";
        setDataStatus(errorMessage);
        if (errorMessage === "Session expired." || errorMessage === "Invalid session.") {
          setSession(null);
        }
      });
  }, [hasLoadedArchive, session]);

  const selectedShop = shops.find((shop) => shop.id === selectedShopId);
  const adminShop = selectedShop || shops.find((shop) => shop.status === "active") || shops[0];
  const sessionRole = normalizeRole(session?.role);
  const needsFreshLogin = Boolean(isSheetsConfigured && session && !session.token);
  const sessionShop = session?.shopId
    ? shops.find((shop) => normalizeShopLookup(shop.id) === normalizeShopLookup(session.shopId))
    : undefined;
  const handleLogin = (nextSession: Session) => {
    setHasLoadedArchive(false);
    setSession(nextSession);
  };
  const handleLogout = () => {
    setSession(null);
    setTransactions([]);
    setFraudSignals([]);
    setLeads([]);
    setHasLoadedArchive(false);
  };

  const isLeadPage = params.get("lead") === "true";

  return (
    <main>
      <TopBar view={view} setView={setView} dataStatus={dataStatus} />
      {view === "customer" && (
        isLeadPage ? (
          <LeadContestFlow leads={leads} setLeads={setLeads} shops={shops} />
        ) : selectedShop ? (
          <CustomerFlow
            shop={selectedShop}
            shops={shops}
            transactions={transactions}
            setTransactions={setTransactions}
            setSelectedShopId={setSelectedShopId}
            gifts={gifts}
          />
        ) : (
          <section className="customer-shell">
            <div className="customer-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center', minHeight: '400px' }}>
              <QrCode size={64} style={{ color: '#059669', marginBottom: '1.5rem' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>Scan to win!</h2>
              <p style={{ color: '#4b5563', maxWidth: '320px', lineHeight: 1.5 }}>
                Please scan the Smart Mudra QR code at a participating shop to try your luck and earn instant mudra.
              </p>
            </div>
          </section>
        )
      )}
      {view === "shop" && (
        sessionRole === "admin" && !needsFreshLogin ? (
          <div>
            <button style={{ float: "right", margin: "1rem" }} onClick={handleLogout}>
              Logout
            </button>
            {adminShop ? (
              <ShopDashboard
                shop={adminShop}
                shops={shops}
                transactions={transactions}
                setSelectedShopId={setSelectedShopId}
                onViewInvoice={setInvoiceTxn}
              />
            ) : (
              <section className="dashboard">
                <div className="surface">
                  <div className="section-title">
                    <Store size={20} />
                    <h2>No shops available</h2>
                  </div>
                </div>
              </section>
            )}
          </div>
        ) : !session || needsFreshLogin || sessionRole !== "shopadmin" ? (
          <Login title="Shop Login" allowedRoles={["shopAdmin", "admin"]} onLogin={handleLogin} />
        ) : (
          <div>
            <button style={{ float: "right", margin: "1rem" }} onClick={handleLogout}>
              Logout
            </button>
            {sessionShop ? (
              <ShopDashboard
                shop={sessionShop}
                shops={shops}
                transactions={transactions}
                setSelectedShopId={setSelectedShopId}
                isShopAdmin
                onViewInvoice={setInvoiceTxn}
              />
            ) : (
              <section className="dashboard">
                <div className="surface">
                  <div className="section-title">
                    <Store size={20} />
                    <h2>Shop account not linked</h2>
                  </div>
                  <p className="muted-note">
                    This login is missing a shop ID. Please check the admins sheet for this user.
                  </p>
                </div>
              </section>
            )}
          </div>
        )
      )}
      {view === "admin" && (
        !session || needsFreshLogin || sessionRole !== "admin" ? (
          <Login title="Admin Login" expectedRole="admin" onLogin={handleLogin} />
        ) : (
          <div>
            <button style={{ float: "right", margin: "1rem" }} onClick={handleLogout}>
              Logout
            </button>
            <AdminDashboard
              shops={shops}
              setShops={setShops}
              transactions={transactions}
              fraudSignals={fraudSignals}
              shopPasswords={shopPasswords}
              session={session}
              onViewInvoice={setInvoiceTxn}
              gifts={gifts}
              setGifts={setGifts}
            />
          </div>
        )
      )}
      {view === "leads" && (
        !session || needsFreshLogin || sessionRole !== "admin" ? (
          <Login title="Admin Login" expectedRole="admin" onLogin={handleLogin} />
        ) : (
          <div className="dashboard">
            <button style={{ float: "right", margin: "1rem" }} onClick={handleLogout}>
              Logout
            </button>
            <div className="dashboard-heading">
              <div>
                <span>Admin Panel</span>
                <h1>Registrations</h1>
              </div>
            </div>
            <LeadTable leads={leads} shops={shops} />
          </div>
        )
      )}
      <InvoiceModal transaction={invoiceTxn} shops={shops} onClose={() => setInvoiceTxn(null)} />
    </main>
  );
}

function TopBar({
  view,
  setView,
  dataStatus,
}: {
  view: View;
  setView: (view: View) => void;
  dataStatus: string;
}) {
  const navItems: { id: View; label: string; icon: typeof ScanLine }[] = [
    { id: "customer", label: "Customer", icon: ScanLine },
    { id: "shop", label: "Shop", icon: Store },
    { id: "admin", label: "Admin", icon: ShieldCheck },
    { id: "leads", label: "Registrations", icon: Trophy },
  ];

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <Trophy size={22} />
        </div>
        <div>
          <strong>Smart Mudra</strong>
          <span>{dataStatus}</span>
        </div>
      </div>
      <nav className="segmented" aria-label="Primary views">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={view === item.id ? "active" : ""}
              key={item.id}
              onClick={() => setView(item.id)}
              type="button"
              title={item.label}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}

function LeadContestFlow({
  leads,
  setLeads,
  shops,
}: {
  leads: Lead[];
  setLeads: (leads: Lead[]) => void;
  shops: Shop[];
}) {
  const queryParams = new URLSearchParams(window.location.search);
  const shopId = queryParams.get("shop") || "";
  const matchedShop = shops.find((s) => s.id === shopId);

  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [agreement, setAgreement] = useState(false);
  const [phase, setPhase] = useState<"form" | "processing" | "thankYou">("form");
  const [message, setMessage] = useState("");
  const [visitorContext, setVisitorContext] = useState<VisitorContext>(fallbackVisitorContext);

  useEffect(() => {
    loadVisitorContext({ includeDeviceLocation: true }).then(setVisitorContext);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setMessage("Enter customer name.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
      setMessage("Enter a valid 10 digit mobile number.");
      return;
    }
    if (!address.trim()) {
      setMessage("Enter customer address.");
      return;
    }
    if (!agreement) {
      setMessage("You must agree to participate in this membership contest.");
      return;
    }

    setPhase("processing");
    setMessage("");

    window.setTimeout(async () => {
      try {
        if (isSheetsConfigured) {
          const result = await submitSheetsLead(
            customerName.trim(),
            address.trim(),
            mobile.trim(),
            email.trim(),
            agreement,
            visitorContext,
            shopId
          );
          if (result.ok && result.lead) {
            setLeads([result.lead, ...leads]);
            setPhase("thankYou");
          } else {
            setPhase("form");
            setMessage("Failed to submit lead.");
          }
        } else {
          const newLead: Lead = {
            id: "LEAD-" + Math.floor(100000 + Math.random() * 900000),
            customerName: customerName.trim(),
            mobile: mobile.trim(),
            email: email.trim(),
            address: address.trim(),
            agreement: "Yes",
            ipAddress: visitorContext.ipAddress,
            location: visitorContext.location,
            latitude: visitorContext.latitude,
            longitude: visitorContext.longitude,
            timestamp: new Date().toISOString(),
            shopId: shopId,
          };
          setLeads([newLead, ...leads]);
          setPhase("thankYou");
        }
      } catch (error) {
        setPhase("form");
        setMessage(error instanceof Error ? error.message : "Could not submit lead.");
      }
    }, 850);
  };

  return (
    <section className="customer-shell">
      <div className="customer-panel" style={{ borderTopColor: "var(--accent-secondary)" }}>
        <div className="shop-strip" style={{ background: "#2e1a47" }}>
          <div>
            <span>{matchedShop ? matchedShop.name : "Exclusive Contest"}</span>
            <h1>{matchedShop ? `${matchedShop.name} Membership` : "Membership Contest"}</h1>
          </div>
        </div>

        {phase === "form" && (
          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="headline">
              <Trophy size={34} style={{ color: "var(--accent-secondary)" }} />
              <h2>{matchedShop ? "Register Membership" : "Membership Registration"}</h2>
              <p>{matchedShop ? `Enter your details below to register with ${matchedShop.name}.` : "Enter your details below to register for the contest."}</p>
            </div>
            
            <label>
              Mobile number
              <input
                autoComplete="tel"
                inputMode="numeric"
                maxLength={10}
                value={mobile}
                onChange={(event) => setMobile(event.target.value.replace(/\D/g, ""))}
                required
              />
            </label>
            <label>
              Customer name
              <input
                autoComplete="name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                required
              />
            </label>
            <label>
              Email (optional)
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Address
              <textarea
                autoComplete="street-address"
                rows={3}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                required
              />
            </label>

            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginTop: "8px", textAlign: "left" }}>
              <input
                id="agreement"
                type="checkbox"
                checked={agreement}
                onChange={(e) => setAgreement(e.target.checked)}
                style={{ width: "20px", height: "20px", minHeight: "20px", marginTop: "2px", cursor: "pointer" }}
                required
              />
              <label htmlFor="agreement" style={{ fontWeight: "normal", fontSize: "14px", cursor: "pointer", color: "var(--text-main)" }}>
                I agree to participate in this membership contest
              </label>
            </div>

            {message && <p className="error">{message}</p>}
            
            <button className="primary-action" type="submit" style={{ background: "linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))", cursor: "pointer" }}>
              <Trophy size={20} />
              Submit Registration
            </button>
          </form>
        )}

        {phase === "processing" && (
          <div className="processing">
            <div className="spinner" style={{ borderTopColor: "var(--accent-secondary)" }} />
            <h2>Registering...</h2>
          </div>
        )}

        {phase === "thankYou" && (
          <div className="reward-reveal success-surface" style={{ minHeight: "340px" }}>
            <div className="success-icon-wrap bounce" style={{ background: "rgba(139, 92, 246, 0.15)" }}>
              <Trophy size={48} color="var(--accent-secondary)" />
            </div>
            <h2 style={{ fontSize: "24px", color: "var(--text-main)", marginBottom: "8px" }}>Successfully registered for membership!</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "15px", lineHeight: "1.5", maxWidth: "300px", margin: "0 auto 1.5rem auto" }}>
              Thank you, <strong>{customerName}</strong>! We have successfully registered you (mobile: {mobile}) for the {matchedShop ? `${matchedShop.name} membership` : "membership contest"}.
            </p>
            <p className="reward-thank-you" style={{ color: "var(--accent-success)", fontWeight: 600 }}>
              Good luck! 🎉
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function CustomerFlow({
  shop,
  shops,
  transactions,
  setTransactions,
  setSelectedShopId,
  gifts,
}: {
  shop: Shop;
  shops: Shop[];
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  setSelectedShopId: (shopId: string) => void;
  gifts: GiftItem[];
}) {
  const isGiftShop = shop.rewardType === "gift" || 
    (shop.rewardType !== "mudra" && shop.category.toLowerCase().includes("gift")) ||
    (shop.category.toLowerCase().includes("gift") && (shop.rewardBands || []).some((band) => band.giftItems));
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [phase, setPhase] = useState<"form" | "processing" | "reward" | "thankYou">("form");
  const [message, setMessage] = useState("");
  const [reward, setReward] = useState<number | null>(null);
  const [visitorContext, setVisitorContext] = useState<VisitorContext>(fallbackVisitorContext);
  const [giftState, setGiftState] = useState<"closed" | "opening" | "opened">("closed");
  const [isLookingUpCustomer, setIsLookingUpCustomer] = useState(false);
  const [lastTxn, setLastTxn] = useState<Transaction | null>(null);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  const matchedGift = useMemo(() => {
    if (lastTxn?.rewardType !== "gift" || !lastTxn?.giftItems) return null;
    const searchOriginal = lastTxn.giftItems.trim();
    const searchLower = searchOriginal.toLowerCase();
    const searchNormalized = searchLower.replace(/[^a-z0-9]/g, "");

    // 1. Try exact match on original/trimmed/lowercase
    let found = gifts.find((g) => g.name.toLowerCase().trim() === searchLower);
    if (found) return found;

    // 2. Try matching after stripping all non-alphanumeric characters (e.g. "power bank" matches "powerbank")
    found = gifts.find((g) => g.name.toLowerCase().replace(/[^a-z0-9]/g, "") === searchNormalized);
    if (found) return found;

    // 3. Try substring/includes matching on lowercase
    found = gifts.find((g) => {
      const gName = g.name.toLowerCase().trim();
      return gName.includes(searchLower) || searchLower.includes(gName);
    });
    if (found) return found;

    // 4. Try substring/includes matching on normalized
    found = gifts.find((g) => {
      const gNameNorm = g.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      return gNameNorm.includes(searchNormalized) || searchNormalized.includes(gNameNorm);
    });
    return found || null;
  }, [lastTxn, gifts]);

  useEffect(() => {
    if (phase === "reward") {
      setGiftState("closed");
    }
  }, [phase]);

  const handleOpenGift = () => {
    if (giftState !== "closed") return;
    setGiftState("opening");
    window.setTimeout(() => {
      setGiftState("opened");
    }, 600);
  };

  useEffect(() => {
    // Fetch IP and location in the background while the customer fills the form
    loadVisitorContext({ includeDeviceLocation: true }).then(setVisitorContext);
  }, []);

  useEffect(() => {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setIsLookingUpCustomer(false);
      return;
    }

    let isCancelled = false;
    const lookupTimer = window.setTimeout(async () => {
      setIsLookingUpCustomer(true);
      try {
        const customer = isSheetsConfigured
          ? await lookupSheetsCustomer(mobile)
          : (() => {
              const match = transactions.find((transaction) => transaction.mobile === mobile);
              return {
                ok: true,
                found: Boolean(match),
                customerName: match?.customerName,
                address: match?.address,
              };
            })();

        if (isCancelled || !customer.found) return;
        setCustomerName((current) => current.trim() ? current : customer.customerName || "");
        setAddress((current) => current.trim() ? current : customer.address || "");
      } catch {
        // Lookup is a convenience; reward submission validation remains the source of truth.
      } finally {
        if (!isCancelled) {
          setIsLookingUpCustomer(false);
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      window.clearTimeout(lookupTimer);
    };
  }, [mobile, transactions]);

  const handleSubmit = () => {
    setPhase("processing");
    setMessage("");

    window.setTimeout(async () => {
      const result = isSheetsConfigured
        ? await submitSheetsReward(
            shop.id,
            customerName.trim(),
            address.trim(),
            mobile.trim(),
            Number(billAmount),
            visitorContext
          ).catch((error) => ({
            ok: false as const,
            reason: error instanceof Error ? error.message : "Could not save reward.",
          }))
        : submitReward(
            shop,
            customerName.trim(),
            address.trim(),
            mobile.trim(),
            Number(billAmount),
            transactions,
            visitorContext
          );

      if (!result.ok) {
        setPhase("form");
        setMessage(result.reason);
        setReward(null);
        setLastTxn(null);
        return;
      }

      setTransactions([result.transaction, ...transactions]);
      setReward(result.transaction.reward);
      setLastTxn(result.transaction);
      setPhase("reward");
    }, 850);
  };

  return (
    <section className="customer-shell">
      <div className="customer-panel">
        <div className="shop-strip">
          <div>
            <span>{shop.category}</span>
            <h1>{shop.name}</h1>
          </div>
        </div>

        {shop.status !== "active" && (
          <div className="reward-reveal">
            <Store size={42} />
            <h2>Shop unavailable</h2>
            <p>This Smart Mudra QR is no longer accepting new scans.</p>
          </div>
        )}

        {shop.status === "active" && phase === "form" && (
          <div className="form-stack">
            <div className="headline">
              <Gift size={34} />
              <h2>Try your luck</h2>
              <p>
                {isGiftShop
                  ? "Enter today's bill details to reveal your gift."
                  : "Enter today's bill details to reveal instant mudra."}
              </p>
            </div>
            <label>
              Mobile number
              <input
                autoComplete="tel"
                inputMode="numeric"
                maxLength={10}
                value={mobile}
                onChange={(event) => setMobile(event.target.value.replace(/\D/g, ""))}
              />
            </label>
            <label>
              Customer name
              <input
                autoComplete="name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
            </label>
            <label>
              Address
              <textarea
                autoComplete="street-address"
                rows={3}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
            </label>
            {isLookingUpCustomer && <p className="muted-note">Checking customer details...</p>}
            <label>
              Purchase total
              <input
                inputMode="decimal"
                value={billAmount}
                onChange={(event) => setBillAmount(event.target.value)}
              />
            </label>
            {message && <p className="error">{message}</p>}
            <button className="primary-action" type="button" onClick={handleSubmit}>
              <Trophy size={20} />
              Try Your Luck
            </button>
          </div>
        )}

        {shop.status === "active" && phase === "processing" && (
          <div className="processing">
            <div className="spinner" />
            <h2>Checking reward</h2>
          </div>
        )}

        {shop.status === "active" && phase === "reward" && (
          <div className={`reward-reveal success-surface ${giftState}`} style={{ position: 'relative', overflow: 'hidden' }}>
            {giftState === "opened" && (
              <div className="coin-container">
                <div className="coin"></div>
                <div className="coin"></div>
                <div className="coin"></div>
                <div className="coin"></div>
                <div className="coin"></div>
                <div className="coin"></div>
                <div className="coin"></div>
                <div className="coin"></div>
              </div>
            )}
            
            <div className="gift-scene">
              <div className={`gift-box-container ${giftState}`} onClick={handleOpenGift}>
                <div className="gift-box-glow"></div>
                <div className="gift-box">
                  <div className="gift-bow"></div>
                  <div className="gift-lid"></div>
                  <div className="gift-body"></div>
                </div>
                {giftState === "closed" && <p className="tap-prompt">Tap to open your reward! 🎁</p>}
              </div>

              <div className="reward-content-pop">
                {lastTxn?.rewardType === "gift" ? (
                  <>
                    <div 
                      className="success-icon-wrap bounce gift-icon-wrap" 
                      onClick={() => setIsImageZoomed(true)}
                      title="Click to view full image"
                      style={{ cursor: "pointer" }}
                    >
                      <GiftImageWithFallback 
                        src={matchedGift?.imageUrl} 
                        alt={lastTxn.giftItems} 
                        className="gift-reveal-image"
                        fallbackElement={getGiftIcon(lastTxn.giftItems || "")}
                      />
                    </div>
                    <span className="reward-label">You won a gift!</span>
                    <strong className="reward-amount gift-title-amount">
                      {lastTxn.giftItems || "No gift eligible"}
                    </strong>
                    <p className="tap-to-zoom-hint" onClick={() => setIsImageZoomed(true)}>
                      🔍 Tap image to zoom
                    </p>
                  </>
                ) : (
                  <>
                    <div className="success-icon-wrap bounce">
                      <Trophy size={48} color="#facc15" />
                    </div>
                    <span className="reward-label">You won</span>
                    <strong className="reward-amount">{formatPoints(reward ?? 0)}</strong>
                  </>
                )}
                <p className="reward-bill-info">
                  For your purchase of {formatPlainNumber(Number(billAmount))}
                </p>
                <p className="reward-thank-you">
                  Thank you for shopping! Visit again.
                </p>
              </div>
            </div>
          </div>
        )}

        {shop.status === "active" && phase === "thankYou" && (
          <div className="reward-reveal">
            <Gift size={42} />
            <h2>Thank You for Shopping!</h2>
            <p>We appreciate your business at {shop.name}.</p>
          </div>
        )}
      </div>

      {isImageZoomed && (
        <div className="invoice-modal-overlay" onClick={() => setIsImageZoomed(false)}>
          <div className="gift-zoom-card" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setIsImageZoomed(false)} aria-label="Close image">
              <X size={24} />
            </button>
            <div className="gift-zoom-image-container">
              <GiftImageWithFallback 
                src={matchedGift?.imageUrl} 
                alt={lastTxn?.giftItems} 
                className="gift-zoom-image"
                fallbackElement={getGiftIcon(lastTxn?.giftItems || "")}
              />
            </div>
            <h3 className="gift-zoom-title">{lastTxn?.giftItems}</h3>
            <p className="muted-note">Tap anywhere outside to close</p>
          </div>
        </div>
      )}
    </section>
  );
}

function ShopDashboard({
  shop,
  shops,
  transactions,
  setSelectedShopId,
  isShopAdmin,
  onViewInvoice,
}: {
  shop: Shop;
  shops: Shop[];
  transactions: Transaction[];
  setSelectedShopId: (shopId: string) => void;
  isShopAdmin?: boolean;
  onViewInvoice?: (transaction: Transaction) => void;
}) {
  const [qrUrl, setQrUrl] = useState("");
  const shopTransactions = transactions.filter((transaction) => transaction.shopId === shop.id);
  const approved = shopTransactions.filter((transaction) => transaction.status === "approved");
  const totalPoints = approved.reduce((sum, item) => sum + item.reward, 0);
  const averageBill = approved.length
    ? approved.reduce((sum, item) => sum + item.billAmount, 0) / approved.length
    : 0;
  const isRegShop = shop.category.toLowerCase().trim() === "registration";
  const scanUrl = isRegShop 
    ? `${window.location.origin}/?lead=true&shop=${encodeURIComponent(shop.id)}`
    : `${window.location.origin}/?shop=${encodeURIComponent(shop.id)}`;

  useEffect(() => {
    QRCode.toDataURL(scanUrl, { margin: 1, width: 240 }).then(setQrUrl);
  }, [scanUrl]);

  return (
    <section className="dashboard">
      <div className="dashboard-heading">
        <div>
          <span>Shop Dashboard</span>
          <h1>{shop.name}</h1>
          {shop.status !== "active" && <span>This shop is {shop.status}; new scans are disabled.</span>}
        </div>
        {!isShopAdmin && (
          <select value={shop.id} onChange={(event) => setSelectedShopId(event.target.value)}>
            {shops.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <MetricGrid
        metrics={[
          { label: "Total scans", value: shopTransactions.length.toString(), icon: ScanLine },
          { label: "Mudra given", value: formatPoints(totalPoints), icon: Trophy },
          { label: "Average purchase", value: formatPlainNumber(averageBill), icon: BarChart3 },
        ]}
      />

      <div className="two-column">
        <section className="surface qr-surface">
          <div className="section-title">
            <QrCode size={20} />
            <h2>QR link</h2>
          </div>
          {shop.status === "active" ? (
            <>
              {qrUrl && <img alt={`${shop.name} QR code`} src={qrUrl} />}
              <code>{scanUrl}</code>
              <a className="download-link" href={qrUrl} download={`${shop.id}-smart-mudra-qr.png`}>
                <Download size={18} />
                Download QR
              </a>
            </>
          ) : (
            <p className="muted-note">QR downloads are disabled because this shop is not active.</p>
          )}
        </section>
        
        {/* Placeholder for future widgets in two-column grid */}
        <section className="surface" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p className="muted-note">More shop insights coming soon.</p>
        </section>
      </div>
      
      <div style={{ marginTop: '1.5rem' }}>
        <AdminReports transactions={shopTransactions} shops={[shop]} hideShopFilter />
      </div>
      
      <div style={{ marginTop: '1.5rem' }}>
        <TransactionTable transactions={shopTransactions} hideShopFilter onViewInvoice={onViewInvoice} shops={shops} />
      </div>
    </section>
  );
}

function AdminDashboard({
  shops,
  setShops,
  transactions,
  fraudSignals,
  shopPasswords,
  session,
  onViewInvoice,
  gifts,
  setGifts,
  leads = [],
}: {
  shops: Shop[];
  setShops: (shops: Shop[]) => void;
  transactions: Transaction[];
  fraudSignals: FraudSignal[];
  shopPasswords: Record<string, string>;
  session: ActiveSession;
  onViewInvoice?: (transaction: Transaction) => void;
  gifts: GiftItem[];
  setGifts: (gifts: GiftItem[]) => void;
  leads?: Lead[];
}) {
  const [isAddingShop, setIsAddingShop] = useState(false);
  const [newShopName, setNewShopName] = useState("");
  const [newShopCategory, setNewShopCategory] = useState("General");
  const [newShopMaxBillAmount, setNewShopMaxBillAmount] = useState("100000");
  const [newShopType, setNewShopType] = useState<"mudra" | "gift">("mudra");
  const [newShopMaxReward, setNewShopMaxReward] = useState("100");
  const [newShopCostPerScan, setNewShopCostPerScan] = useState("10");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingShopId, setDeletingShopId] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string } | null>(null);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);

  // Gift inventory states
  const [isAddingGift, setIsAddingGift] = useState(false);
  const [newGiftName, setNewGiftName] = useState("");
  const [newGiftImageUrl, setNewGiftImageUrl] = useState("");
  const [newGiftFile, setNewGiftFile] = useState<File | null>(null);
  const [editingGift, setEditingGift] = useState<GiftItem | null>(null);
  const [isSubmittingGift, setIsSubmittingGift] = useState(false);
  
  // Fields for editing inline
  const [editGiftName, setEditGiftName] = useState("");
  const [editGiftImageUrl, setEditGiftImageUrl] = useState("");
  const [editGiftFile, setEditGiftFile] = useState<File | null>(null);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const distinctShopGifts = useMemo(() => {
    const giftNames = new Set<string>();
    
    shops
      .filter((shop) => shop.status !== "deleted")
      .forEach((shop) => {
        const isGift = shop.rewardType === "gift" || 
          (shop.rewardType !== "mudra" && shop.category.toLowerCase().includes("gift")) ||
          (shop.category.toLowerCase().includes("gift") && (shop.rewardBands || []).some((band) => band.giftItems));
        if (isGift && shop.rewardBands) {
          shop.rewardBands.forEach((band) => {
            if (band.giftItems) {
              band.giftItems
                .split(",")
                .map((name) => name.trim())
                .filter(Boolean)
                .forEach((name) => {
                  giftNames.add(name);
                });
            }
          });
        }
      });
      
    const existingGiftNames = new Set(gifts.map((g) => g.name.toLowerCase().trim()));
    return Array.from(giftNames).filter(
      (name) => !existingGiftNames.has(name.toLowerCase().trim())
    );
  }, [shops, gifts]);

  const handleQuickAddGift = (giftName: string) => {
    setNewGiftName(giftName);
    setIsAddingGift(true);
  };

  const handleAddGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGiftName.trim() || isSubmittingGift) return;

    setIsSubmittingGift(true);
    try {
      let finalImageUrl = newGiftImageUrl.trim();

      if (newGiftFile) {
        const base64Data = await readFileAsBase64(newGiftFile);
        if (isSheetsConfigured) {
          const uploadResult = await uploadSheetsGiftImage(newGiftFile.name, base64Data, session);
          if (uploadResult.ok) {
            finalImageUrl = uploadResult.imageUrl;
          } else {
            throw new Error("Failed to upload image to Google Drive.");
          }
        } else {
          finalImageUrl = base64Data;
        }
      }

      if (isSheetsConfigured) {
        const result = await addSheetsGift(
          {
            name: newGiftName.trim(),
            imageUrl: finalImageUrl,
          },
          session
        );
        if (result.ok) {
          setGifts([...gifts, result.gift]);
          setNewGiftName("");
          setNewGiftImageUrl("");
          setNewGiftFile(null);
          setIsAddingGift(false);
        } else {
          alert("Failed to create gift.");
        }
      } else {
        const newGift: GiftItem = {
          id: "GIFT-" + Math.floor(100000 + Math.random() * 900000),
          name: newGiftName.trim(),
          imageUrl: finalImageUrl,
        };
        setGifts([...gifts, newGift]);
        setNewGiftName("");
        setNewGiftImageUrl("");
        setNewGiftFile(null);
        setIsAddingGift(false);
      }
    } catch (err) {
      alert(`Error adding gift: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmittingGift(false);
    }
  };

  const handleUpdateGift = async (giftId: string) => {
    if (!editGiftName.trim()) return;
    setIsSubmittingGift(true);
    try {
      let finalImageUrl = editGiftImageUrl.trim();

      if (editGiftFile) {
        const base64Data = await readFileAsBase64(editGiftFile);
        if (isSheetsConfigured) {
          const uploadResult = await uploadSheetsGiftImage(editGiftFile.name, base64Data, session);
          if (uploadResult.ok) {
            finalImageUrl = uploadResult.imageUrl;
          } else {
            throw new Error("Failed to upload image to Google Drive.");
          }
        } else {
          finalImageUrl = base64Data;
        }
      }

      const fields = { name: editGiftName.trim(), imageUrl: finalImageUrl };
      if (isSheetsConfigured) {
        const result = await updateSheetsGift(giftId, fields, session);
        if (result.ok) {
          setGifts(gifts.map((g) => (g.id === giftId ? result.gift : g)));
        } else {
          throw new Error("Failed to update gift configuration.");
        }
      } else {
        setGifts(
          gifts.map((g) => (g.id === giftId ? { ...g, ...fields } : g))
        );
      }
      setEditingGift(null);
      setEditGiftFile(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error updating gift.");
    } finally {
      setIsSubmittingGift(false);
    }
  };

  const handleDeleteGift = async (giftId: string, giftName: string) => {
    const shouldDelete = window.confirm(`Delete gift item "${giftName}"? This will not affect old transactions but it won't render its image in new wins.`);
    if (!shouldDelete) return;

    try {
      if (isSheetsConfigured) {
        const result = await deleteSheetsGift(giftId, session);
        if (result.ok) {
          setGifts(gifts.filter((g) => g.id !== giftId));
        } else {
          alert("Failed to delete gift.");
        }
      } else {
        setGifts(gifts.filter((g) => g.id !== giftId));
      }
    } catch (err) {
      alert(`Error deleting gift: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const approved = transactions.filter((transaction) => transaction.status === "approved");
  const payout = approved.reduce((sum, item) => sum + item.reward, 0);

  const getShopPassword = (shopId: string) => {
    const normalizedId = shopId.toLowerCase().trim();
    const entry = Object.entries(shopPasswords).find(([key]) => key.toLowerCase().trim() === normalizedId);
    return entry ? entry[1] : null;
  };

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (isSheetsConfigured) {
        const result = await addSheetsShop(
          {
            name: newShopName,
            category: newShopCategory,
            maxBillAmount: Number(newShopMaxBillAmount),
            maxReward: Number(newShopMaxReward),
            costPerScan: Number(newShopCostPerScan),
            rewardType: newShopType,
            rewardBands: newShopType === "gift" ? [
              { minBill: 0, maxBill: 1000, giftItems: "Pen, Keyring, Mug" },
              { minBill: 1000, giftItems: "T-Shirt, Umbrella, Watch" }
            ] : [
              { reward: 10, probability: 80, minBill: 0 },
              { reward: 50, probability: 15, minBill: 100 },
              { reward: 100, probability: 5, minBill: 500 }
            ]
          },
          session
        );
        if (result.ok) {
          setShops([...shops, result.shop]);
          setCreatedCredentials(result.credentials);
          setNewShopName("");
          setNewShopCategory("General");
          setNewShopMaxBillAmount("100000");
          setNewShopType("mudra");
          setNewShopMaxReward("100");
          setNewShopCostPerScan("10");
        } else {
          alert("Failed to create shop.");
        }
      } else {
        alert("Adding shops is only supported when connected to Google Sheets.");
      }
    } catch (err) {
      alert(`Error adding shop: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateShop = async (updatedFields: Partial<Shop>) => {
    if (!editingShop) return;

    try {
      if (isSheetsConfigured) {
        const result = await updateSheetsShop(editingShop.id, updatedFields, session);
        if (result.ok) {
          setShops(shops.map((s) => (s.id === editingShop.id ? result.shop : s)));
        } else {
          throw new Error("Failed to update shop configuration.");
        }
      } else {
        const updatedShop: Shop = {
          ...editingShop,
          ...updatedFields,
          rewardBands: updatedFields.rewardBands ?? editingShop.rewardBands,
        };
        setShops(shops.map((s) => (s.id === editingShop.id ? updatedShop : s)));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error updating shop.");
      throw err;
    }
  };

  const handleDeleteShop = async (shop: Shop) => {
    if (shop.status === "deleted" || deletingShopId) return;

    const shouldDelete = window.confirm(
      `Delete ${shop.name}? Old transactions will stay in reports, but this shop will stop accepting new scans.`
    );
    if (!shouldDelete) return;

    setDeletingShopId(shop.id);
    try {
      if (isSheetsConfigured) {
        const result = await deleteSheetsShop(shop.id, session);
        if (!result.ok) {
          alert("Failed to delete shop.");
          return;
        }
        setShops(shops.map((item) => (item.id === shop.id ? result.shop : item)));
      } else {
        setShops(shops.map((item) => (item.id === shop.id ? { ...item, status: "deleted" } : item)));
      }
    } catch (err) {
      alert(`Error deleting shop: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeletingShopId(null);
    }
  };

  return (
    <section className="dashboard">
      <div className="dashboard-heading">
        <div>
          <span>Admin Panel</span>
          <h1>Platform control</h1>
        </div>
        <button className="icon-button" type="button" title="Settings">
          <Settings2 size={19} />
        </button>
      </div>

      <MetricGrid
        metrics={[
          { label: "Platform scans", value: transactions.length.toString(), icon: ScanLine },
          { label: "Total mudra given", value: formatPoints(payout), icon: Gift },
          { label: "Active shops", value: shops.filter((shop) => shop.status === "active").length.toString(), icon: Store },
        ]}
      />

      <section className="surface" style={{ marginBottom: "18px" }}>
        <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Store size={20} />
            <h2>Shop management</h2>
          </div>
          <button 
            className="secondary-action" 
            style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem", width: "auto" }}
            onClick={() => { setIsAddingShop(!isAddingShop); setCreatedCredentials(null); }}
          >
            {isAddingShop ? "Cancel" : "Add Shop"}
          </button>
        </div>

        {isAddingShop && (
          <div style={{ background: "rgba(0,0,0,0.05)", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
            <form onSubmit={handleAddShop}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <label>
                  Shop Name
                  <input value={newShopName} onChange={(e) => setNewShopName(e.target.value)} required />
                </label>
                <label>
                  Category
                  <input value={newShopCategory} onChange={(e) => setNewShopCategory(e.target.value)} required />
                </label>
                <label>
                  Max Bill Amount (₹)
                  <input
                    type="number"
                    min="10"
                    value={newShopMaxBillAmount}
                    onChange={(e) => setNewShopMaxBillAmount(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Max Reward Cap (Mudra)
                  <input
                    type="number"
                    min="1"
                    value={newShopMaxReward}
                    onChange={(e) => setNewShopMaxReward(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Cost Per Scan (₹)
                  <input
                    type="number"
                    min="0"
                    value={newShopCostPerScan}
                    onChange={(e) => setNewShopCostPerScan(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Shop Reward Type
                  <select
                    value={newShopType}
                    onChange={(e) => setNewShopType(e.target.value as "mudra" | "gift")}
                    style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)' }}
                  >
                    <option value="mudra">Mudra Points</option>
                    <option value="gift">Lucky Draw Gift</option>
                  </select>
                </label>
              </div>
              <button type="submit" disabled={isSubmitting} className="primary-action" style={{ marginTop: "0.5rem" }}>
                {isSubmitting ? "Creating..." : "Create Shop"}
              </button>
              <p className="muted-note" style={{ fontSize: '12px', marginTop: '0.75rem', textAlign: 'left', display: 'flex', gap: '6px', alignItems: 'center' }}>
                ℹ️ Once created, click the <strong>Pencil (Edit)</strong> icon next to the shop in the list below to configure its reward bands, bill ranges, and list of gift items.
              </p>
            </form>
            {createdCredentials && (
              <div style={{ marginTop: "1rem", padding: "1rem", background: "#e6ffe6", border: "1px solid #00cc00", borderRadius: "8px", color: "#006600" }}>
                <strong>Shop created successfully!</strong>
                <p>Give these credentials to the shop owner:</p>
                <code>Username: {createdCredentials.username}</code><br/>
                <code>Password: {createdCredentials.password}</code>
              </div>
            )}
          </div>
        )}

        <div className="shop-list">
          {shops.map((shop) => (
            <div className="shop-row" key={shop.id}>
              <div>
                <strong>{shop.name}</strong>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <span className="muted-note" style={{ fontSize: '12px' }}>{shop.category}</span>
                  {getShopPassword(shop.id) && (
                    <span className="shop-pass-badge" style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#fbbf24',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 600,
                      border: '1px solid rgba(245, 158, 11, 0.2)'
                    }}>
                      <Key size={10} style={{ color: '#fbbf24' }} />
                      Pass: {getShopPassword(shop.id)}
                    </span>
                  )}
                </div>
              </div>
              <div className="shop-row-actions">
                <span className={`status ${shop.status}`}>{shop.status}</span>
                <button
                  className="icon-button"
                  type="button"
                  title={`Edit ${shop.name}`}
                  disabled={shop.status === "deleted"}
                  onClick={() => setEditingShop(shop)}
                  style={{ marginRight: '4px' }}
                >
                  <Pencil size={17} />
                </button>
                <button
                  className="icon-button danger-button"
                  type="button"
                  title={`Delete ${shop.name}`}
                  disabled={shop.status === "deleted" || deletingShopId === shop.id}
                  onClick={() => handleDeleteShop(shop)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface" style={{ marginBottom: "18px" }}>
        <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Gift size={20} />
            <h2>Gift inventory management</h2>
          </div>
          <button 
            className="secondary-action" 
            style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem", width: "auto" }}
            onClick={() => setIsAddingGift(!isAddingGift)}
          >
            {isAddingGift ? "Cancel" : "Add Gift Item"}
          </button>
        </div>

        {distinctShopGifts.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", padding: "0.85rem 1rem", borderRadius: "8px", marginBottom: "1rem" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "8px", fontWeight: 600 }}>
              🎁 Gift items used by shops but missing from inventory (Click to add & upload image):
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {distinctShopGifts.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="secondary-action"
                  style={{ width: "auto", minHeight: "28px", padding: "0 10px", fontSize: "11px", borderRadius: "14px", background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.2)", color: "#c084fc", cursor: "pointer" }}
                  onClick={() => handleQuickAddGift(name)}
                >
                  + {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {isAddingGift && (
          <div style={{ background: "rgba(0,0,0,0.05)", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
            <form onSubmit={handleAddGift}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <label>
                  Gift Item Name
                  <input 
                    placeholder="e.g. Mobile Phone, Water Bottle"
                    value={newGiftName} 
                    onChange={(e) => setNewGiftName(e.target.value)} 
                    required 
                  />
                </label>
                <label>
                  Upload Image File
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setNewGiftFile(e.target.files?.[0] || null)}
                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-main)', padding: '6px' }}
                  />
                </label>
                <label>
                  Or Image URL (Fallback)
                  <input 
                    placeholder="e.g. https://example.com/mobile.png"
                    value={newGiftImageUrl} 
                    onChange={(e) => setNewGiftImageUrl(e.target.value)} 
                  />
                </label>
              </div>
              <button type="submit" disabled={isSubmittingGift} className="primary-action" style={{ marginTop: "0.5rem" }}>
                {isSubmittingGift ? "Saving..." : "Add Gift"}
              </button>
            </form>
          </div>
        )}

        <div className="shop-list">
          {gifts.length === 0 ? (
            <p className="muted-note" style={{ padding: "1rem 0", textAlign: "center" }}>No gift items configured yet. Add gifts to upload custom images.</p>
          ) : (
            gifts.map((gift) => (
              <div className="shop-row" key={gift.id} style={{ alignItems: "center" }}>
                {editingGift?.id === gift.id ? (
                  <div style={{ display: "flex", flex: 1, gap: "1rem", alignItems: "flex-end" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", flex: 1 }}>
                      <label style={{ margin: 0 }}>
                        Name
                        <input value={editGiftName} onChange={(e) => setEditGiftName(e.target.value)} required />
                      </label>
                      <label style={{ margin: 0 }}>
                        Replace Image File
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => setEditGiftFile(e.target.files?.[0] || null)}
                          style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-main)', padding: '6px' }}
                        />
                      </label>
                      <label style={{ margin: 0 }}>
                        Or Image URL
                        <input value={editGiftImageUrl} onChange={(e) => setEditGiftImageUrl(e.target.value)} />
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button 
                        className="primary-action" 
                        style={{ width: "auto", minHeight: "36px", padding: "0 12px" }}
                        onClick={() => handleUpdateGift(gift.id)}
                      >
                        Save
                      </button>
                      <button 
                        className="secondary-action" 
                        style={{ width: "auto", minHeight: "36px", padding: "0 12px" }}
                        onClick={() => setEditingGift(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div className="admin-gift-thumb-container" style={{ width: "42px", height: "42px", background: "rgba(255,255,255,0.05)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <GiftImageWithFallback 
                          src={gift.imageUrl} 
                          alt={gift.name} 
                          fallbackElement={<Gift size={20} style={{ color: "#94a3b8" }} />}
                        />
                      </div>
                      <div>
                        <strong>{gift.name}</strong>
                        <div style={{ fontSize: "11px", color: "#64748b", wordBreak: "break-all", marginTop: "2px" }}>
                          {gift.imageUrl || "No image URL configured"}
                        </div>
                      </div>
                    </div>
                    <div className="shop-row-actions">
                      <button
                        className="icon-button"
                        type="button"
                        title={`Edit ${gift.name}`}
                        onClick={() => {
                          setEditingGift(gift);
                          setEditGiftName(gift.name);
                          setEditGiftImageUrl(gift.imageUrl);
                        }}
                        style={{ marginRight: '4px' }}
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        className="icon-button danger-button"
                        type="button"
                        title={`Delete ${gift.name}`}
                        onClick={() => handleDeleteGift(gift.id, gift.name)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <AdminReports transactions={transactions} shops={shops} />

      <TransactionTable transactions={transactions} shops={shops} onViewInvoice={onViewInvoice} />

      {editingShop && (
        <ShopEditModal
          shop={editingShop}
          onClose={() => setEditingShop(null)}
          onSave={handleUpdateShop}
        />
      )}
    </section>
  );
}

function AdminReports({ transactions, shops, hideShopFilter = false }: { transactions: Transaction[], shops: Shop[], hideShopFilter?: boolean }) {
  const [shopFilter, setShopFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const summary = useMemo(() => {
    const data: Record<string, { date: string; shopId: string; billCount: number; totalBills: number; totalPoints: number }> = {};
    
    transactions.forEach(tx => {
      if (tx.status !== "approved") return;
      
      let date = "Unknown";
      if (tx.timestamp) {
        date = getDateKey(tx.timestamp) || "Unknown";
      }

      const key = `${date}|${tx.shopId}`;
      if (!data[key]) {
        data[key] = { date, shopId: tx.shopId, billCount: 0, totalBills: 0, totalPoints: 0 };
      }
      data[key].billCount += 1;
      data[key].totalBills += tx.billAmount;
      data[key].totalPoints += tx.reward;
    });

    return Object.values(data).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions]);

  const filteredSummary = useMemo(() => {
    return summary.filter((row) => {
      if (shopFilter !== "all" && row.shopId !== shopFilter) return false;
      if (fromDate && row.date < fromDate) return false;
      if (toDate && row.date > toDate) return false;
      return true;
    });
  }, [fromDate, shopFilter, summary, toDate]);

  const selectedShopName = shopFilter === "all"
    ? "All shops"
    : shops.find((shop) => shop.id === shopFilter)?.name || shopFilter;
  const dateRangeLabel = `${fromDate ? formatDateKey(fromDate) : "Any start date"} to ${toDate ? formatDateKey(toDate) : "Any end date"}`;

  const totalPages = Math.max(1, Math.ceil(filteredSummary.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleSummary = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSummary.slice(start, start + pageSize);
  }, [currentPage, filteredSummary, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [fromDate, pageSize, shopFilter, toDate]);

  return (
    <section className="surface table-surface" style={{ marginBottom: '1.5rem' }}>
      <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <BarChart3 size={20} />
          <h2>Daily Reporting (Pivot)</h2>
        </div>
        <button 
          className="secondary-action" 
          style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem", width: "auto" }}
          onClick={() => {
            const headers = ["Date", "Shop Name", "Shop ID", "Purchase Count", "Total Purchase Value", "Total Mudra"];
            const rows = filteredSummary.map(row => {
              const shop = shops.find(s => s.id === row.shopId);
              return [row.date, shop ? shop.name : row.shopId, row.shopId, row.billCount, row.totalBills, row.totalPoints];
            });
            downloadCSV("daily_report.csv", [headers, ...rows]);
          }}
        >
          <Download size={14} style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
          Download CSV
        </button>
      </div>
      <div className="filter-bar">
        {!hideShopFilter && (
          <label>
            Shop
            <select value={shopFilter} onChange={(e) => setShopFilter(e.target.value)}>
              <option value="all">All shops</option>
              {shops.map((shop) => (
                <option value={shop.id} key={shop.id}>{shop.name}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          From
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
        <label>
          Rows
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </label>
        <button
          className="secondary-action filter-clear"
          type="button"
          onClick={() => {
            setShopFilter("all");
            setFromDate("");
            setToDate("");
          }}
        >
          Clear
        </button>
      </div>
      <div className="filter-summary">
        Showing {filteredSummary.length} daily rows for {selectedShopName} from {dateRangeLabel}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              {!hideShopFilter && <th>Shop</th>}
              <th>Purchases</th>
              <th>Total Purchase</th>
              <th>Total Mudra</th>
            </tr>
          </thead>
          <tbody>
            {visibleSummary.map((row, idx) => {
              const shop = shops.find(s => s.id === row.shopId);
              const shopName = shop ? shop.name : row.shopId;
              return (
                <tr key={`${row.date}-${row.shopId}-${idx}`}>
                  <td>{row.date}</td>
                  {!hideShopFilter && <td>{shopName}</td>}
                  <td>{row.billCount}</td>
                  <td>{formatPlainNumber(row.totalBills)}</td>
                  <td>{formatPlainNumber(row.totalPoints)}</td>
                </tr>
              )
            })}
            {filteredSummary.length === 0 && (
              <tr>
                <td colSpan={hideShopFilter ? 4 : 5} style={{ textAlign: "center", padding: "1rem" }}>No approved transactions match these filters.</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            {filteredSummary.length > 0 && (
              <tr style={{ fontWeight: "bold", background: "rgba(255,255,255,0.05)" }}>
                <td colSpan={hideShopFilter ? 2 : 3} style={{ textAlign: "right" }}>Totals:</td>
                <td>{formatPlainNumber(filteredSummary.reduce((sum, row) => sum + row.totalBills, 0))}</td>
                <td>{formatPlainNumber(filteredSummary.reduce((sum, row) => sum + row.totalPoints, 0))}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
      <PaginationControls
        count={filteredSummary.length}
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </section>
  );
}

function MetricGrid({
  metrics,
}: {
  metrics: { label: string; value: string; icon: typeof Activity }[];
}) {
  return (
    <div className="metrics">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <article className="metric" key={metric.label}>
            <Icon size={20} />
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        );
      })}
    </div>
  );
}

function TransactionTable({
  transactions,
  shops = [],
  compact = false,
  hideShopFilter = false,
  onViewInvoice,
}: {
  transactions: Transaction[];
  shops?: Shop[];
  compact?: boolean;
  hideShopFilter?: boolean;
  onViewInvoice?: (transaction: Transaction) => void;
}) {
  const [query, setQuery] = useState("");
  const [shopFilter, setShopFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(compact ? 6 : 10);

  const shopNameById = useMemo(() => {
    return new Map(shops.map((shop) => [shop.id, shop.name]));
  }, [shops]);

  const visitsByMobile = useMemo(() => {
    const counts = new Map<string, number>();
    transactions.forEach((t) => {
      if (t.status === "approved") {
        counts.set(t.mobile, (counts.get(t.mobile) || 0) + 1);
      }
    });
    return counts;
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (compact) return transactions.slice(0, 6);

    const normalizedQuery = query.trim().toLowerCase();
    return transactions.filter((transaction) => {
      const date = transaction.timestamp ? getDateKey(transaction.timestamp) : "";
      const shopName = shopNameById.get(transaction.shopId) || "";
      const searchable = [
        transaction.mobile,
        transaction.customerName,
        transaction.address,
        transaction.shopId,
        shopName,
        transaction.location,
      ].join(" ").toLowerCase();

      if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
      if (shopFilter !== "all" && transaction.shopId !== shopFilter) return false;
      if (statusFilter !== "all" && transaction.status !== statusFilter) return false;
      if (fromDate && date < fromDate) return false;
      if (toDate && date > toDate) return false;
      return true;
    });
  }, [compact, fromDate, query, shopFilter, shopNameById, statusFilter, toDate, transactions]);

  const selectedShopName = shopFilter === "all"
    ? "All shops"
    : shopNameById.get(shopFilter) || shopFilter;
  const selectedStatus = statusFilter === "all" ? "all statuses" : statusFilter;
  const dateRangeLabel = `${fromDate ? formatDateKey(fromDate) : "Any start date"} to ${toDate ? formatDateKey(toDate) : "Any end date"}`;

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleTransactions = useMemo(() => {
    if (compact) return filteredTransactions;
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [compact, currentPage, filteredTransactions, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [fromDate, pageSize, query, shopFilter, statusFilter, toDate]);

  return (
    <section className="surface table-surface">
      <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Users size={20} />
          <h2>Transactions</h2>
        </div>
        <button 
          className="secondary-action" 
          style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem", width: "auto" }}
          onClick={() => {
            const headers = ["Date", "Time", "Mobile", "Name", "Address", "Shop ID", "Purchase Total", "Mudra", "Mudra Rule", "Mudra Details", "Reward Type", "Gift Items", "Visits", "Timestamp", "IP Address", "Location", "Latitude", "Longitude"];
            const rows = filteredTransactions.map(tx => [
              formatTransactionDate(tx.timestamp),
              formatTransactionTime(tx.timestamp),
              tx.mobile,
              tx.customerName || "Walk-in",
              tx.address || "",
              tx.shopId,
              tx.billAmount,
              tx.reward,
              tx.rewardRule || "",
              tx.rewardDetails || "",
              tx.rewardType || "mudra",
              tx.giftItems || "",
              visitsByMobile.get(tx.mobile) || 1,
              tx.timestamp,
              tx.ipAddress,
              tx.location,
              tx.latitude ?? "",
              tx.longitude ?? ""
            ]);
            downloadCSV("transactions.csv", [headers, ...rows]);
          }}
        >
          <Download size={14} style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
          Download CSV
        </button>
      </div>
      {!compact && (
        <div className="filter-bar">
          <label className="filter-search">
            Search
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Mobile, name, shop, location"
            />
          </label>
          {!hideShopFilter && (
            <label>
              Shop
              <select value={shopFilter} onChange={(e) => setShopFilter(e.target.value)}>
                <option value="all">All shops</option>
                {shops.map((shop) => (
                  <option value={shop.id} key={shop.id}>{shop.name}</option>
                ))}
              </select>
            </label>
          )}
          <label>
            Status
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="blocked">Blocked</option>
            </select>
          </label>
          <label>
            From
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>
          <label>
            Rows
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          <button
            className="secondary-action filter-clear"
            type="button"
            onClick={() => {
              setQuery("");
              setShopFilter("all");
              setStatusFilter("all");
              setFromDate("");
              setToDate("");
            }}
          >
            Clear
          </button>
        </div>
      )}
      {!compact && (
        <div className="filter-summary">
          Showing {filteredTransactions.length} transactions for {selectedShopName}, {selectedStatus}, from {dateRangeLabel}
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Mobile</th>
              {!compact && <th>Name</th>}
              {!compact && <th>Shop</th>}
              <th>Purchase</th>
              <th>Mudra</th>
              <th>Visits</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleTransactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{formatTransactionDate(transaction.timestamp)}</td>
                <td>{formatTransactionTime(transaction.timestamp)}</td>
                <td>{transaction.mobile}</td>
                {!compact && <td>{transaction.customerName || "Walk-in"}</td>}
                {!compact && <td>{shopNameById.get(transaction.shopId) || transaction.shopId}</td>}
                <td>{formatPlainNumber(transaction.billAmount)}</td>
                <td>
                  {transaction.rewardType === "gift" ? (
                    <span title={transaction.giftItems || "Gift"} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", cursor: "help" }}>
                      <span>🎁</span>
                      <span style={{ fontSize: "0.85em", color: "var(--color-primary-light)", fontWeight: "500" }}>Gift</span>
                    </span>
                  ) : (
                    formatPlainNumber(transaction.reward)
                  )}
                </td>
                <td>{visitsByMobile.get(transaction.mobile) || 1}</td>
                <td>
                  <button
                    className="btn-view-invoice"
                    onClick={() => onViewInvoice?.(transaction)}
                    type="button"
                  >
                    <Eye size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    Invoice
                  </button>
                </td>
              </tr>
            ))}
            {visibleTransactions.length === 0 && (
              <tr>
                <td colSpan={compact ? 7 : 9} style={{ textAlign: "center", padding: "1rem" }}>No transactions match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!compact && (
        <PaginationControls
          count={filteredTransactions.length}
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}

function PaginationControls({
  count,
  currentPage,
  pageSize,
  totalPages,
  onPageChange,
}: {
  count: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const start = count === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(count, currentPage * pageSize);

  return (
    <div className="pagination-row">
      <span>
        Showing {start}-{end} of {count}
      </span>
      <div className="pagination-actions">
        <button
          className="secondary-action"
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button
          className="secondary-action"
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function LeadTable({
  leads = [],
  shops = [],
}: {
  leads: Lead[];
  shops: Shop[];
}) {
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const date = lead.timestamp ? getDateKey(lead.timestamp) : "";
      const searchable = [
        lead.mobile,
        lead.customerName,
        lead.email,
        lead.address,
        lead.location,
      ].join(" ").toLowerCase();

      if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
      if (fromDate && date < fromDate) return false;
      if (toDate && date > toDate) return false;
      return true;
    });
  }, [fromDate, query, toDate, leads]);

  const dateRangeLabel = `${fromDate ? formatDateKey(fromDate) : "Any start date"} to ${toDate ? formatDateKey(toDate) : "Any end date"}`;

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [currentPage, filteredLeads, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [fromDate, pageSize, query, toDate]);

  return (
    <section className="surface table-surface" style={{ marginTop: "18px" }}>
      <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Trophy size={20} style={{ color: "var(--accent-secondary)" }} />
          <h2>Membership Contests ({filteredLeads.length})</h2>
        </div>
        <button 
          className="secondary-action" 
          style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem", width: "auto" }}
          onClick={() => {
            const headers = ["Date", "Time", "Shop ID", "Shop Name", "Mobile", "Name", "Email", "Address", "Agreement", "Timestamp", "IP Address", "Location", "Latitude", "Longitude"];
            const rows = filteredLeads.map(l => [
              formatTransactionDate(l.timestamp),
              formatTransactionTime(l.timestamp),
              l.shopId || "",
              l.shopId ? (shops.find(s => s.id === l.shopId)?.name || l.shopId) : "",
              l.mobile,
              l.customerName,
              l.email || "",
              l.address,
              l.agreement,
              l.timestamp,
              l.ipAddress,
              l.location,
              l.latitude || "",
              l.longitude || ""
            ]);
            downloadCSV("membership_contests.csv", [headers, ...rows]);
          }}
          disabled={filteredLeads.length === 0}
        >
          <Download size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          Download CSV
        </button>
      </div>

      <div className="filter-bar">
        <div className="filter-search">
          <label>
            Search registrations
            <input
              placeholder="Search by name, mobile, email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            From
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            To
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Page size
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', minHeight: '44px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </label>
        </div>
        <button
          className="secondary-action filter-clear"
          type="button"
          onClick={() => {
            setQuery("");
            setFromDate("");
            setToDate("");
          }}
          style={{ cursor: 'pointer' }}
        >
          Clear
        </button>
      </div>

      {(query || fromDate || toDate) && (
        <div className="filter-summary">
          Showing registrations filtered by query "{query || 'none'}" in range {dateRangeLabel}.
        </div>
      )}

      {visibleLeads.length === 0 ? (
        <p className="muted-note" style={{ textAlign: "center", padding: "2rem" }}>
          No membership contests found matching the filters.
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Shop</th>
                <th>Mobile</th>
                <th>Email</th>
                <th>Address</th>
                <th>Agreement</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {visibleLeads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <strong>{formatTransactionDate(lead.timestamp)}</strong>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {formatTransactionTime(lead.timestamp)}
                    </div>
                  </td>
                  <td>
                    <strong>{lead.customerName}</strong>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                      ID: {lead.id}
                    </div>
                  </td>
                  <td>
                    {lead.shopId ? (
                      <div>
                        <strong>{shops.find(s => s.id === lead.shopId)?.name || lead.shopId}</strong>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                          ID: {lead.shopId}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>None</span>
                    )}
                  </td>
                  <td>{lead.mobile}</td>
                  <td>{lead.email || <span style={{ color: "var(--text-muted)" }}>None</span>}</td>
                  <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal" }} title={lead.address}>
                    {lead.address}
                  </td>
                  <td>
                    <span className="status approved" style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--accent-success)" }}>
                      {lead.agreement}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: "13px" }}>{lead.location}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                      IP: {lead.ipAddress}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="pagination-row">
        <span>
          Showing {filteredLeads.length ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, filteredLeads.length)} of {filteredLeads.length} registrations
        </span>
        <div className="pagination-actions">
          <button
            className="secondary-action"
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
            style={{ cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="secondary-action"
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
            style={{ cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

export default App;
