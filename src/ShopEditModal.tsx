import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Save, AlertTriangle, Sparkles, Gift, Coins } from "lucide-react";
import type { Shop, RewardBand } from "./types";

interface ShopEditModalProps {
  shop: Shop;
  onClose: () => void;
  onSave: (updatedFields: Partial<Shop>) => Promise<void>;
}

export default function ShopEditModal({ shop, onClose, onSave }: ShopEditModalProps) {
  const [name, setName] = useState(shop.name);
  const [category, setCategory] = useState(shop.category);
  const [maxBillAmount, setMaxBillAmount] = useState<string>(String(shop.maxBillAmount ?? 100000));
  const [maxReward, setMaxReward] = useState<string>(String(shop.maxReward ?? 100));
  const [costPerScan, setCostPerScan] = useState<string>(String(shop.costPerScan ?? 10));
  const [rewardType, setRewardType] = useState<"mudra" | "gift">(shop.rewardType || "mudra");

  // Determine initial mudra rules mode (percentage slabs vs fixed probability bands)
  const hasPercent = (shop.rewardBands || []).some(
    (b) => typeof b.minPercent === "number" || typeof b.maxPercent === "number"
  );
  const [mudraMode, setMudraMode] = useState<"fixed" | "percent">(hasPercent ? "percent" : "fixed");

  const [bands, setBands] = useState<RewardBand[]>(() => {
    return shop.rewardBands ? JSON.parse(JSON.stringify(shop.rewardBands)) : [];
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Adjust bands when rewardType or mudraMode changes to provide smart defaults
  const handleRewardTypeChange = (type: "mudra" | "gift") => {
    setRewardType(type);
    setErrorMessage("");
    if (type === "gift") {
      setBands([
        { minBill: 0, maxBill: 1000, giftItems: "Pen, Keyring, Mug" },
        { minBill: 1000, giftItems: "T-Shirt, Umbrella, Watch" }
      ]);
    } else {
      if (mudraMode === "fixed") {
        setBands([
          { reward: 10, probability: 80, minBill: 0 },
          { reward: 50, probability: 15, minBill: 100 },
          { reward: 100, probability: 5, minBill: 500 }
        ]);
      } else {
        setBands([
          { minBill: 100, maxBill: 1000, minPercent: 5, maxPercent: 10, probability: 100 }
        ]);
      }
    }
  };

  const handleMudraModeChange = (mode: "fixed" | "percent") => {
    setMudraMode(mode);
    setErrorMessage("");
    if (mode === "fixed") {
      setBands([
        { reward: 10, probability: 80, minBill: 0 },
        { reward: 50, probability: 15, minBill: 100 },
        { reward: 100, probability: 5, minBill: 500 }
      ]);
    } else {
      setBands([
        { minBill: 100, maxBill: 1000, minPercent: 5, maxPercent: 10, probability: 100 }
      ]);
    }
  };

  const handleAddBand = () => {
    if (rewardType === "gift") {
      setBands([...bands, { minBill: 0, maxBill: undefined, giftItems: "" }]);
    } else if (mudraMode === "fixed") {
      setBands([...bands, { reward: 10, probability: 10, minBill: 0 }]);
    } else {
      setBands([...bands, { minBill: 0, maxBill: undefined, minPercent: 1, maxPercent: 5, probability: 100 }]);
    }
  };

  const handleDeleteBand = (index: number) => {
    setBands(bands.filter((_, idx) => idx !== index));
  };

  const handleBandFieldChange = (index: number, field: keyof RewardBand, value: any) => {
    const updated = [...bands];
    if (value === "") {
      delete updated[index][field];
    } else {
      if (field === "giftItems") {
        updated[index][field] = String(value);
      } else {
        updated[index][field] = Number(value);
      }
    }
    setBands(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Shop name is required.");
      return;
    }
    if (!category.trim()) {
      setErrorMessage("Category is required.");
      return;
    }

    const maxBillNum = Number(maxBillAmount);
    const maxRewardNum = Number(maxReward);
    const costPerScanNum = Number(costPerScan);

    if (isNaN(maxBillNum) || maxBillNum <= 0) {
      setErrorMessage("Invalid Max Bill Amount.");
      return;
    }
    if (isNaN(maxRewardNum) || maxRewardNum <= 0) {
      setErrorMessage("Invalid Max Reward Cap.");
      return;
    }
    if (isNaN(costPerScanNum) || costPerScanNum < 0) {
      setErrorMessage("Invalid Cost Per Scan.");
      return;
    }

    // Validate bands
    if (bands.length === 0) {
      setErrorMessage("Please configure at least one reward band/slab.");
      return;
    }

    // Context specific validations
    if (rewardType === "mudra") {
      if (mudraMode === "fixed") {
        const sumProb = bands.reduce((sum, b) => sum + (b.probability ?? 0), 0);
        if (Math.abs(sumProb - 100) > 0.01 && bands.some(b => b.probability !== undefined)) {
          setErrorMessage(`Probabilities must add up to 100%. Current sum: ${sumProb}%`);
          return;
        }
        for (const b of bands) {
          if (b.reward === undefined || b.reward <= 0) {
            setErrorMessage("Reward points must be positive for all bands.");
            return;
          }
        }
      } else {
        // Percentage slabs checks
        for (const b of bands) {
          if (b.minPercent === undefined || b.maxPercent === undefined) {
            setErrorMessage("Min and Max percentages are required for all percentage slabs.");
            return;
          }
          if (b.minPercent > b.maxPercent) {
            setErrorMessage("Min percentage cannot exceed Max percentage.");
            return;
          }
        }
      }
    } else {
      // Gift checks
      for (const b of bands) {
        if (!b.giftItems || !b.giftItems.trim()) {
          setErrorMessage("Please specify gift items for all ranges.");
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      // Clean up bands structure depending on type
      const sanitizedBands = bands.map((b) => {
        const clean: RewardBand = {};
        if (rewardType === "gift") {
          if (b.minBill !== undefined) clean.minBill = b.minBill;
          if (b.maxBill !== undefined) clean.maxBill = b.maxBill;
          clean.giftItems = b.giftItems;
        } else if (mudraMode === "fixed") {
          clean.reward = b.reward;
          clean.probability = b.probability;
          if (b.minBill !== undefined) clean.minBill = b.minBill;
        } else {
          if (b.minBill !== undefined) clean.minBill = b.minBill;
          if (b.maxBill !== undefined) clean.maxBill = b.maxBill;
          clean.minPercent = b.minPercent;
          clean.maxPercent = b.maxPercent;
          if (b.probability !== undefined) clean.probability = b.probability;
        }
        return clean;
      });

      await onSave({
        name: name.trim(),
        category: category.trim(),
        maxBillAmount: maxBillNum,
        maxReward: maxRewardNum,
        costPerScan: costPerScanNum,
        rewardType,
        rewardBands: sanitizedBands,
      });
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <button className="invoice-modal-close-btn" onClick={onClose} aria-label="Close edit dialog">
        <X size={24} />
      </button>
      
      <div className="admin-modal-card">
        <div className="admin-modal-header">
          <div className="admin-modal-title-wrap">
            <Sparkles size={22} className="modal-glow-icon" />
            <h3>Configure Shop</h3>
          </div>
          <span className="modal-subtitle">ID: {shop.id}</span>
        </div>

        <form onSubmit={handleSubmit} className="admin-modal-body">
          <div className="form-grid">
            <label>
              Shop Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Category
              <input value={category} onChange={(e) => setCategory(e.target.value)} required />
            </label>
            <label>
              Max Bill Amount (₹)
              <input type="number" min="1" value={maxBillAmount} onChange={(e) => setMaxBillAmount(e.target.value)} required />
            </label>
            <label>
              Max Reward Cap (Mudra)
              <input type="number" min="1" value={maxReward} onChange={(e) => setMaxReward(e.target.value)} required />
            </label>
            <label>
              Cost Per Scan (₹)
              <input type="number" min="0" value={costPerScan} onChange={(e) => setCostPerScan(e.target.value)} required />
            </label>
            <label>
              Shop Reward Type
              <select value={rewardType} onChange={(e) => handleRewardTypeChange(e.target.value as "mudra" | "gift")}>
                <option value="mudra">🪙 Mudra (Cashback Points)</option>
                <option value="gift">🎁 Gift (Lucky Draw Items)</option>
              </select>
            </label>
          </div>

          <div className="bands-section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {rewardType === "mudra" ? <Coins size={18} color="#facc15" /> : <Gift size={18} color="#a78bfa" />}
              <h4>Reward Slabs & Ranges</h4>
            </div>

            {rewardType === "mudra" && (
              <div className="segmented-toggle">
                <button
                  type="button"
                  className={mudraMode === "fixed" ? "active" : ""}
                  onClick={() => handleMudraModeChange("fixed")}
                >
                  Fixed Points
                </button>
                <button
                  type="button"
                  className={mudraMode === "percent" ? "active" : ""}
                  onClick={() => handleMudraModeChange("percent")}
                >
                  Percentage Slabs
                </button>
              </div>
            )}
          </div>

          <div className="bands-table-wrapper" style={{ display: 'block', overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', flexShrink: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', display: 'table' }}>
              <thead style={{ display: 'table-header-group' }}>
                {rewardType === "gift" ? (
                  <tr style={{ display: 'table-row' }}>
                    <th style={{ display: 'table-cell', textAlign: 'left', padding: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>Min Bill (₹)</th>
                    <th style={{ display: 'table-cell', textAlign: 'left', padding: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>Max Bill (₹)</th>
                    <th style={{ display: 'table-cell', textAlign: 'left', padding: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>Gift Items (comma-separated list)</th>
                    <th style={{ display: 'table-cell', textAlign: 'center', padding: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 'bold', width: "60px" }}>Actions</th>
                  </tr>
                ) : mudraMode === "fixed" ? (
                  <tr style={{ display: 'table-row' }}>
                    <th style={{ display: 'table-cell', textAlign: 'left', padding: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>Reward (Points)</th>
                    <th style={{ display: 'table-cell', textAlign: 'left', padding: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>Probability (%)</th>
                    <th style={{ display: 'table-cell', textAlign: 'left', padding: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>Min Bill (₹)</th>
                    <th style={{ display: 'table-cell', textAlign: 'center', padding: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 'bold', width: "60px" }}>Actions</th>
                  </tr>
                ) : (
                  <tr style={{ display: 'table-row' }}>
                    <th style={{ display: 'table-cell', textAlign: 'left', padding: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>Min Bill (₹)</th>
                    <th style={{ display: 'table-cell', textAlign: 'left', padding: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>Max Bill (₹)</th>
                    <th style={{ display: 'table-cell', textAlign: 'left', padding: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>Min Percent (%)</th>
                    <th style={{ display: 'table-cell', textAlign: 'left', padding: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>Max Percent (%)</th>
                    <th style={{ display: 'table-cell', textAlign: 'left', padding: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>Prob (%)</th>
                    <th style={{ display: 'table-cell', textAlign: 'center', padding: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 'bold', width: "60px" }}>Actions</th>
                  </tr>
                )}
              </thead>
              <tbody style={{ display: 'table-row-group' }}>
                {bands.map((band, idx) => (
                  <tr key={idx} style={{ display: 'table-row', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {rewardType === "gift" ? (
                      <>
                        <td style={{ display: 'table-cell', padding: '8px' }}>
                          <input
                            type="number"
                            placeholder="0"
                            min="0"
                            value={band.minBill ?? ""}
                            onChange={(e) => handleBandFieldChange(idx, "minBill", e.target.value)}
                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', padding: '6px 8px' }}
                          />
                        </td>
                        <td style={{ display: 'table-cell', padding: '8px' }}>
                          <input
                            type="number"
                            placeholder="Unlimited"
                            min="0"
                            value={band.maxBill ?? ""}
                            onChange={(e) => handleBandFieldChange(idx, "maxBill", e.target.value)}
                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', padding: '6px 8px' }}
                          />
                        </td>
                        <td style={{ display: 'table-cell', padding: '8px' }}>
                          <input
                            type="text"
                            placeholder="Mug, Keychain, Pen"
                            value={band.giftItems ?? ""}
                            onChange={(e) => handleBandFieldChange(idx, "giftItems", e.target.value)}
                            style={{ minWidth: "220px", width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', padding: '6px 8px' }}
                          />
                        </td>
                      </>
                    ) : mudraMode === "fixed" ? (
                      <>
                        <td style={{ display: 'table-cell', padding: '8px' }}>
                          <input
                            type="number"
                            min="1"
                            value={band.reward ?? ""}
                            onChange={(e) => handleBandFieldChange(idx, "reward", e.target.value)}
                            required
                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', padding: '6px 8px' }}
                          />
                        </td>
                        <td style={{ display: 'table-cell', padding: '8px' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={band.probability ?? ""}
                            onChange={(e) => handleBandFieldChange(idx, "probability", e.target.value)}
                            required
                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', padding: '6px 8px' }}
                          />
                        </td>
                        <td style={{ display: 'table-cell', padding: '8px' }}>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={band.minBill ?? ""}
                            onChange={(e) => handleBandFieldChange(idx, "minBill", e.target.value)}
                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', padding: '6px 8px' }}
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ display: 'table-cell', padding: '8px' }}>
                          <input
                            type="number"
                            placeholder="0"
                            min="0"
                            value={band.minBill ?? ""}
                            onChange={(e) => handleBandFieldChange(idx, "minBill", e.target.value)}
                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', padding: '6px 8px' }}
                          />
                        </td>
                        <td style={{ display: 'table-cell', padding: '8px' }}>
                          <input
                            type="number"
                            placeholder="Unlimited"
                            min="0"
                            value={band.maxBill ?? ""}
                            onChange={(e) => handleBandFieldChange(idx, "maxBill", e.target.value)}
                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', padding: '6px 8px' }}
                          />
                        </td>
                        <td style={{ display: 'table-cell', padding: '8px' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="Min %"
                            value={band.minPercent ?? ""}
                            onChange={(e) => handleBandFieldChange(idx, "minPercent", e.target.value)}
                            required
                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', padding: '6px 8px' }}
                          />
                        </td>
                        <td style={{ display: 'table-cell', padding: '8px' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="Max %"
                            value={band.maxPercent ?? ""}
                            onChange={(e) => handleBandFieldChange(idx, "maxPercent", e.target.value)}
                            required
                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', padding: '6px 8px' }}
                          />
                        </td>
                        <td style={{ display: 'table-cell', padding: '8px' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="100"
                            value={band.probability ?? ""}
                            onChange={(e) => handleBandFieldChange(idx, "probability", e.target.value)}
                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', padding: '6px 8px' }}
                          />
                        </td>
                      </>
                    )}
                    <td style={{ display: 'table-cell', padding: '8px', textAlign: 'center' }}>
                      <button
                        type="button"
                        className="danger-row-btn"
                        onClick={() => handleDeleteBand(idx)}
                        title="Delete Slab"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: "0.75rem" }}>
            <button type="button" className="secondary-action add-band-btn" onClick={handleAddBand}>
              <Plus size={16} />
              Add Slab / Range
            </button>
          </div>

          {errorMessage && (
            <div className="error-banner">
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="modal-actions-footer">
            <button type="button" className="secondary-action" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="primary-action" disabled={isSaving}>
              <Save size={18} />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
