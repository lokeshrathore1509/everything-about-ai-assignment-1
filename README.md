# SplitEase — Full-Stack Group Expense Splitter

SplitEase is a modern, production-grade fintech web application inspired by Splitwise. It provides intelligent group expense management with **exact integer-paise precision** and an **automated debt simplification settlement algorithm** that eliminates rounding errors and minimizes transfers between members.

---

## 🌟 Key Features

### 1. Financial Precision & Integer Arithmetic
- **Strict Integer Paise Precision**: All monetary values are internally tracked and manipulated as integer paise ($1\text{ INR} = 100\text{ paise}$, e.g. $₹125.50 = 12550\text{ paise}$).
- **No Floating-Point Drift**: Immune to IEEE 754 precision quirks (such as `0.1 + 0.2 = 0.30000000000000004`).
- **Deterministic Remainder Distribution**: Unequal divisions (e.g., $₹100.00 / 3$ users) allocate leftover remainder paise deterministically so the sum of participant shares always matches the total expense amount down to $0$ paise.

### 2. Multi-Mode Expense Splitting
- **Equal Split**: Divide expenses equally among selected participants with automatic deterministic remainder distribution.
- **Exact Split**: Enter individual shares; validated on both client and server to ensure exact matching with total amount.
- **Percentage Split**: Allocate percentages totaling exactly $100\%$; shares are converted to integer paise and rounded deterministically.

### 3. Debt Simplification & Minimum-Payment Algorithm
- Computes each member's net balance across all group expenses and recorded settlements.
- Matches top debtors with top creditors using a greedy debt simplification algorithm to clear all balances in at most $N - 1$ transactions.
- Distinguishes between **calculated settlement recommendations** and **explicitly recorded payments**.

### 4. Modern Fintech UI & Responsive Design
- Clean fintech aesthetic with slate neutrals, subtle shadows, and emerald accents.
- Responsive design tailored for mobile (360px+), tablet, and desktop viewports.
- Interactive Dashboard with total net balance, "You are owed", "You owe", recent activity feed, and group status cards.
- 1-Click Demo Login accounts for testing without manual typing.
- Real-time toast notifications, skeleton/spinner loading states, empty states, and accessible confirmation dialogs.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 5, Tailwind CSS, Lucide React, Axios, React Router 6 |
| **Backend** | Node.js, Express.js 4, Helmet, CORS, Express Rate Limit |
| **Database** | MongoDB with Mongoose ODM 8 |
| **Authentication** | JWT (JSON Web Tokens) with HTTP Bearer headers, bcryptjs password hashing |
| **Testing** | Jest 29, Supertest 7, Cross-Env |

---

## 📋 Prerequisites

Before running the application, make sure you have the following installed:
- **Node.js**: `v18.0.0` or higher (Tested with `v22.22.0`)
- **npm**: `v9.0.0` or higher
- **MongoDB**: A running MongoDB instance (Local on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI)

---

## 🚀 Quick Start & Installation

### 1. Clone & Install Dependencies

From the workspace root directory:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
cd ..
```

Or run the convenience script:
```bash
npm run install:all
```

---

## ⚙️ Environment Setup

### Backend Environment Configuration
A `.env.example` file is included in `server/`. Create `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/expense_splitter
JWT_SECRET=super_secret_jwt_key_expense_splitter_2026_secure
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Frontend Environment Configuration (Optional)
Vite defaults to proxying `/api` requests to `http://localhost:5000`. You can optionally create `client/.env`:

```env
VITE_API_URL=/api
```

---

## 🗄️ Database Setup & Demo Seed Data

Run the idempotent seed script to populate sample users, groups, diverse expense split types, and recorded settlements:

```bash
# From workspace root
npm run seed

# Or from server directory
cd server && npm run seed
```

### 👤 Demo Accounts

All demo accounts share the password: **`Password123!`**

| User Name | Email | Primary Role in Demo |
|---|---|---|
| **Rahul Sharma** | `rahul@example.com` | Goa Trip Organizer & candolim villa payer |
| **Priya Patel** | `priya@example.com` | Flatmate & Brittos dinner payer |
| **Aman Gupta** | `aman@example.com` | Scuba diving lead & Air purifier payer |
| **Sneha Reddy** | `sneha@example.com` | Airport cab payer & UPI settlement sender |

> 💡 **Tip**: The login page (`/login`) includes 1-click login buttons for each demo account.

---

## 💻 Running the Application

### Option A: Run Both Client & Server Concurrently (Recommended)
From the workspace root:

```bash
npm run dev
```

### Option B: Run Services Separately
In Terminal 1 (Backend):
```bash
cd server
npm run dev
# Server will run on http://localhost:5000
```

In Terminal 2 (Frontend):
```bash
cd client
npm run dev
# Frontend will run on http://localhost:5173
```

Open your browser at **`http://localhost:5173`**.

---

## 🧪 Automated Testing

The backend includes a comprehensive suite of 31 automated tests covering:
- User registration and duplicate-email rejection (HTTP 409).
- Protected route authorization and token expiration handling.
- Group creation and group membership authorization checks (HTTP 403).
- Integer-paise equal split calculations and remainder distribution.
- Exact split sum validation and error handling.
- Percentage split validation ($100\%$ check & fractional paise distribution).
- Expense creation, balance recalculation, edit updates, and deletion balance rollbacks.
- Settlement plan correctness, debtor-creditor matching, and zero-balance termination.

To run the automated tests:

```bash
# From workspace root
npm run test

# Or from server directory
cd server
npm run test
```

Expected output:
```text
PASS tests/api.test.js
PASS tests/money.test.js
PASS tests/settlement.test.js

Test Suites: 3 passed, 3 total
Tests:       31 passed, 31 total
```

---

## 📐 Database Schema & Architecture

```
User (1) ────< Group Members (N)
User (1) ────< Expense Payer (N)
User (1) ────< Expense Split Participants (N)
Group (1) ───< Expense (N)
Group (1) ───< Settlement (N)
```

### 1. `User` Model
- `name` (String, required, trimmed)
- `email` (String, required, unique, lowercase, trimmed)
- `password` (String, bcrypt hashed with salt factor 10, excluded by default)
- `avatar` (String URL)
- Timestamps (`createdAt`, `updatedAt`)

### 2. `Group` Model
- `name` (String, required)
- `description` (String)
- `category` (Enum: `Trip`, `Home`, `Couple`, `Food`, `Project`, `Other`)
- `creator` (ObjectId ref User, required)
- `members` (Array of ObjectId refs to User, indexed)
- Timestamps (`createdAt`, `updatedAt`)

### 3. `Expense` Model
- `group` (ObjectId ref Group, required, indexed)
- `description` (String, required)
- `totalAmountPaise` (Integer Number, strictly $> 0$)
- `payer` (ObjectId ref User, required)
- `participants` (Array of ObjectId refs to User)
- `splitType` (Enum: `EQUAL`, `EXACT`, `PERCENTAGE`)
- `splits`: Array of:
  - `user` (ObjectId ref User)
  - `amountPaise` (Integer Number)
  - `percentage` (Number, for percentage splits)
- `category` (Enum: `Food`, `Transportation`, `Entertainment`, `Utilities`, `Shopping`, `Lodging`, `General`)
- `date` (Date, default `Date.now`)
- `notes` (String)
- `creator` (ObjectId ref User)

### 4. `Settlement` Model (Recorded Real Payments)
- `group` (ObjectId ref Group, required, indexed)
- `fromUser` (ObjectId ref User, required)
- `toUser` (ObjectId ref User, required)
- `amountPaise` (Integer Number, strictly $> 0$)
- `date` (Date, default `Date.now`)
- `notes` (String)
- `creator` (ObjectId ref User)

---

## 💰 Integer-Paise Financial Calculations

### The Problem with Standard Floating-Point Math
Standard JavaScript numbers follow IEEE 754 double-precision floats. Operations like `0.1 + 0.2` yield `0.30000000000000004`. In multi-person split apps, splitting $₹100.00$ among 3 users ($₹33.3333...$) creates cumulative rounding errors where balances do not sum to zero.

### The SplitEase Integer-Paise Solution
1. **Conversion**: Amounts input by users in rupees are converted to integer paise using `Math.round(rupees * 100)`.
2. **Equal Split Algorithm**:
   - Total paise: $T$, Number of participants: $N$.
   - Base share: $B = \lfloor T / N \rfloor$.
   - Remainder paise: $R = T \pmod N$.
   - The first $R$ participants are assigned $B + 1$ paise; the remaining $N - R$ receive $B$ paise.
   - Proof of exactness: $R \times (B + 1) + (N - R) \times B = R + N \times B = T$.
3. **Exact Split Algorithm**:
   - User inputs individual shares in rupees, converted to integer paise.
   - Backend enforces: $\sum \text{amountPaise}_i \equiv T$. Mismatched totals are rejected with HTTP 400.
4. **Percentage Split Algorithm**:
   - Percentages must sum to $100.00\%$.
   - Initial floor share: $S_i = \lfloor (T \times P_i) / 100 \rfloor$.
   - Remainder paise: $L = T - \sum S_i$.
   - The $L$ leftover paise are distributed one-by-one to participants with the highest fractional remainder parts.
   - Guarantee: Sum of split paise equals $T$ exactly with 0 rounding loss.

---

## 🧮 Settlement & Debt Simplification Algorithm

### How Net Balances are Calculated
For each group member $M$:
$$\text{Net Balance}(M) = (\text{Total Paid for Expenses} + \text{Settlements Sent}) - (\text{Total Share Owed} + \text{Settlements Received})$$

- $\text{Net Balance} > 0$: **Creditor** (is owed money).
- $\text{Net Balance} < 0$: **Debtor** (owes money).
- $\text{Net Balance} = 0$: **Settled Up**.

### Greedy Matching Algorithm
1. Separate active members into a list of debtors (with absolute debts) and creditors (with credit amounts).
2. Sort debtors descending by debt magnitude; sort creditors descending by credit magnitude.
3. While debtors and creditors remain:
   - Identify current debtor $D$ and creditor $C$.
   - Payment amount: $P = \min(\text{debt}_D, \text{credit}_C)$.
   - Generate suggested transaction: `$D$ pays $C$ ₹(P / 100)`.
   - Update: $\text{debt}_D \leftarrow \text{debt}_D - P$, $\text{credit}_C \leftarrow \text{credit}_C - P$.
   - Advance debtor/creditor pointers when their respective remaining amounts reach $0$.
4. **Result**: A simplified set of at most $N - 1$ transactions that completely clears all debts.

### Algorithm Complexity & Theoretical Limitations
- **Time Complexity**: $\mathcal{O}(N \log N)$ where $N$ is the number of group members.
- **Limitation Note**: Finding the *absolute minimum* number of transactions across arbitrary multi-party groups is an NP-hard problem equivalent to the **Subset Sum / Partition Problem**. For example, if $A$ owes $10$, $B$ owes $20$, $C$ is owed $10$, and $D$ is owed $20$, an optimal partition creates 2 disjoint transactions ($A \rightarrow C$ and $B \rightarrow D$). A purely greedy approach without subset decomposition might generate 2 or 3 transactions depending on ordering. However, the greedy algorithm is guaranteed to settle all debts in at most $N - 1$ transactions, runs deterministically in sub-millisecond time, avoids exponential combinatorial searches, and is the industry-standard algorithm utilized by production platforms such as Splitwise.

---

## 📡 REST API Reference

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new account (`name`, `email`, `password`)
- `POST /api/auth/login` — Sign in and receive JWT token (`email`, `password`)
- `GET /api/auth/me` — Get current user profile and aggregated balances across all groups (Protected)
- `PUT /api/auth/profile` — Update user name or avatar URL (Protected)
- `PUT /api/auth/change-password` — Change password (`currentPassword`, `newPassword`) (Protected)
- `GET /api/auth/search-user?email=...` — Search registered user by exact email (Protected)

### Groups (`/api/groups`)
- `POST /api/groups` — Create a new group (`name`, `description`, `category`, `memberEmails`) (Protected)
- `GET /api/groups` — List all groups the user belongs to with preview balances (Protected)
- `GET /api/groups/:id` — Retrieve group details and member balances (Protected)
- `POST /api/groups/:id/members` — Add a registered member to the group by email (Protected)
- `GET /api/groups/:id/balances` — Retrieve member balances breakdown (Protected)

### Expenses (`/api/expenses`)
- `POST /api/expenses` — Create a group expense (`groupId`, `description`, `amount`/`amountPaise`, `payerId`, `splitType`, `splits`) (Protected)
- `GET /api/expenses/group/:groupId` — List all expenses for a group sorted by date (Protected)
- `GET /api/expenses/:id` — Retrieve single expense details (Protected)
- `PUT /api/expenses/:id` — Update expense and recalculate balances (Protected)
- `DELETE /api/expenses/:id` — Delete expense and update balances (Protected)

### Settlements (`/api/settlements`)
- `GET /api/settlements/plan/:groupId` — Generate debt simplification settlement plan (Protected)
- `POST /api/settlements` — Record an actual payment between two members (`groupId`, `fromUserId`, `toUserId`, `amount`) (Protected)
- `GET /api/settlements/group/:groupId` — List recorded settlement history (Protected)
- `DELETE /api/settlements/:id` — Delete a recorded payment and restore debt (Protected)

### System (`/api/health`)
- `GET /api/health` — Service health check

---

## 🔒 Security Best Practices Implemented

- **Password Hashing**: Passwords are never stored in plain text; hashed using `bcryptjs` with salt rounds.
- **JWT Authorization**: Stateless JWT authentication with expiration checking and user existence verification.
- **Group Isolation & Authorization**: Every group expense, balance, and settlement endpoint verifies that the requesting user is an active member of the target group (HTTP 403 on unauthorized access).
- **Rate Limiting**: `express-rate-limit` prevents credential brute-forcing on authentication endpoints.
- **HTTP Headers**: `helmet` applies essential security headers.
- **Input Sanitization**: Email lowercasing, whitespace trimming, and Mongoose type validation prevent injection.

---

## 📱 Pages Implemented

1. **Login** (`/login`): Clean authentication with 1-click demo buttons.
2. **Register** (`/register`): User registration with email uniqueness and password checks.
3. **Dashboard** (`/`): Balance hero banner, quick actions, active groups preview, and recent activity feed.
4. **Groups List** (`/groups`): Category filter, search bar, member avatars, and total spend cards.
5. **Create Group** (`/groups/new`): Name, category picker, description, and registered member email chips.
6. **Group Details** (`/groups/:id`): Tabbed interface for Expenses, Balances, Settlement Plan, Recorded Payments, and Members.
7. **Add/Edit Expense** (`/groups/:groupId/expenses/new` and `.../edit`): Equal, Exact, and Percentage live split calculators.
8. **Settlement Plan** (`/settlements`): Dedicated debt simplification view with debtor/creditor breakdown and 1-click Settle Up actions.
9. **Profile & Settings** (`/profile`): Name/avatar updates, password change, and account statistics.
10. **Not Found** (`*`): 404 page with return link.

---

## 🔮 Future Enhancements

- **Receipt OCR & Scanning**: Automated line item extraction from bill receipts using vision APIs.
- **Multi-Currency Support**: Real-time foreign exchange conversion rates for international group trips.
- **UPI Deep-Linking**: Direct mobile UPI payment links (e.g. `upi://pay?pa=...`) for instant settlement from the browser.
- **Export to CSV/PDF**: Downloadable expense reports for tax and corporate reimbursement purposes.

---

## 📄 License

This project is licensed under the MIT License.
