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
  IndianRupee,
  QrCode,
  ScanLine,
  Settings2,
  ShieldCheck,
  Store,
  Trophy,
  Users,
} from "lucide-react";
import {
  fraudSignals as seedFraudSignals,
  shops as seedShops,
  transactions as seedTransactions,
} from "./data";
import { submitReward } from "./rewardEngine";
import { isSheetsConfigured, loadSheetsData, submitSheetsReward } from "./sheetsApi";
import type { FraudSignal, Shop, Transaction, VisitorContext } from "./types";
import { loadVisitorContext } from "./visitorContext";

type View = "customer" | "shop" | "admin";
type Session = { role: string; shopId?: string } | null;

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const fallbackVisitorContext: VisitorContext = {
  ipAddress: "Unknown",
  location: "Unknown",
  latitude: null,
  longitude: null,
};

function App() {
  const params = new URLSearchParams(window.location.search);
  const initialShopId = params.get("shop") ?? seedShops[0].id;
  const [view, setView] = useState<View>("customer");
  const [selectedShopId, setSelectedShopId] = useState(initialShopId);
  const [shops, setShops] = useState<Shop[]>(seedShops);
  const [fraudSignals, setFraudSignals] = useState<FraudSignal[]>(seedFraudSignals);
  const [dataStatus, setDataStatus] = useState(
    isSheetsConfigured ? "Connecting to Google Sheets..." : "Local demo mode"
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (isSheetsConfigured) {
      return seedTransactions;
    }
    const saved = localStorage.getItem("smart-mudra-transactions");
    return saved ? JSON.parse(saved) : seedTransactions;
  });
  const [session, setSession] = useState<Session>(null);

  useEffect(() => {
    if (isSheetsConfigured) {
      return;
    }
    localStorage.setItem("smart-mudra-transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    if (!isSheetsConfigured) {
      return;
    }

    loadSheetsData()
      .then((data) => {
        setShops(data.shops.length ? data.shops : seedShops);
        setTransactions(data.transactions);
        setFraudSignals(data.fraudSignals);
        setDataStatus("Google Sheets connected");
      })
      .catch((error) => {
        setDataStatus(error instanceof Error ? error.message : "Google Sheets connection failed");
      });
  }, []);

  const selectedShop = shops.find((shop) => shop.id === selectedShopId) ?? shops[0] ?? seedShops[0];

  return (
    <main>
      <TopBar view={view} setView={setView} dataStatus={dataStatus} />
      {view === "customer" && (
        <CustomerFlow
          shop={selectedShop}
          shops={shops}
          transactions={transactions}
          setTransactions={setTransactions}
          setSelectedShopId={setSelectedShopId}
        />
      )}
      {view === "shop" && (
        !session ? (
          <Login title="Shop Login" onLogin={setSession} />
        ) : (
          <div>
            <button style={{ float: "right", margin: "1rem" }} onClick={() => setSession(null)}>
              Logout
            </button>
            <ShopDashboard
              shop={session.role === "shopAdmin" && session.shopId ? shops.find((s) => s.id === session.shopId) || selectedShop : selectedShop}
              shops={shops}
              transactions={transactions}
              setSelectedShopId={setSelectedShopId}
              isShopAdmin={session.role === "shopAdmin"}
            />
          </div>
        )
      )}
      {view === "admin" && (
        !session || session.role !== "admin" ? (
          <Login title="Admin Login" expectedRole="admin" onLogin={setSession} />
        ) : (
          <div>
            <button style={{ float: "right", margin: "1rem" }} onClick={() => setSession(null)}>
              Logout
            </button>
            <AdminDashboard
              shops={shops}
              transactions={transactions}
              fraudSignals={fraudSignals}
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
          <IndianRupee size={22} />
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
  const [phase, setPhase] = useState<"form" | "processing" | "reward">("form");
  const [message, setMessage] = useState("");
  const [reward, setReward] = useState<number | null>(null);
  const [visitorContext, setVisitorContext] = useState<VisitorContext>(fallbackVisitorContext);

  useEffect(() => {
    loadVisitorContext().then(setVisitorContext);
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
          <select value={shop.id} onChange={(event) => setSelectedShopId(event.target.value)}>
            {shops.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        {phase === "form" && (
          <div className="form-stack">
            <div className="headline">
              <Gift size={34} />
              <h2>Try your luck</h2>
              <p>Enter today&apos;s bill details to reveal instant cashback.</p>
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
              Bill amount
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

        {phase === "processing" && (
          <div className="processing">
            <div className="spinner" />
            <h2>Checking reward</h2>
          </div>
        )}

        {phase === "reward" && (
          <div className="reward-reveal">
            <CheckCircle2 size={42} />
            <span>You won</span>
            <strong>{currency.format(reward ?? 0)}</strong>
            <p>Show this screen at the counter to redeem your cashback.</p>
            <button
              className="secondary-action"
              type="button"
              onClick={() => {
                setCustomerName("");
                setAddress("");
                setMobile("");
                setBillAmount("");
                setReward(null);
                setPhase("form");
              }}
            >
              New Bill
            </button>
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
  const totalCashback = approved.reduce((sum, item) => sum + item.reward, 0);
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
          { label: "Cashback given", value: currency.format(totalCashback), icon: IndianRupee },
          { label: "Average bill", value: currency.format(averageBill), icon: BarChart3 },
          { label: "Cost per scan", value: currency.format(shop.costPerScan), icon: Activity },
        ]}
      />

      <div className="two-column">
        <section className="surface qr-surface">
          <div className="section-title">
            <QrCode size={20} />
            <h2>QR link</h2>
          </div>
          {qrUrl && <img alt={`${shop.name} QR code`} src={qrUrl} />}
          <code>{scanUrl}</code>
          <a className="download-link" href={qrUrl} download={`${shop.id}-smart-mudra-qr.png`}>
            <Download size={18} />
            Download QR
          </a>
        </section>

        <TransactionTable transactions={shopTransactions} compact />
      </div>
    </section>
  );
}

function AdminDashboard({
  shops,
  transactions,
  fraudSignals,
}: {
  shops: Shop[];
  transactions: Transaction[];
  fraudSignals: FraudSignal[];
}) {
  const approved = transactions.filter((transaction) => transaction.status === "approved");
  const payout = approved.reduce((sum, item) => sum + item.reward, 0);
  const revenue = approved.reduce((sum, item) => {
    const shop = shops.find((candidate) => candidate.id === item.shopId);
    return sum + (shop?.costPerScan ?? 0);
  }, 0);

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
          { label: "Total payout", value: currency.format(payout), icon: IndianRupee },
          { label: "Profit", value: currency.format(revenue - payout), icon: BarChart3 },
          { label: "Active shops", value: shops.filter((shop) => shop.status === "active").length.toString(), icon: Store },
        ]}
      />

      <div className="two-column admin-grid">
        <section className="surface">
          <div className="section-title">
            <Store size={20} />
            <h2>Shop management</h2>
          </div>
          <div className="shop-list">
            {shops.map((shop) => (
              <div className="shop-row" key={shop.id}>
                <div>
                  <strong>{shop.name}</strong>
                  <span>{shop.category}</span>
                </div>
                <span className={`status ${shop.status}`}>{shop.status}</span>
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

      <TransactionTable transactions={transactions} />
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
  compact = false,
}: {
  transactions: Transaction[];
  compact?: boolean;
}) {
  const visibleTransactions = useMemo(() => transactions.slice(0, compact ? 6 : 10), [
    transactions,
    compact,
  ]);

  return (
    <section className="surface table-surface">
      <div className="section-title">
        <Users size={20} />
        <h2>Transactions</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mobile</th>
              {!compact && <th>Name</th>}
              {!compact && <th>Shop</th>}
              <th>Bill</th>
              <th>Reward</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleTransactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.mobile}</td>
                {!compact && <td>{transaction.customerName || "Walk-in"}</td>}
                {!compact && <td>{transaction.shopId}</td>}
                <td>{currency.format(transaction.billAmount)}</td>
                <td>{currency.format(transaction.reward)}</td>
                <td>
                  <span className={`status ${transaction.status}`}>{transaction.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default App;
