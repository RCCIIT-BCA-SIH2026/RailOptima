# AI-Powered Automatic Block Planning System for Indian Railways

[![SIH Problem Statement](https://img.shields.io/badge/SIH26027-Problem%20Statement-blue)](https://sih.gov.in)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61dafb)](https://react.dev)
[![Google OR-Tools](https://img.shields.io/badge/Optimization-Google%20OR--Tools%20CP--SAT-4285F4)](https://developers.google.com/optimization)
[![Tests](https://img.shields.io/badge/Tests-26%20Passed%20(100%25)-success)](https://pytest.org)

> **Notice**: This prototype is clearly marked with **SIMULATED DEMO DATA**. Indian Railways enterprise systems (TMS, SMMS, TDMS, COA) are modeled via realistic mock service integrations and standard REST interfaces ready for replacement by authorized production railway APIs.

---

## Key Features

1. **AI Multi-Criteria Priority Engine**: Formulates composite criticality scores ($0-100$) factoring defect severity, speed restrictions, track traffic density (GMT), asset health deficits, and aging penalties.
2. **Google OR-Tools CP-SAT Automatic Block Optimizer**: Mixed-integer constraint programming solver scheduling maintenance possessions while strictly respecting safety headways, power shutdowns, and resource non-overlaps.
3. **Multi-Department Integrated Shadow Blocking**: Eliminates siloed departmental closures by co-locating Civil (ENG), Signal & Telecom (S&T), and Traction Distribution (TRD) works into unified possession windows, saving hundreds of corridor hours.
4. **3-Scenario Strategic Alternative Generator**:
   - **Alternative 1 (Recommended)**: Balanced operational plan.
   - **Alternative 2**: Aggressive maintenance throughput (mega-blocks).
   - **Alternative 3**: Zero passenger disruption (nocturnal slots).
5. **AI Decision Explainer**: Generates natural language rationales for proposed blocks, window justifications, and train regulation impacts.
6. **Interactive GIS Corridor & Section Map**: React-Leaflet spatial grid covering Delhi, Agra, Kanpur, Prayagraj, Jhansi, Bhopal, Itarsi, and Nagpur corridors.
7. **What-If Simulation Sandbox**: Interactive sliders to model freight surges, emergency rail fractures, and cautionary speed orders.
8. **Multi-Tier Digital Approval Workflow**: Role-based access for DRM, Branch Officers (Sr. DEN, Sr. DOM, Sr. DSTE, Sr. DEE), and Supervisors.
9. **Railway Systems Integration Hub**: Mock ingestion gateways for TMS, SMMS, TDMS, and COA.
10. **Immutable Cryptographic Audit Trail & CSV Export**: Full accountability for every system action.

---

## Quick Start

### Option A: One-Click Launch (Windows)
Double-click `start.bat` or run in PowerShell:
```powershell
.\start.bat
```
This automatically launches both backend and frontend servers and opens your browser to [http://127.0.0.1:5173](http://127.0.0.1:5173).

---

### Option B: Manual Terminal Execution

#### 1. Backend Server
```powershell
# In project root:
.\.venv\Scripts\uvicorn.exe backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive Swagger API Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

#### 2. Frontend Application
```powershell
# In frontend/ directory:
cd frontend
npm run dev
```
Interactive Web UI: [http://127.0.0.1:5173](http://127.0.0.1:5173)

#### 3. Run Automated Test Suite
```powershell
.\.venv\Scripts\pytest.exe tests/ -v
# 150 passed in 68s (100% passing)
```

---

## Demo Accounts & Role-Based Access (RBAC)

| Role | Username | Password | Access / Department Scope |
|---|---|---|---|
| **System Administrator** | `admin` | `Admin@123` | Full system access across all departments & configurations |
| **Divisional Railway Manager (DRM)** | `drm` | `Drm@123` | Executive approval authority & division-wide corridor overview |
| **Sr. Divisional Engineer (Sr. DEN)** | `engineering_officer` | `Eng@123` | Civil Engineering (P-Way, Track defects, Tamping machines) |
| **Sr. Signal & Telecom Engineer (Sr. DSTE)** | `signal_officer` | `Signal@123` | S&T Department (Interlocking, Points, Telemetry) |
| **Sr. Electrical Engineer (Sr. DEE)** | `traction_officer` | `Trd@123` | Traction & OHE (Power shutdowns, Tower wagons) |
| **Sr. Operations Manager (Sr. DOM)** | `control_office` | `Opt@123` | Control Office (Timetable, Train punctuality, Freight paths) |
| **Senior Section Engineer (Supervisor)** | `supervisor` | `Supervisor@123` | Field work execution & defect reporting |

---

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Recharts, React-Leaflet, Axios.
- **Backend**: Python 3.11, FastAPI, SQLAlchemy 2.0, Pydantic v2, SQLite (Local Default) / PostgreSQL (Container Ready).
- **AI / ML**: Scikit-Learn (Random Forest Classifier), Pandas, NumPy.
- **Optimization**: Google OR-Tools CP-SAT.
- **Testing**: Pytest (26 unit and end-to-end integration tests).
- **Infrastructure**: Dockerfile, Docker-Compose.
