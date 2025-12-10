# ZOUHALL BRAND SCORE: The "Killer" Funnel Setup

This document contains the step-by-step instructions to connect your new Brand Score app to your CRM, Database, and Crawling tools.

---

## PART 1: EXTERNAL SERVICES (Database & Crawling)

### 1.1 Supabase Setup (The Database)
We use Supabase to store every lead and every generated report permanently.
1.  Go to [Supabase](https://supabase.com) and create a **New Project**.
2.  Go to the **SQL Editor** (left sidebar) and run this query to create the table:
    ```sql
    create table brand_audits (
      id uuid default gen_random_uuid() primary key,
      created_at timestamp with time zone default timezone('utc'::text, now()) not null,
      brand_name text,
      brand_url text,
      lead_first_name text,
      lead_last_name text,
      lead_email text,
      lead_phone text,
      lead_position text,
      score integer,
      report_url text,
      report_data jsonb
    );
    ```
3.  Go to **Project Settings > API**.
4.  Copy the **Project URL** and the **anon (public) Key**.
5.  Add these to your Vercel Environment Variables:
    *   `VITE_SUPABASE_URL`: [Your Project URL]
    *   `VITE_SUPABASE_ANON_KEY`: [Your Anon Key]

### 1.2 Google PageSpeed Insights (The Crawler)
We use the PSI API to technically crawl the site (measure speed, check LCP, detect tech stack).
1.  Go to the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2.  Click **Create Credentials** -> **API Key**.
3.  (Optional but Recommended) Restrict the key to only use the "PageSpeed Insights API".
4.  Copy the API Key.
5.  Add this to Vercel Environment Variables:
    *   `VITE_PSI_API_KEY`: [Your API Key]

---

## PART 2: AUTOMATION SETUP (Supabase Webhooks -> Zapier)

Since the native "Supabase" Zap is often unavailable or limited, we will use a **Database Webhook**. This forces Supabase to send data to Zapier immediately after a row is inserted.

### Step 1: Get the Zapier URL
1.  Log in to **Zapier**.
2.  Create a new Zap.
3.  **Trigger App:** Search for **"Webhooks by Zapier"**.
4.  **Trigger Event:** Select **"Catch Hook"**.
5.  Click Continue until you see the **Webhook URL**.
6.  **COPY THIS URL.**

### Step 2: Configure Supabase Webhook
1.  Go to your Supabase Project Dashboard.
2.  In the left sidebar, click **Database**.
3.  In the inner sidebar menu, click **Webhooks**.
4.  Click **"Create a new webhook"**.
5.  **Name:** `send-lead-to-zapier`
6.  **Conditions:**
    *   **Table:** `public.brand_audits`
    *   **Events:** Check `INSERT`.
7.  **Webhook Configuration:**
    *   **Method:** `POST`
    *   **URL:** Paste your Zapier Webhook URL here.
    *   **HTTP Headers:** Click "Add new header".
        *   Name: `Content-Type`
        *   Value: `application/json`
8.  Click **Create Webhook**.

### Step 3: Test & Map Data
1.  Go back to your specific app URL (localhost or Vercel) and run a full test audit. Submit the lead form.
2.  Go to Zapier and click **"Test Trigger"**.
3.  You should see a request labeled `Request A`.
4.  Inside `record`, you will see all your columns.
    *   **Tip:** The complex data (like email body) is inside the `report_data` column.
    *   Zapier might see `report_data` as a text string or a nested object. If it's a string, add a **"Formatter by Zapier"** step -> **JSON** -> **Parse JSON** to break it apart.
5.  **Finish the Zap:** Add your Email (Gmail/Outlook) or CRM (HubSpot/Salesforce) step using the data from the hook.

---

## PART 3: THE "KILLER" FUNNEL STRATEGY

**Goal:** Position the Brand Score not as a "quiz" but as a **Forensic Audit**.

### 1. The Hook (Ads & Content)
Don't say "Take a quiz". Say "Grade your business infrastructure."
*   **Ad Hook 1 (Fear/Gap):** "Most agencies guess. We audit. See exactly where your brand is leaking revenue in 2 minutes."
*   **Ad Hook 2 (Authority):** "The Zouhall Index: The standard for measuring brand momentum. What's your score?"
*   **Ad Hook 3 (Technical):** "We scanned 1,000 brands. 80% fail the Technical Health check. Test yours for free."

### 2. The Mechanics (Flow)
1.  **Traffic Source** (LinkedIn/Twitter/Meta) -> **Landing Page** (This App).
2.  **Micro-Commitments**: The "Scan" visual builds authority before they even answer a question.
3.  **The Paywall**: They invest time (2 mins) answering questions. When the "Analyzing..." loader hits, they are psychologically committed. They *need* the result.
4.  **The Reveal**: They get the score immediately (Instant Gratification) but the "Deep Dive" requires a call (The Pitch).

### 3. The Follow-Up (Automation)
*   **Immediate**: Email with the Magic Link (proof of value).
*   **24 Hours Later**: "One thing you missed." (Pick one generic weak point like SEO and send a value tip).
*   **48 Hours Later**: "I was looking at your report..." (Subject line). "I noticed your Technical Score was low. I have an engineer who can fix this in 3 days. Want to chat?" -> Link to Cal.com.

**Go live. This is a weapon.**