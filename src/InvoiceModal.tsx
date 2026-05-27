import { useEffect, useState, useRef } from "react";
import { X, Trophy, User, Globe, Sparkles, Printer, Copy, Check } from "lucide-react";
import type { Shop, Transaction } from "./types";

interface InvoiceModalProps {
  transaction: Transaction | null;
  shops: Shop[];
  onClose: () => void;
}

export default function InvoiceModal({ transaction, shops, onClose }: InvoiceModalProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const shop = shops.find((s) => s.id === transaction?.shopId);

  // Helper to format shop name if shop details aren't fully preloaded
  const formatShopName = (shopId?: string) => {
    if (!shopId) return "Unknown Shop";
    const wordSeparated = shopId.replace(/([A-Z])/g, " $1").trim();
    const name = wordSeparated.replace(/(\d+)/g, " $1").trim();
    return name.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const shopName = shop?.name || formatShopName(transaction?.shopId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!transaction) return null;

  // Format date helper
  const formatDate = (isoString?: string) => {
    if (!isoString) return "Unknown";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return (
      date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) +
      ", " +
      date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyDetails = () => {
    const isGift = transaction.rewardType === "gift";
    const rewardLine = isGift
      ? `Gift Reward Won:   ${transaction.giftItems || "N/A"}`
      : `Mudra Reward:      +${transaction.reward} mudra`;
    const detailsText = `
----------------------------------------
SMART MUDRA TRANSACTION INVOICE
----------------------------------------
Transaction ID: ${transaction.id}
Shop Name:      ${shopName} (${transaction.shopId})
Date & Time:    ${formatDate(transaction.timestamp)}
Status:         ${transaction.status.toUpperCase()}
Customer Name:  ${transaction.customerName || "Walk-in"}
Mobile Number:  ${transaction.mobile || "N/A"}
Address:        ${transaction.address || "N/A"}
----------------------------------------
Total Purchase: ₹${transaction.billAmount.toLocaleString("en-IN")}
${rewardLine}
----------------------------------------
IP Address:     ${transaction.ipAddress || "N/A"}
Location:       ${transaction.location || "N/A"}
Coordinates:    ${transaction.latitude || "N/A"}, ${transaction.longitude || "N/A"}
Rule Used:      ${transaction.rewardRule || "N/A"}
Details:        ${transaction.rewardDetails || "N/A"}
----------------------------------------
Verified Digital Receipt.
    `.trim();

    navigator.clipboard
      .writeText(detailsText)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Could not copy invoice details:", err);
      });
  };

  // Close modal when clicking on backdrop
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formattedBillAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(transaction.billAmount);

  const isGift = transaction.rewardType === "gift";
  const formattedRewardValue = isGift ? "" : `${transaction.reward} mudra`;
  const formattedNetValue = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(transaction.billAmount + (isGift ? 0 : transaction.reward));

  return (
    <div className="invoice-modal-overlay" onClick={handleOverlayClick}>
      <button className="invoice-modal-close-btn" onClick={onClose} aria-label="Close invoice dialog">
        <X size={24} />
      </button>
      <div className="invoice-card-container" ref={modalRef}>
        {/* Invoice Card Header */}
        <div className="invoice-card-header-view">
          <div className="invoice-header-icon-wrap">
            <Trophy size={22} />
          </div>
          <h3>{shopName.toUpperCase()}</h3>
          <span className="invoice-shop-sub">Shop ID: {transaction.shopId}</span>
          <div className={`invoice-status-bar ${transaction.status}`}>
            {transaction.status} Claim
          </div>
        </div>

        {/* Invoice Body */}
        <div className="invoice-card-body-view">
          {/* Metadata Grid */}
          <div className="invoice-card-meta-grid">
            <div className="invoice-meta-item trx-id-highlight">
              <span>Transaction ID</span>
              <strong>{transaction.id}</strong>
            </div>
            <div className="invoice-meta-item">
              <span>Date & Time</span>
              <strong>{formatDate(transaction.timestamp)}</strong>
            </div>
          </div>

          {/* Customer Section */}
          <div className="invoice-cust-section">
            <h4>
              <User size={14} style={{ marginRight: "6px", display: "inline-block", verticalAlign: "middle" }} />
              Customer Info
            </h4>
            <div className="invoice-cust-profile">
              <div className="invoice-profile-row">
                <span>Name:</span>
                <strong>{transaction.customerName || "Walk-in Customer"}</strong>
              </div>
              <div className="invoice-profile-row">
                <span>Mobile:</span>
                <strong>{transaction.mobile || "N/A"}</strong>
              </div>
              <div className="invoice-profile-row">
                <span>Address:</span>
                <strong>{transaction.address || "Not specified"}</strong>
              </div>
            </div>
          </div>

          {/* Purchase Details */}
          <div className="invoice-breakdown-box">
            <div className="invoice-breakdown-row">
              <span>Total Purchase Amount</span>
              <strong>{formattedBillAmount}</strong>
            </div>
            {isGift ? (
              <div className="invoice-breakdown-row reward-row">
                <span>
                  <Sparkles size={14} style={{ marginRight: "4px", display: "inline-block", verticalAlign: "middle" }} />
                  Gift Reward Won
                </span>
                <strong>{transaction.giftItems || "No gift eligible"}</strong>
              </div>
            ) : (
              <div className="invoice-breakdown-row reward-row">
                <span>
                  <Sparkles size={14} style={{ marginRight: "4px", display: "inline-block", verticalAlign: "middle" }} />
                  Mudra Cashback Won
                </span>
                <strong>+{formattedRewardValue}</strong>
              </div>
            )}
            <div className="invoice-breakdown-row total-row">
              <span>Net Value Recognized</span>
              <strong>{formattedNetValue}</strong>
            </div>

            {/* Rule Details */}
            {(transaction.rewardRule || transaction.rewardDetails) && (
              <div className="invoice-rule-details-box">
                <strong>Reward rule:</strong> {transaction.rewardRule || "Standard Slab"}
                {transaction.rewardDetails && <div className="invoice-rule-details-sub">{transaction.rewardDetails}</div>}
              </div>
            )}
          </div>

          {/* Geotag Footprint Logs */}
          <div className="invoice-footprint-box">
            <h4>
              <Globe size={14} style={{ marginRight: "6px", display: "inline-block", verticalAlign: "middle" }} />
              Security & Geotag Audit
            </h4>
            <div className="invoice-footprint-grid">
              <div className="invoice-footprint-item">
                <span>IP Address:</span>
                <strong>{transaction.ipAddress || "Unknown"}</strong>
              </div>
              <div className="invoice-footprint-item">
                <span>Network Location:</span>
                <strong>{transaction.location || "Unknown"}</strong>
              </div>
              <div className="invoice-footprint-item">
                <span>Latitude:</span>
                <strong>{transaction.latitude ?? "N/A"}</strong>
              </div>
              <div className="invoice-footprint-item">
                <span>Longitude:</span>
                <strong>{transaction.longitude ?? "N/A"}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="invoice-modal-footer">
          <button className="secondary-action invoice-action-btn invoice-close-btn-footer" onClick={onClose}>
            Close
          </button>
          <button className="secondary-action invoice-action-btn" onClick={handlePrint}>
            <Printer size={16} />
            Print Invoice
          </button>
          <button className="primary-action invoice-action-btn" onClick={handleCopyDetails}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied!" : "Copy Details"}
          </button>
        </div>
      </div>
    </div>
  );
}
