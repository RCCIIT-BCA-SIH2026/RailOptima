# System Architecture: AI-Powered Automatic Block Planning System

**SIH Problem Code**: SIH26027  
**Organization**: Ministry of Railways / Indian Railways  

---

## 1. High-Level Modular Design

The platform establishes a clean separation between Presentation, REST API Gateway, Domain Logic, AI/ML, Mathematical Optimization, and Relational Persistence:

```
railway-ai-block-planner/
├── frontend/                   # React 18 + Vite + Tailwind CSS Single Page Application
│   ├── src/
│   │   ├── api/client.js       # Axios HTTP Client with JWT interceptors
│   │   ├── components/         # Top Navbar, Active Role Switcher, Sidebar, AI Explainer Modal
│   │   └── views/              # 11 Dedicated views for every operational requirement
├── backend/                    # Python 3.11 + FastAPI High-Performance Backend
│   ├── app/
│   │   ├── api/v1/endpoints/   # 12 Modular REST Routers
│   │   ├── core/               # Configuration, Security, and Database Session Factory
│   │   ├── models/             # 24 Relational SQLAlchemy Database Models
│   │   └── schemas/            # Pydantic Request & Response Data Contracts
│   ├── integrations/           # Mock Adapters for TMS, SMMS, TDMS, and COA
│   └── optimization/           # Google OR-Tools CP-SAT Engine & Conflict Detector
├── ml/                         # AI Multi-Criteria Criticality Engine & Scikit-Learn Models
├── data/                       # Simulated Demo Data Seed Engine (416 Assets, 360 Defects, etc.)
├── tests/                      # Pytest Automated Test Suites (26 Tests, 100% Passing)
└── docker/                     # Dockerfile & Docker-Compose for Multi-Container Deployment
```

---

## 2. Mathematical Optimization: Google OR-Tools CP-SAT Model

### Decision Variables:
- $Start_i \in [0, H]$: Start minute of maintenance task $i$.
- $End_i = Start_i + Duration_i$: Completion minute.
- $Active_{i,t} \in \{0, 1\}$: Track section possession indicator.
- $Shadow_{i,j} \in \{0, 1\}$: Integrated multi-departmental co-location indicator.

### Hard Constraints:
1. **Section Non-Interference**: Non-integrated blocks on the same physical section cannot overlap in time.
2. **Train Safety Clear Buffer**: 15-minute headway buffer before and after premier passenger services (Rajdhani, Vande Bharat, Shatabdi).
3. **Power Isolation Compatibility**: Electrical traction shutdown must coincide with TRD catenary isolation.
4. **Machinery & Resource Constraints**: A heavy track machine (e.g., 09-3X Tamping Express) cannot be double-booked across distinct sections.

### Multi-Objective Alternatives:
- **Alternative 1 (Balanced Plan - Recommended)**: Optimal compromise between train delay and maintenance throughput.
- **Alternative 2 (Aggressive Maintenance)**: Consolidates co-located departmental works into extended mega-blocks, clearing maximum defects.
- **Alternative 3 (Zero Passenger Disruption)**: Restricts possession strictly to off-peak nocturnal hours (01:00 - 04:30), protecting 100% passenger punctuality.
