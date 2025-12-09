# ZOUHALL BRAND SCORE: The "Killer" Funnel Setup

This document contains the step-by-step instructions to connect your new Brand Score app to your CRM and Email tools, along with a high-impact marketing strategy.

---

## PART 1: TECHNICAL SETUP (Zapier, HubSpot, Resend)

Since this is a client-side application (React), we use a **Zapier Webhook** as the bridge to your backend tools.

### Step 1: Deploy & Configure Environment
1.  **Vercel**: Deploy this repository to Vercel.
2.  **Environment Variables**: In Vercel Project Settings > Environment Variables, add:
    *   `API_KEY`: Your Google Gemini API Key.
    *   `REACT_APP_WEBHOOK_URL`: (You will get this in the next step).

### Step 2: Create the Zapier Webhook
1.  Log in to **Zapier**.
2.  Create a new Zap. Trigger: **Webhooks by Zapier**.
3.  Event: **Catch Hook**.
4.  Click Continue. Copy the **Webhook URL**.
5.  **PASTE THIS URL** into your Vercel Environment Variables as `REACT_APP_WEBHOOK_URL` and redeploy.
6.  **Test It**: Go to your live website, fill out the Brand Score form, and submit.
7.  Go back to Zapier and click **Test Trigger**. You should see a request containing:
    *   `lead`: { name, email, phone }
    *   `scores`: { total, strategy, ... }
    *   `report_link`: (The Magic Link to view the report)
    *   `summary`: (The Executive Summary text)

### Step 3: Connect HubSpot (CRM)
1.  In the same Zap, add an Action: **HubSpot**.
2.  Event: **Create or Update Contact**.
3.  Map the fields:
    *   Email: `lead.email`
    *   First Name: `lead.name` (split if needed)
    *   Phone: `lead.phone`
    *   **Custom Properties**: Create properties in HubSpot for "Brand Score" and "Report Link".
    *   Map `scores.total` to "Brand Score".
    *   Map `report_link` to "Report Link".

### Step 4: Connect Resend (Email Delivery)
1.  In the same Zap, add an Action: **API Request (Beta)** OR use a dedicated "Send Email" integration if available.
    *   *Recommendation*: If Zapier has a Resend integration, use it. If not, use "Custom Request" to call Resend API.
    *   *Alternative*: Use HubSpot's "Marketing Email" workflow. If you added the contact to HubSpot in Step 3, you can trigger a HubSpot Workflow to send the email. This is better for tracking.

**The Email Content (Template):**
> **Subject:** Your Brand Score is Ready: [Mapped Score]/100
>
> **Body:**
> Hi [Name],
>
> We've analyzed [Brand Name]. Your momentum score is **[Score]**.
>
> **Executive Summary:**
> [Summary Text from Webhook]
>
> **Access your full detailed report here:**
> [Report Link]
>
> To fix these issues, book your strategy call below.
> [Link to Calendar]
>
> - The Zouhall Team

---

## PART 2: THE "KILLER" FUNNEL STRATEGY

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

### 4. Estimated Results
*   **Conversion Rate (Landing -> Lead):** High quality quizzes convert at **20-40%**. Standard landing pages convert at 2-5%.
*   **Lead Cost:** Expect 50% lower CPL (Cost Per Lead) than "Book a Call" ads because you are giving immediate value (The Score).
*   **Sales Conversion:** Leads who go through this process are "Problem Aware". They know they have a low score. Selling to them is easier because you aren't convincing them they have a problem; the *computer* already told them they do.

**Go live. This is a weapon.**
