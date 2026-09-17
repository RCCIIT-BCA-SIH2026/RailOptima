# User Manual & SIH Demo Walkthrough

**Title**: AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways (SIH26027)

---

## 1. Quick Start Guide

### Prerequisites
- Python 3.11+
- Node.js v18+ & npm

### Starting the Platform
1. **Start Backend Server**:
   ```powershell
   uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   OpenAPI Swagger Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

2. **Start Frontend Web Application**:
   ```powershell
   cd frontend
   npm run dev -- --host 127.0.0.1 --port 5173
   ```
   Web Application UI: [http://127.0.0.1:5173](http://127.0.0.1:5173)

---

## 2. Recommended SIH Jury Demo Walkthrough

Follow this step-by-step user flow to showcase all 24 required modules:

### Step 1: Executive Operations Dashboard
1. Open [http://127.0.0.1:5173](http://127.0.0.1:5173).
2. Note the live KPIs:
   - **Asset Availability Index** (calculated dynamically from asset health scores).
   - **System Punctuality** (Trunk corridor performance).
   - **Critical Defect Backlog** & active speed restrictions.
   - **Multi-Department Synergy Share** showing hours saved through Integrated Shadow Blocks.

### Step 2: GIS Corridor Map
1. Click **GIS Corridor Map** on the sidebar.
2. View the interactive dark-themed spatial grid covering New Delhi, Agra, Kanpur, Prayagraj, Jhansi, Bhopal, Itarsi, and Nagpur.
3. Click any railway track polyline to inspect length, max permissible speed, and active possession status.

### Step 3: Defects & AI Priority Recalculation
1. Click **Defects & Backlog**.
2. Filter by department (ENG / SNT / TRD) or severity.
3. Click **Recalculate AI Priority**: Watch the AI Priority Engine recalculate multi-criteria criticality scores (0 to 100) and re-triage defects into P0 (Emergency), P1 (Urgent), and P2 (Routine).

### Step 4: The Primary AI Optimization Demo Flow
1. Click **AI Optimization Studio**.
2. Select your planning horizon (e.g. 24 Hours).
3. Click **Run Automatic Block Optimizer**:
   - The backend runs Google OR-Tools CP-SAT constraint solver.
   - Generates **3 distinct strategic alternatives**:
     - **Alternative 1 (Recommended)**: Balanced Operational Plan.
     - **Alternative 2**: Aggressive Maintenance Throughput (Mega-blocks).
     - **Alternative 3**: Zero Passenger Disruption (Nocturnal slots).
4. Click **Explain Rationale** on any proposed block to launch the **AI Decision Explanation Modal** showing why the window was selected, how shadow blocking was achieved, and how train delays were minimized.
5. Click **Adopt & Submit Strategy #1** to push the proposed blocks to the approval queue.

### Step 5: Officer Approval & DRM Sign-Off
1. Use the **Active Role Switcher** at the top right to switch to **DRM (Shri Rajesh Sharma)** or **Sr. DOM (Shri Sunil Meena)**.
2. Click **Officer Approval Center**.
3. Inspect the pending proposed blocks with attached AI confidence ratings.
4. Click **Approve** (green button): The block status updates immediately to `Approved` and generates an immutable audit record.

### Step 6: Multi-Department Matrix & What-If Simulation
1. Click **Department Coordination** to inspect the shadow-block synergy matrix across Civil, Signal, and Traction.
2. Click **What-If Simulation**:
   - Drag the **Freight Density Surge** slider to +30%.
   - Drag the **Emergency Defects Injected** slider to 3 fractures.
   - Click **Simulate Operational Impact** to see projected train delay minutes, timetable conflicts, and AI mitigation strategies.

### Step 7: External Systems Sync Hub & Audit Logs
1. Click **Railway Systems Hub**: View the mock integration telemetry status for TMS, SMMS, TDMS, and COA.
2. Click **Trigger Sync** to ingest live simulated sensor data.
3. Click **Audit Logs & Reports** to inspect the system audit trail and click **Export Audit Log (CSV)** to download a compliance report.
