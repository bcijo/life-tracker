# BHIM UPI & Bank Transaction Syncing Techniques

Direct API access to BHIM UPI is restricted by NPCI to licensed banks and Third-Party Application Providers (TPAPs). However, there are **4 practical architectures** to achieve automatic or semi-automatic UPI expense syncing for this app.

---

## Comparison Matrix

| Technique | Real-Time? | Effort to Build | Cost | Best For |
| :--- | :---: | :---: | :---: | :--- |
| **1. Bank Email Auto-Forwarding** | ⚡ Yes (Seconds) | Low–Medium | Free | **Best all-rounder** for personal web apps (iOS & Android) |
| **2. SMS / Notification Webhook** | ⚡ Instant | Low | Free | **Best if your bank only sends SMS** or for instant BHIM push parsing |
| **3. Statement / Passbook Import** | ❌ Batch (Weekly/Monthly) | Very Low | Free | **Zero external setup**; 100% inside the web app |
| **4. Account Aggregator (AA)** | 🔄 Daily / On-Demand | High | Paid (Prod) | **Commercial production apps** with a registered company |

---

## 1. Bank Alert Email Auto-Forwarding *(Recommended for Web Apps)*

Almost all major Indian banks (HDFC, ICICI, Axis, SBI, Kotak, etc.) send an email alert whenever a UPI debit occurs.

### Architecture
```
[Bank UPI Debit Email] 
   ──► [Gmail Filter: "debited" + "UPI"] 
   ──► [Auto-Forward to Cloudflare Email Worker / Make.com / Zapier] 
   ──► [Supabase Edge Function (Groq LLM / Regex Parser)] 
   ──► [Insert into Supabase `expenses` table]
```

### How it Works
1. **Gmail Filter:** Create a filter in Gmail for emails from your bank containing words like `"UPI"` and `"debited"`.
2. **Webhook Routing:** Auto-forward matching emails to an inbound email webhook (e.g., **Cloudflare Email Routing** -> Worker, or **Make.com** free tier).
3. **Extraction & Categorization:** A **Supabase Edge Function** receives the raw email text, extracts:
   - `amount` (e.g., `₹240.00`)
   - `merchant` / VPA (e.g., `swiggy@axisbank` -> `"Swiggy"`)
   - `date` & `reference_id` (UPI RRN to prevent duplicates)
   - Uses Groq LLM or keyword rules to match against your `expense_cards` categories.
4. **Database Insert:** Inserts the row directly into your Supabase `expenses` table.

### Pros & Cons
- **Pros:** Works across both Android and iOS, completely hands-off once configured, 100% free.
- **Cons:** Some smaller PSU banks don't send instant email alerts for small UPI transactions below ₹100–₹500.

---

## 2. Mobile SMS / BHIM Notification Forwarding *(Instant Sync)*

Every UPI payment triggers both a bank debit SMS and a push notification from the BHIM / UPI app (`"Paid ₹150 to Merchant"`).

### Architecture
```
[BHIM Notification or Bank SMS on Phone]
   ──► [Android: MacroDroid / Tasker | iOS: Apple Shortcuts]
   ──► [HTTP POST Request with raw text + secret token]
   ──► [Supabase Edge Function / REST API]
   ──► [Insert into Supabase `expenses` table]
```

### How it Works
- **On Android (MacroDroid / Tasker):**
  1. Trigger: *Notification Received* from **BHIM** (or *SMS Received* containing `"UPI"` and `"debited"`).
  2. Action: *HTTP POST* to `https://<your-project>.supabase.co/functions/v1/log-upi-expense` with the notification body.
- **On iOS (Apple Shortcuts):**
  1. Go to **Shortcuts -> Automation -> Message**.
  2. Set condition: Message contains `"UPI"` or `"debited"`.
  3. Set to **Run Immediately** -> Action: **Get Contents of URL (POST)** sending the message text to your Supabase endpoint.

### Pros & Cons
- **Pros:** Triggers within 1 second of scanning a QR code at a shop; works even if your bank doesn't send email alerts.
- **Cons:** Requires a 2-minute one-time automation setup on your phone.

---

## 3. UPI Statement / Passbook Upload (CSV / PDF / Screenshot Dropzone)

BHIM, GPay, PhonePe, Paytm, and bank portals allow exporting transaction histories as **PDF** or **CSV/XLS**, or taking screenshots of recent transactions.

### How it Works
1. Add an **"Import UPI Statement"** dropzone inside the Finances page.
2. Parse rows matching `UPI/DR/<RRN>/<Merchant>/<Bank>` (standard Indian bank narration format).
3. Use the `RRN` (12-digit UPI Reference Number) as a unique key so re-uploading overlapping statements never creates duplicate expenses.
4. Auto-map merchants to your existing categories via Groq AI before showing a quick preview table to confirm import.

### Pros & Cons
- **Pros:** Zero external webhooks or phone permissions required; everything lives inside the codebase.
- **Cons:** Manual batch action (e.g., once a week or at the end of the month).

---

## 4. India's Account Aggregator (AA) Framework *(Official Open Banking)*

India's RBI-regulated **Account Aggregator** ecosystem (used by Fold, Cred, Jupiter, Fi) lets users link their bank accounts via mobile OTP and fetch structured transaction data directly from banks (FIPs).

### Providers
- **Setu (by Pine Labs)** – Best developer documentation and free sandbox (`https://setu.co/data/account-aggregator`).
- **Finvu / Onemoney / Perfios**

### Pros & Cons
- **Pros:** Official bank-grade integration; fetches exact account balances and every UPI/card/NEFT transaction automatically.
- **Cons:** While sandbox testing is free, going live with real bank accounts in production requires a registered business entity (Private Limited / LLP) and contractual onboarding with an AA provider.
