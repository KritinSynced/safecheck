# SafeCheck — Minimal Automated Content Moderation Dashboard

SafeCheck is a beginner-friendly, end-to-end Trust & Safety application demonstrating automated content moderation for text and images. It pairs a **FastAPI (Python)** backend with **Amazon Rekognition** & **Amazon S3**, an **SQLite** audit database, and a clean **Next.js (TypeScript + Tailwind CSS)** dashboard.

---

## 1. Architecture & Tech Stack

```
   [ Next.js Frontend ] (Vercel)
            │
            ▼ (REST API)
    [ FastAPI Backend ] (Render) ───► [ SQLite DB ] (Audit Log)
            │
            ├──────────────► [ Amazon S3 ] (Private Image Storage)
            │
            └──────────────► [ Amazon Rekognition ] (DetectModerationLabels)
```

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide Icons. Designed for deployment on **Vercel**.
- **Backend:** Python 3.12, FastAPI, SQLAlchemy, Boto3, Uvicorn. Designed for deployment on **Render**.
- **Database:** SQLite (`safecheck.db`) for lightweight, zero-configuration local persistence.
- **AWS Cloud Services:**
  - **Amazon S3:** Private bucket for image storage and presigned URL generation.
  - **Amazon Rekognition:** `DetectModerationLabels` API for deep computer vision moderation.
- **Text Moderation:** Deterministic, configurable heuristic detection for harmful language (threats, violence, hate speech, profanity) and spam indicators.

---

## 2. Moderation Rules & Scoring Logic

Content is scored deterministically on a scale of **0 to 100**:

| Risk Score | Status | Automated Action | Definition |
| :--- | :--- | :--- | :--- |
| **0 – 29** | `Safe` | Auto-allowed | No policy violations or benign content. |
| **30 – 69** | `Flagged` | Held for Review | Profanity, mild spam, or suggestive visual content. Requires human review. |
| **70 – 100** | `Blocked` | Restrict / Block | Violent threats, hate speech, graphic violence, or explicit visual content. |

> **Educational Disclaimer:** SafeCheck is an educational Trust & Safety project. Automated systems can produce false positives and false negatives; high-risk and flagged content requires human review before permanent enforcement.

---

## 3. Project Structure

```
safecheck/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI application, CORS, /health
│   │   ├── config.py               # Pydantic BaseSettings & env configuration
│   │   ├── database.py             # SQLite SQLAlchemy engine & session
│   │   ├── models.py               # ModerationRecord ORM model
│   │   ├── schemas.py              # Pydantic input/output validation schemas
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   └── moderation.py       # API endpoints (text, image, history, decision)
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── text_moderation.py  # Keyword & spam pattern detection logic
│   │       └── image_moderation.py # AWS S3 upload & Rekognition integration
│   ├── tests/
│   │   └── test_moderation.py      # Pytest test suite (8 tests)
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example                # Template for backend environment variables
│   └── .env                        # Local environment configuration
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css         # Tailwind & base styling
│   │   │   ├── layout.tsx          # Root layout
│   │   │   └── page.tsx            # Main dashboard & history view
│   │   ├── components/
│   │   │   ├── Header.tsx          # Top navigation & API connectivity badge
│   │   │   ├── Sidebar.tsx         # Navigation & moderation rule reference
│   │   │   ├── StatsCards.tsx      # Aggregate counters (Total, Safe, Flagged, Blocked)
│   │   │   ├── SubmissionForm.tsx  # Text & image submission with presets
│   │   │   ├── ModerationResultsPanel.tsx # Results card, gauge meter, breakdown
│   │   │   └── HistoryTable.tsx    # Audit table with approve/reject actions
│   │   ├── lib/
│   │   │   └── api.ts              # Fetch client communicating with backend
│   │   └── types/
│   │       └── index.ts            # TypeScript interfaces
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── .env.example
│   └── .env.local                  # Local frontend environment config
└── README.md
```

---

## 4. Backend API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Health check endpoint returning status and AWS configuration flag. |
| `POST` | `/api/moderate/text` | Accepts `{"text": "..."}`, analyzes harmful words/spam, stores audit record. |
| `POST` | `/api/moderate/image` | Accepts multipart `file`, uploads to S3, calls Rekognition `DetectModerationLabels`. |
| `GET` | `/api/moderation/history` | Returns audit history list and aggregate statistics. |
| `PATCH` | `/api/moderation/{id}/decision` | Moderator action: updates record decision to `"approved"` or `"rejected"`. |

---

## 5. AWS Setup Guide (Beginner-Friendly)

Follow these steps to configure real Amazon S3 and Amazon Rekognition moderation:

### Step 1: Create an AWS Account
1. Visit [aws.amazon.com](https://aws.amazon.com) and create an account (eligible for AWS Free Tier).
2. Choose your preferred AWS Region (e.g., `us-east-1` or `us-west-2`).

### Step 2: Create a Private Amazon S3 Bucket
1. Open the **Amazon S3 Console** (`https://console.aws.amazon.com/s3/`).
2. Click **Create bucket**.
3. **Bucket name**: e.g., `safecheck-moderation-yourname` (must be globally unique).
4. **AWS Region**: Select the same region (e.g. `us-east-1`).
5. **Block Public Access settings**: Keep **Block all public access enabled** (ON). SafeCheck uses private S3 objects with secure presigned URLs.
6. Click **Create bucket**.

### Step 3: Create an IAM User with Least-Privilege Permissions
1. Open the **AWS IAM Console** (`https://console.aws.amazon.com/iam/`).
2. Go to **Users** &rarr; **Create user**.
3. Username: `safecheck-service-user`.
4. Select **Attach policies directly** &rarr; Click **Create policy**.
5. Switch to the **JSON** editor and paste this least-privilege policy (replace `YOUR-BUCKET-NAME` with your actual S3 bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SafeCheckS3Access",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    },
    {
      "Sid": "SafeCheckRekognitionAccess",
      "Effect": "Allow",
      "Action": [
        "rekognition:DetectModerationLabels"
      ],
      "Resource": "*"
    }
  ]
}
```

6. Name the policy `SafeCheckServicePolicy` and click **Create policy**.
7. Attach `SafeCheckServicePolicy` to `safecheck-service-user`.

### Step 4: Create Access Keys
1. In the IAM user's summary, click the **Security credentials** tab.
2. Scroll to **Access keys** and click **Create access key**.
3. Select **Application running outside AWS** (or Other).
4. Copy:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

---

## 6. Local Development Setup

### Running Backend Locally

1. Open a terminal in `backend/`:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. Configure `backend/.env`:
   ```ini
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=your-bucket-name
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   MOCK_AWS=false
   ALLOWED_ORIGINS=http://localhost:3000
   ```
   *(Note: If you do not have AWS keys yet, set `MOCK_AWS=true` to run with deterministic simulated responses!)*
3. Run the backend server:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```
   *(Or alternatively: `python -m app.main`)*
4. Verify by visiting `http://localhost:8000/health` or `http://localhost:8000/docs` (Swagger UI).

### Running Unit Tests

Run the test suite:
```bash
python -m pytest tests/ -v
```

### Running Frontend Locally

1. Open a terminal in `frontend/`:
   ```bash
   cd frontend
   npm install
   ```
2. Ensure `frontend/.env.local` contains:
   ```ini
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 7. Deployment Instructions

### Deploying the Backend on Render

1. Push your repository to **GitHub** (e.g., `github.com/your-username/safecheck`).
2. Log in to [render.com](https://render.com) and click **New +** &rarr; **Web Service**.
3. Select your repository.
4. Configure service settings:
   - **Name:** `safecheck-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/health`
5. In **Environment Variables**, add:
   - `AWS_REGION`: `us-east-1` (or your chosen region)
   - `AWS_S3_BUCKET`: `your-bucket-name`
   - `AWS_ACCESS_KEY_ID`: `your_access_key_id`
   - `AWS_SECRET_ACCESS_KEY`: `your_secret_access_key`
   - `ALLOWED_ORIGINS`: `http://localhost:3000,https://*.vercel.app`
   - `MOCK_AWS`: `false`
6. Click **Deploy Web Service**.
7. Once deployed, copy your Render public URL (e.g., `https://safecheck-backend.onrender.com`). Verify by visiting `https://safecheck-backend.onrender.com/health`.

---

### Deploying the Frontend on Vercel

1. Log in to [vercel.com](https://vercel.com) and click **Add New...** &rarr; **Project**.
2. Select your `safecheck` GitHub repository.
3. In Project Settings:
   - **Framework Preset:** Next.js
   - **Root Directory:** Click Edit and select `frontend`
4. In **Environment Variables**, add:
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** Your Render backend URL (e.g. `https://safecheck-backend.onrender.com` without trailing slash)
5. Click **Deploy**.
6. When Vercel completes the build, open your live dashboard URL (e.g., `https://safecheck-frontend.vercel.app`).

---

## 8. Verifying Production Operation

Once both frontend and backend are deployed:
1. Open the Vercel URL.
2. Check the top right header: the status pill will display **API Online** with a green dot.
3. Test **Text Moderation**:
   - Use the preset buttons ("Profanity", "Threat", "Safe", "Spam") and click **Analyze Content**.
   - Verify the risk score meter, status badge, and detected categories update instantly.
4. Test **Image Moderation**:
   - Upload a test JPEG or PNG image.
   - Click **Analyze Content**.
   - Verify Rekognition detects visual labels, computes confidence and risk score, and stores the audit record.
5. Test **Human-in-the-Loop Review**:
   - Go to **Moderation History**.
   - Click **Approve** or **Reject** on a flagged item.
   - Verify the database updates and the statistics counters adjust accordingly.

