import { useEffect, useMemo, useState } from "react";
import Login from "./Login";
import QRCode from "qrcode";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  Gift,
  QrCode,
  ScanLine,
  Settings2,
  ShieldCheck,
  Store,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import {
  fraudSignals as seedFraudSignals,
  shops as seedShops,
  transactions as seedTransactions,
} from "./data";
import { submitReward } from "./rewardEngine";
import { isSheetsConfigured, loadPublicData, loadSheetsData, submitSheetsReward, addSheetsShop, deleteSheetsShop } from "./sheetsApi";
import type { FraudSignal, Session, Shop, Transaction, VisitorContext } from "./types";
import { loadVisitorContext } from "./visitorContext";

type View = "customer" | "shop" | "admin";
type ActiveSession = Session | null;

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
  const [shopPasswords, setShopPasswords] = useState<Record<string, string>>({});
  const [dataStatus, setDataStatus] = useState(
    isSheetsConfigured ? "Connecting to Google Sheets..." : "Local demo mode"
  );
  const [hasLoadedArchive, setHasLoadedArchive] = useState(false);

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
        setDataStatus("Google Sheets connected");
        setHasLoadedArchive(true);
      })
      .catch((error) => {
        setDataStatus(error instanceof Error ? error.message : "Google Sheets connection failed");
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
    setHasLoadedArchive(false);
  };

  return (
    <main>
      <TopBar view={view} setView={setView} dataStatus={dataStatus} />
      {view === "customer" && (
        selectedShop ? (
          <CustomerFlow
            shop={selectedShop}
            shops={shops}
            transactions={transactions}
            setTransactions={setTransactions}
            setSelectedShopId={setSelectedShopId}
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
            />
          </div>
        )
      )}
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

function CustomerFlow({
  shop,
  shops,
  transactions,
  setTransactions,
  setSelectedShopId,
}: {
  shop: Shop;
  shops: Shop[];
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  setSelectedShopId: (shopId: string) => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [phase, setPhase] = useState<"form" | "processing" | "reward" | "thankYou">("form");
  const [message, setMessage] = useState("");
  const [reward, setReward] = useState<number | null>(null);
  const [visitorContext, setVisitorContext] = useState<VisitorContext>(fallbackVisitorContext);

  useEffect(() => {
    // Fetch IP and location in the background while the customer fills the form
    loadVisitorContext({ includeDeviceLocation: true }).then(setVisitorContext);
  }, []);

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
        return;
      }

      setTransactions([result.transaction, ...transactions]);
      setReward(result.transaction.reward);
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
              <p>Enter today&apos;s bill details to reveal instant mudra.</p>
            </div>
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
          <div className="reward-reveal success-surface" style={{ position: 'relative', overflow: 'hidden' }}>
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
            <div className="success-icon-wrap bounce">
              <Trophy size={48} color="#059669" />
            </div>
            <span style={{ position: 'relative', zIndex: 2 }}>You won</span>
            <strong style={{ position: 'relative', zIndex: 2, textShadow: '0 2px 10px rgba(16, 185, 129, 0.2)' }}>{formatPoints(reward ?? 0)}</strong>
            <p style={{ marginTop: '0.5rem', color: '#6b7280', position: 'relative', zIndex: 2 }}>
              For your purchase of {formatPlainNumber(Number(billAmount))}
            </p>
            <p style={{ marginTop: '1.5rem', fontWeight: 600, color: '#374151', position: 'relative', zIndex: 2 }}>
              Thank you for shopping! Visit again.
            </p>
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
    </section>
  );
}

function ShopDashboard({
  shop,
  shops,
  transactions,
  setSelectedShopId,
  isShopAdmin,
}: {
  shop: Shop;
  shops: Shop[];
  transactions: Transaction[];
  setSelectedShopId: (shopId: string) => void;
  isShopAdmin?: boolean;
}) {
  const [qrUrl, setQrUrl] = useState("");
  const shopTransactions = transactions.filter((transaction) => transaction.shopId === shop.id);
  const approved = shopTransactions.filter((transaction) => transaction.status === "approved");
  const totalPoints = approved.reduce((sum, item) => sum + item.reward, 0);
  const averageBill = approved.length
    ? approved.reduce((sum, item) => sum + item.billAmount, 0) / approved.length
    : 0;
  const scanUrl = `${window.location.origin}/?shop=${encodeURIComponent(shop.id)}`;

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
          { label: "Cost per scan", value: formatPoints(shop.costPerScan), icon: Activity },
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
        <TransactionTable transactions={shopTransactions} hideShopFilter />
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
}: {
  shops: Shop[];
  setShops: (shops: Shop[]) => void;
  transactions: Transaction[];
  fraudSignals: FraudSignal[];
  shopPasswords: Record<string, string>;
  session: ActiveSession;
}) {
  const [isAddingShop, setIsAddingShop] = useState(false);
  const [newShopName, setNewShopName] = useState("");
  const [newShopCategory, setNewShopCategory] = useState("General");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingShopId, setDeletingShopId] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string } | null>(null);

  const approved = transactions.filter((transaction) => transaction.status === "approved");
  const payout = approved.reduce((sum, item) => sum + item.reward, 0);

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (isSheetsConfigured) {
        const result = await addSheetsShop({ name: newShopName, category: newShopCategory }, session);
        if (result.ok) {
          setShops([...shops, result.shop]);
          setCreatedCredentials(result.credentials);
          setNewShopName("");
          setNewShopCategory("General");
        } else {
          alert("Failed to create shop.");
        }
      } else {
        alert("Adding shops is only supported when connected to Google Sheets.");
      }
    } catch (err) {
      alert("Error adding shop.");
    } finally {
      setIsSubmitting(false);
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
      alert("Error deleting shop.");
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

      <div className="two-column admin-grid">
        <section className="surface">
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
                <label>
                  Shop Name
                  <input value={newShopName} onChange={(e) => setNewShopName(e.target.value)} required />
                </label>
                <label>
                  Category
                  <input value={newShopCategory} onChange={(e) => setNewShopCategory(e.target.value)} required />
                </label>
                <button type="submit" disabled={isSubmitting} className="primary-action" style={{ marginTop: "0.5rem" }}>
                  {isSubmitting ? "Creating..." : "Create Shop"}
                </button>
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
                  <span>{shop.category} {shopPasswords[shop.id] ? ` · Pass: ${shopPasswords[shop.id]}` : ""}</span>
                </div>
                <div className="shop-row-actions">
                  <span className={`status ${shop.status}`}>{shop.status}</span>
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

        <section className="surface">
          <div className="section-title">
            <AlertTriangle size={20} />
            <h2>Fraud monitoring</h2>
          </div>
          <div className="shop-list">
            {fraudSignals.map((signal) => (
              <div className="shop-row" key={`${signal.shopId}-${signal.mobile}`}>
                <div>
                  <strong>{signal.mobile}</strong>
                  <span>
                    {signal.shopId} · {signal.attempts} attempts
                  </span>
                </div>
                <span className={`status ${signal.status}`}>{signal.status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <AdminReports transactions={transactions} shops={shops} />

      <TransactionTable transactions={transactions} shops={shops} />
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
}: {
  transactions: Transaction[];
  shops?: Shop[];
  compact?: boolean;
  hideShopFilter?: boolean;
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
            const headers = ["Date", "Time", "Mobile", "Name", "Address", "Shop ID", "Purchase Total", "Mudra", "Mudra Rule", "Mudra Details", "Visits", "Timestamp", "IP Address", "Location", "Latitude", "Longitude"];
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
                <td>{formatPlainNumber(transaction.reward)}</td>
                <td>{visitsByMobile.get(transaction.mobile) || 1}</td>
              </tr>
            ))}
            {visibleTransactions.length === 0 && (
              <tr>
                <td colSpan={compact ? 6 : 8} style={{ textAlign: "center", padding: "1rem" }}>No transactions match these filters.</td>
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

export default App;
