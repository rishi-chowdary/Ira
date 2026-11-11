# 🪙 IRA — Student P2P Lending Platform
## 08. Shri Score & Financial ML Policy Engine

---

## 🧠 The Shri Score System

Traditional credit bureaus (CIBIL, Experian) penalize students for lacking debt history. IRA replaces this with the **Shri Score**—an inclusive, 0–1000 point student reputation index designed around academic discipline and peer trust.

```
┌─────────────────────────────────────────────────────────────┐
│                    SHRI SCORE TIER MATRIX                   │
├───────────┬────────────┬───────────┬─────────────┬──────────┤
│   TIER    │ SCORE RANGE│ MAX LOAN  │ RATE FACTOR │ DISCOUNT │
├───────────┼────────────┼───────────┼─────────────┼──────────┤
│  Newbie   │   0 – 299  │  ₹5,000   │    1.00x    │    0%    │
│  Bronze   │ 300 – 499  │  ₹6,000   │    0.90x    │   10%    │
│  Silver   │ 500 – 699  │  ₹7,000   │    0.80x    │   20%    │
│  Gold     │ 700 – 849  │  ₹8,500   │    0.70x    │   30%    │
│  Platinum │ 850 – 1000 │  ₹10,000  │    0.60x    │   40%    │
└───────────┴────────────┴───────────┴─────────────┴──────────┘
```

---

## 📈 Cumulative Interest Rate Schedule

Interest on IRA is time-based. The borrower pays interest according to the exact day on which repayment occurs:

```
Day 1 (≤ 24 hours):   0.00%  (Free emergency buffer, ₹0.01 platform fee)
Day 2 – 3:            3.00%
Day 4 – 5:            5.00%
Day 6 – 10:           7.00%
Day 11 – 14:          9.00%
Day 15 – 21:         11.00%
Day 22 – 30:         14.00%
Day 31 – 90:         18.00% (Maximum base cumulative ceiling)
```

### Applied Effective Interest Formula
$$\text{Effective Interest Rate} = \text{Base Cumulative Rate} \times \text{Tier Multiplier}$$

*Example:* A **Gold Tier** borrower repaying on **Day 10**:
- Base Rate: $7.00\%$
- Multiplier: $0.70$
- Effective Rate: $7.00\% \times 0.70 = 4.90\%$
- On ₹2,000 loan, interest is only ₹98.

---

## 💵 Revenue Sharing Model

### 1. Regular Interest Split
- **85% to Lender:** High-yield passive income directly incentivizing student lenders.
- **15% to Platform:** IRA platform service and escrow maintenance fee.

### 2. Overdue Penalty Interest Split
When a borrower defaults past the agreed maturity date:
- Daily penalty rate: **0.05% per day** compounding daily on remaining principal.
- **60% to Lender:** Compensates the lender for delayed capital liquidity.
- **40% to Platform:** Allocated to the IRA recovery and dispute resolution reserve.

---

## 🤖 ML Matching Algorithm (`ml/ira_ml_policy.py`)

The ML matching algorithm computes a compatibility score $S_{ij} \in [0, 1]$ between Lender $i$ and Loan Request $j$:

$$S_{ij} = w_1 \cdot \text{ProximityScore} + w_2 \cdot \text{TrustCompatibility} + w_3 \cdot \text{TenureAffinity}$$

- **Proximity Score:** Higher weighting when borrower and lender share the same university campus or district.
- **Trust Compatibility:** Lenders can set their minimum Shri Score tolerance.
- **Auto-Diversification:** Prevents any single lender from funding > 25% of their total wallet balance into a single borrower's loan.
