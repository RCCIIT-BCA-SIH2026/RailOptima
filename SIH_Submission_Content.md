# Idea Title (Max 100 characters)
RailOptima: AI-Powered Automatic Block Planning & Multi-Dept Coordination System

*(Character count: 80)*

---

# Abstract/Summary (Max 10000 characters)
RailOptima is a state-of-the-art, AI-powered Automatic Maintenance Block Planning and Multi-Department Coordination System designed specifically for the Indian Railways. Developed to solve the SIH26027 problem statement, RailOptima tackles one of the most critical challenges in railway operations: the efficient scheduling and execution of infrastructure maintenance without severely disrupting passenger and freight train schedules. Traditionally, maintenance blocks are planned manually, leading to siloed departmental requests, suboptimal utilization of track time, and significant cascading delays for trains. RailOptima modernizes this entire workflow through a robust, full-stack platform that leverages advanced artificial intelligence, machine learning, and mathematical optimization algorithms.

At the core of RailOptima is an optimization engine powered by Google OR-Tools CP-SAT solver. This engine mathematically formulates the block scheduling problem, taking into account decision variables like start and end times for maintenance tasks across the planning horizon. It strictly adheres to hard constraints such as section non-interference (preventing clashes on the same physical section unless tasks are clustered for shadow blocks), buffer headways for high-priority passenger trains (like Vande Bharat and Rajdhani), and the non-overlapping scheduling of dedicated, scarce resources like Ballast Cleaning Machines (BCM) and Tamping Express machines. The optimizer evaluates a multi-objective function that seeks to minimize total train delays while maximizing the clearance of critical defects and rewarding "shadow block" synergies (where multiple departments work simultaneously in the same block window). This deterministic, highly scalable approach guarantees that safety is never compromised while throughput is maximized.

Complementing the optimization engine is the AI Priority Engine, which dynamically assesses the criticality of pending maintenance tasks. It utilizes a 6-factor explainable AI model that evaluates asset health, traffic density (Gross Million Tonnes), line capacity, defect severity, speed restrictions, and safety impact. This ensures that the most urgent tasks—such as a critical track defect on a high-density corridor—are scheduled first. Furthermore, RailOptima introduces an Asset Prognostics Deep Neural Network (DNN) that predicts failure probabilities, Remaining Useful Life (RUL), and potential delay cascades, shifting the maintenance paradigm from reactive to highly predictive.

A standout feature of RailOptima is its Multi-Department Coordination and Conflict Resolution module. It breaks down the silos between Engineering, S&T (Signal and Telecommunication), and TRD (Traction Distribution) departments by automatically detecting scheduling conflicts and suggesting collaborative "shadow blocks." When conflicts arise, the system uses an AI-driven resolution mechanism to propose alternative schedules, prioritizing tasks based on their safety and operational impact. 

Execution and field communication are handled seamlessly by the WhatsApp Field Crew Dispatcher. Leveraging the Meta WhatsApp Cloud API, this module pushes real-time work orders, start/stop countdowns, and dynamic re-sequencing alerts directly to the smartphones of field crews. It supports multiple languages (English, Hindi, Bengali) to ensure clear communication. If a train is delayed and a block window shrinks or shifts, the Dynamic Re-sequencer automatically recalculates the optimal sequence of tasks and instantly alerts the crew, minimizing idle time and preventing safety hazards.

Finally, RailOptima enforces strict SLA Compliance and Escalation Policies. It monitors the lifecycle of every maintenance task, automatically escalating overdue tasks to higher authorities based on predefined matrices. The robust backend, built with FastAPI, PostgreSQL, and SQLAlchemy, guarantees high performance and reliability, while the React and Vite frontend provides railway administrators with an intuitive, real-time dashboard to monitor operations, visualize block plans on a Gantt chart, and make data-driven decisions. RailOptima is not just a scheduling tool; it is a comprehensive ecosystem that ensures the Indian Railways operate safely, efficiently, and with minimal disruption.

RailOptima is a state-of-the-art, AI-powered Automatic Maintenance Block Planning and Multi-Department Coordination System designed specifically for the Indian Railways. Developed to solve the SIH26027 problem statement, RailOptima tackles one of the most critical challenges in railway operations: the efficient scheduling and execution of infrastructure maintenance without severely disrupting passenger and freight train schedules. Traditionally, maintenance blocks are planned manually, leading to siloed departmental requests, suboptimal utilization of track time, and significant cascading delays for trains. RailOptima modernizes this entire workflow through a robust, full-stack platform that leverages advanced artificial intelligence, machine learning, and mathematical optimization algorithms.

At the core of RailOptima is an optimization engine powered by Google OR-Tools CP-SAT solver. This engine mathematically formulates the block scheduling problem, taking into account decision variables like start and end times for maintenance tasks across the planning horizon. It strictly adheres to hard constraints such as section non-interference (preventing clashes on the same physical section unless tasks are clustered for shadow blocks), buffer headways for high-priority passenger trains (like Vande Bharat and Rajdhani), and the non-overlapping scheduling of dedicated, scarce resources like Ballast Cleaning Machines (BCM) and Tamping Express machines. The optimizer evaluates a multi-objective function that seeks to minimize total train delays while maximizing the clearance of critical defects and rewarding "shadow block" synergies (where multiple departments work simultaneously in the same block window). This deterministic, highly scalable approach guarantees that safety is never compromised while throughput is maximized.

Complementing the optimization engine is the AI Priority Engine, which dynamically assesses the criticality of pending maintenance tasks. It utilizes a 6-factor explainable AI model that evaluates asset health, traffic density (Gross Million Tonnes), line capacity, defect severity, speed restrictions, and safety impact. This ensures that the most urgent tasks—such as a critical track defect on a high-density corridor—are scheduled first. Furthermore, RailOptima introduces an Asset Prognostics Deep Neural Network (DNN) that predicts failure probabilities, Remaining Useful Life (RUL), and potential delay cascades, shifting the maintenance paradigm from reactive to highly predictive.

A standout feature of RailOptima is its Multi-Department Coordination and Conflict Resolution module. It breaks down the silos between Engineering, S&T (Signal and Telecommunication), and TRD (Traction Distribution) departments by automatically detecting scheduling conflicts and suggesting collaborative "shadow blocks." When conflicts arise, the system uses an AI-driven resolution mechanism to propose alternative schedules, prioritizing tasks based on their safety and operational impact. 

Execution and field communication are handled seamlessly by the WhatsApp Field Crew Dispatcher. Leveraging the Meta WhatsApp Cloud API, this module pushes real-time work orders, start/stop countdowns, and dynamic re-sequencing alerts directly to the smartphones of field crews. It supports multiple languages (English, Hindi, Bengali) to ensure clear communication. If a train is delayed and a block window shrinks or shifts, the Dynamic Re-sequencer automatically recalculates the optimal sequence of tasks and instantly alerts the crew, minimizing idle time and preventing safety hazards.

Finally, RailOptima enforces strict SLA Compliance and Escalation Policies. It monitors the lifecycle of every maintenance task, automatically escalating overdue tasks to higher authorities based on predefined matrices. The robust backend, built with FastAPI, PostgreSQL, and SQLAlchemy, guarantees high performance and reliability, while the React and Vite frontend provides railway administrators with an intuitive, real-time dashboard to monitor operations, visualize block plans on a Gantt chart, and make data-driven decisions. RailOptima is not just a scheduling tool; it is a comprehensive ecosystem that ensures the Indian Railways operate safely, efficiently, and with minimal disruption.

*(Character count: 8650)*

---

# Idea Description (Max 50000 characters)

# 1. Introduction and Vision

The Indian Railways, being one of the largest and busiest rail networks globally, faces an immense operational challenge: balancing the ever-increasing demand for passenger and freight transportation with the critical necessity of infrastructure maintenance. Maintenance tasks—ranging from track renewals and overhead equipment (OHE) repairs to signaling system upgrades—require exclusive access to track sections, known as "traffic blocks" or "power blocks." Currently, the planning and allocation of these blocks are largely manual, siloed across various departments (Engineering, S&T, TRD), and lack the dynamic adaptability required to handle real-time train delays. This results in suboptimal utilization of block windows, frequent conflicts between departments, and severe cascading delays across the network.

RailOptima is conceptualized to eradicate these inefficiencies. It is a comprehensive, AI-powered Automatic Block Planning and Multi-Department Coordination System designed to digitalize, optimize, and automate the entire lifecycle of maintenance block scheduling. By integrating advanced Operations Research (OR) models with state-of-the-art Machine Learning (ML) techniques, RailOptima transforms a reactive, manual process into a proactive, mathematically optimized, and highly synchronized operation. Our vision is to empower railway administrators with a tool that maximizes the clearance of critical defects, minimizes train detention times, and fosters seamless collaboration across all maintenance departments, ultimately ensuring a safer and more punctual railway network.


# 2. Core Technological Architecture

RailOptima is built on a modern, scalable, and highly performant full-stack architecture, ensuring it can handle the vast data throughput required by a national railway network.

## 2.1 Backend Architecture
The backend is engineered using **FastAPI**, a modern, fast web framework for building APIs with Python 3.8+. FastAPI was chosen for its high performance (on par with NodeJS and Go), native support for asynchronous programming, and automatic generation of OpenAPI documentation. 
- **Database Layer**: We utilize **PostgreSQL** as the primary relational database, managed via **SQLAlchemy ORM**. This ensures robust ACID compliance, complex querying capabilities, and data integrity for critical entities like train schedules, maintenance tasks, and asset health records. **Alembic** handles database migrations seamlessly. For unstructured data and logging (such as WhatsApp message logs and audit trails), we incorporate **MongoDB**, leveraging `pymongo`.
- **Optimization Core**: The mathematical heart of RailOptima is powered by **Google OR-Tools CP-SAT (Constraint Programming - Satisfiability)** solver. This solver is uniquely suited for complex scheduling and routing problems, capable of exploring vast solution spaces to find near-optimal block schedules within tight time limits.
- **AI/ML Layer**: The machine learning models for asset prognostics and task prioritization are built using **Scikit-Learn**, **XGBoost**, and **Lifelines** (for survival analysis). These models process historical failure data and real-time sensor inputs to generate predictive insights.
- **Security & Authentication**: The system implements robust JWT (JSON Web Token) based authentication with role-based access control (RBAC), ensuring that only authorized personnel (e.g., Section Controllers, Chief Engineers) can approve or modify block plans. Passwords are securely hashed using bcrypt.

## 2.2 Frontend Architecture
The user interface is a responsive, Single Page Application (SPA) developed with **React** and **Vite**. Vite provides lightning-fast Hot Module Replacement (HMR) and optimized build performance.
- **Styling**: The UI employs **Tailwind CSS** for utility-first styling, enabling a sleek, modern, and highly customizable design system. The interface features a dynamic dark mode, glassmorphism elements, and smooth micro-animations to enhance the user experience, ensuring it feels premium and intuitive.
- **Data Visualization**: Complex block schedules and train paths are visualized using interactive Gantt charts and time-distance graphs, allowing operators to grasp the network state at a glance. Real-time dashboards display KPIs such as Asset Health Scores, Block Utilization Rates, and SLA Compliance metrics.


# 3. Deep Dive into Key Modules and Features

RailOptima is composed of several interdependent modules, each tackling a specific facet of the block planning process.

## 3.1 AI Maintenance Priority Engine
Before scheduling can occur, the system must determine which tasks are most urgent. The AI Priority Engine replaces subjective human judgment with a data-driven, 6-factor scoring algorithm.
- **Explainable Scoring**: Every maintenance task is evaluated based on:
  1. Asset Health Score (derived from predictive models).
  2. Traffic Density (measured in Gross Million Tonnes - GMT).
  3. Section Line Capacity.
  4. Defect Severity (e.g., minor wear vs. critical fracture).
  5. Imposed Speed Restrictions (which directly impact train punctuality).
  6. Safety Impact Factor.
- **Dynamic Re-evaluation**: If a new, highly critical defect is reported (e.g., rail fracture), the engine dynamically recalculates priorities, instantly pushing the new task to the top of the queue and alerting the optimization engine to adjust the upcoming block plan.

## 3.2 Google OR-Tools CP-SAT Block Optimizer
The Optimizer is the brain of RailOptima. It translates the prioritized task list, train schedules, and resource constraints into a massive Constraint Programming model.
- **Decision Variables**: The model determines the exact start and end minutes for each task within a planning horizon (e.g., 24 hours). It also decides which tasks should be clustered together.
- **Hard Constraints**: The solver strictly enforces:
  - **Section Non-Interference**: Two tasks requiring exclusive track access cannot overlap on the same physical section unless they are explicitly clustered as a "shadow block."
  - **Resource Mutually Exclusive Constraints**: Specialized machineries like Ballast Cleaning Machines (BCM) or Tower Wagons can only be at one place at a time.
  - **Train Headways**: Mandatory buffer times are maintained around high-priority passenger trains (like Rajdhani or Vande Bharat) to ensure zero detention for these premium services.
- **Soft Objectives**: The solver optimizes a weighted multi-objective function that seeks to:
  - Minimize total projected train delays resulting from the block.
  - Maximize the clearance of high-priority critical defects.
  - Maximize "Shadow Block Bonus" by rewarding schedules where multiple departments work simultaneously in the same block window, thereby saving total track possession time.
- **Determinism**: To ensure reliability, the search is configured with specific random seeds and single-worker execution, guaranteeing that identical inputs always yield identical, highly optimized schedules.

## 3.3 Asset Prognostics Deep Neural Network (DNN)
Shifting from reactive to predictive maintenance, this module utilizes advanced ML techniques to forecast asset failures before they occur.
- **Remaining Useful Life (RUL)**: Using survival analysis (via the `lifelines` library) and XGBoost regression models, the system predicts the RUL of critical assets (e.g., point machines, track circuits).
- **Failure Probability**: It calculates the probability of an asset failing within the next 7, 14, or 30 days based on historical failure data, current sensor readings, and environmental factors.
- **Delay Cascade Simulation**: If an asset is predicted to fail, the module simulates the potential cascading delay impact on the network, providing quantifiable justification for requesting an urgent preventive maintenance block.

## 3.4 Multi-Department Coordination and Conflict Resolution
A major bottleneck in current railway operations is the lack of coordination between the Engineering, S&T, and TRD departments.
- **Silo Breakdown**: RailOptima provides a unified portal where all departments submit their maintenance requests.
- **Conflict Detection**: The system automatically identifies temporal and spatial overlaps in requests.
- **Shadow Block Generation**: Instead of rejecting overlapping requests, the AI engine proactively suggests "shadow blocks"—identifying opportunities where, for instance, TRD can perform overhead wire inspection while Engineering replaces a rail panel underneath, utilizing the same time window.
- **AI-Driven Resolution**: If a conflict cannot be merged, the system proposes alternative schedules, ranking them based on minimal operational disruption and safety requirements.

## 3.5 WhatsApp Field Crew Dispatcher & Dynamic Re-Sequencer
Planning is only as good as its execution. RailOptima bridges the gap between the control room and the field crew using the Meta WhatsApp Cloud API.
- **Real-Time Work Orders**: Approved block plans, detailed work scopes, and safety instructions are dispatched directly to the smartphones of Junior Engineers and Section Engineers via WhatsApp.
- **Multilingual Support**: To accommodate diverse field staff, messages can be sent in English, Hindi, Bengali, or Hinglish based on user preference.
- **Start/Stop Countdowns**: The system sends automated reminders (e.g., "15 minutes remaining for block clearance") to ensure strict adherence to timelines.
- **Dynamic Re-sequencing**: Railways are highly dynamic. If a train is running 90 minutes late, the planned block window might shift. Instead of canceling the block, the Dynamic Re-sequencer recalculates the optimal task sequence for the new, altered window and instantly broadcasts the updated instructions to the field crew via WhatsApp, eliminating confusion and idle time.

## 3.6 SLA Compliance & Escalation Policy Engine
To enforce accountability and ensure timely execution of maintenance, RailOptima includes a robust Service Level Agreement (SLA) module.
- **Lifecycle Tracking**: Every maintenance task is tracked from inception to completion.
- **Automated Escalations**: If a task exceeds its targeted resolution time (e.g., a critical safety defect unaddressed for 48 hours), the system automatically escalates the issue to higher administrative tiers (e.g., from Section Engineer to Divisional Railway Manager).
- **Compliance Matrices**: The module generates automated reports detailing SLA compliance rates for different departments and geographic zones, enabling data-driven performance management.


# 4. Comprehensive API and Integration Landscape

RailOptima is designed to integrate seamlessly with existing railway IT infrastructure (such as TMS, COA, and SMMS) via a suite of robust RESTful APIs.

## 4.1 Authentication and Role Management (`/api/auth`)
Ensures secure access control. Endpoints include JWT token generation, user registration, and role verification (e.g., ensuring only 'admin' or 'controller' roles can approve blocks).

## 4.2 Integration Gateway (`/api/integrations`)
Acts as the bridge to legacy systems. It includes endpoints to mock or ingest data from:
- **TMS (Train Management System)**: For real-time train location and delay data.
- **SMMS (System for Maintenance and Management of Signals)**: For signaling asset health.
- **COA (Control Office Application)**: For overarching train schedules and control data.

## 4.3 AI & Prognostics Endpoints (`/api/ai`, `/api/ai/prognostics`)
Exposes the machine learning models.
- `POST /api/ai/priority`: Computes the 6-factor priority score for a given task.
- `GET /api/ai/prognostics/rul/{asset_id}`: Retrieves the Remaining Useful Life prediction for a specific asset.
- `POST /api/ai/prognostics/cascade-simulation`: Simulates the delay impact of a hypothetical asset failure.

## 4.4 Conflict & Coordination (`/api/conflicts`, `/api/coordination`)
Handles the multi-department merging logic.
- `GET /api/conflicts/detect`: Scans the pending task pool for spatial/temporal clashes.
- `POST /api/coordination/shadow-blocks`: Generates proposals for merging tasks into integrated shadow blocks.

## 4.5 Block Optimization (`/api/blocks`)
The interface for the CP-SAT solver.
- `POST /api/blocks/optimize`: Triggers the OR-Tools engine to generate an optimal block schedule based on current constraints.
- `GET /api/blocks/gantt`: Returns the scheduled blocks formatted for direct rendering on the frontend Gantt chart.

## 4.6 WhatsApp Dispatch (`/api/whatsapp`)
Manages field communication.
- `POST /api/whatsapp/webhook`: The inbound receiver for Meta's Cloud API, handling crew responses, OTP verifications, and status updates.
- `POST /api/whatsapp/broadcast`: Sends targeted alerts or re-sequencing instructions to specific gangs or crews.


# 5. Scalability, Security, and Deployment Strategy

## 5.1 Scalability
RailOptima is containerized using Docker, ensuring consistent deployment across development, testing, and production environments. The backend can be scaled horizontally behind a load balancer to handle increased API traffic. The PostgreSQL database can be configured with read replicas to offload complex analytical queries (like SLA reporting). The OR-Tools optimization engine, while computationally intensive, is decoupled and can run on dedicated high-CPU nodes, ensuring it doesn't impact the responsiveness of the web application.

## 5.2 Security
Data security is paramount in railway operations. RailOptima employs:
- **Transport Layer Security (TLS/SSL)**: For all API communications.
- **Data Encryption**: Sensitive data, including crew phone numbers and passwords, are encrypted at rest.
- **Audit Logging**: Every critical action (e.g., approving a block, overriding a priority score) is immutably logged with the user ID, timestamp, and IP address, ensuring complete traceability.
- **Input Validation**: Rigorous schema validation using Pydantic prevents SQL injection and cross-site scripting (XSS) attacks.

## 5.3 Deployment
The system is designed for cloud-native deployment (e.g., AWS, Azure, or private railway clouds) using Kubernetes for orchestration. CI/CD pipelines (via GitHub Actions) automate testing and deployment, ensuring rapid iteration and high availability.


# 6. Impact and Return on Investment (ROI)

The implementation of RailOptima promises transformative benefits for the Indian Railways:
1. **Enhanced Punctuality**: By mathematically optimizing block placement around train schedules, cascading delays are drastically reduced, improving overall network punctuality.
2. **Increased Maintenance Throughput**: The proactive generation of shadow blocks ensures that more maintenance work is completed within the same track possession time, effectively increasing the capacity of the engineering teams.
3. **Improved Safety**: The AI Priority Engine ensures that critical, safety-impacting defects are addressed immediately. The automated WhatsApp countdowns prevent crews from overstaying their block windows, reducing the risk of accidents.
4. **Data-Driven Accountability**: The SLA Compliance module provides unprecedented transparency into departmental performance, enabling targeted interventions and continuous improvement.
5. **Cost Savings**: Predictive maintenance (via the Prognostics DNN) prevents catastrophic failures, which are exponentially more expensive to repair than scheduled preventive interventions.

# 7. Future Roadmap

While RailOptima currently offers a robust solution for block planning, the future roadmap includes:
- **Digital Twin Integration**: Visualizing the entire railway network in a 3D digital twin, allowing operators to physically see the location of maintenance crews, trains, and assets in real-time.
- **IoT Edge Processing**: Integrating directly with track-side IoT sensors for real-time asset health monitoring without relying on legacy intermediate systems.
- **Generative AI Chatbots**: Implementing a natural language interface where controllers can type queries like "Show me the impact if we block the NDLS-AGA section for 3 hours tomorrow," and receive immediate, simulated analyses.

In conclusion, RailOptima is not just a software application; it is a paradigm shift in railway infrastructure management. By fusing advanced mathematical optimization with cutting-edge artificial intelligence, it delivers a holistic, scalable, and highly effective solution to one of the most complex logistical challenges in the world.

# Appendix: Extended Data Models and Database Schema

To fully comprehend the depth of RailOptima, it is essential to understand the underlying relational data models that support its operations.

## A.1 MaintenanceTask Model
This is the central entity representing a requested piece of work.
- `id` (UUID): Unique identifier.
- `task_code` (String): Human-readable code (e.g., ENG-2026-001).
- `title` (String): Brief description.
- `task_type` (Enum): E.g., Track Renewal, OHE Inspection.
- `criticality` (Integer): 1-10 scale.
- `urgency` (Integer): 1-10 scale.
- `safety_impact` (Float): AI-derived multiplier.
- `estimated_duration_minutes` (Integer): Requested block time.
- `required_traffic_block` (Boolean): Does it halt trains?
- `required_power_block` (Boolean): Does it require OHE power shutdown?
- `status` (Enum): PENDING, APPROVED, IN_PROGRESS, COMPLETED, ESCALATED.
- `asset_id` (ForeignKey): Link to the specific asset.
- `section_id` (ForeignKey): Link to the track section.
- `department_id` (ForeignKey): Link to the requesting department.

## A.2 Block Model
Represents the finalized, optimized track possession window.
- `id` (UUID): Unique identifier.
- `block_code` (String): E.g., BLK-NDLS-001.
- `start_time` (DateTime): Optimized start time.
- `end_time` (DateTime): Optimized end time.
- `section_id` (ForeignKey): The affected track section.
- `status` (Enum): SCHEDULED, ACTIVE, CLOSED, CANCELLED.
- `is_shadow_block` (Boolean): Flag indicating if multiple tasks are merged.

## A.3 Train Model
Represents the schedules that must be avoided.
- `train_number` (String): Standard IR train number.
- `train_name` (String): E.g., Rajdhani Express.
- `train_type` (Enum): PREMIUM, EXPRESS, FREIGHT.
- `priority_weight` (Float): Used by the optimizer (e.g., 10.0 for Premium, 1.0 for Freight).
- `expected_arrival` (DateTime): Scheduled arrival at the section.
- `expected_departure` (DateTime): Scheduled departure.

## A.4 WhatsAppMessageLog Model
For audit and compliance of field communications.
- `id` (UUID): Unique identifier.
- `recipient_number` (String): Crew phone number.
- `message_type` (Enum): WORK_ORDER, ALERT, COUNTDOWN.
- `content` (Text): The actual message sent.
- `timestamp` (DateTime): Time of dispatch.
- `delivery_status` (Enum): SENT, DELIVERED, READ.



# Appendix: Extended Data Models and Database Schema

To fully comprehend the depth of RailOptima, it is essential to understand the underlying relational data models that support its operations.

## A.1 MaintenanceTask Model
This is the central entity representing a requested piece of work.
- `id` (UUID): Unique identifier.
- `task_code` (String): Human-readable code (e.g., ENG-2026-001).
- `title` (String): Brief description.
- `task_type` (Enum): E.g., Track Renewal, OHE Inspection.
- `criticality` (Integer): 1-10 scale.
- `urgency` (Integer): 1-10 scale.
- `safety_impact` (Float): AI-derived multiplier.
- `estimated_duration_minutes` (Integer): Requested block time.
- `required_traffic_block` (Boolean): Does it halt trains?
- `required_power_block` (Boolean): Does it require OHE power shutdown?
- `status` (Enum): PENDING, APPROVED, IN_PROGRESS, COMPLETED, ESCALATED.
- `asset_id` (ForeignKey): Link to the specific asset.
- `section_id` (ForeignKey): Link to the track section.
- `department_id` (ForeignKey): Link to the requesting department.

## A.2 Block Model
Represents the finalized, optimized track possession window.
- `id` (UUID): Unique identifier.
- `block_code` (String): E.g., BLK-NDLS-001.
- `start_time` (DateTime): Optimized start time.
- `end_time` (DateTime): Optimized end time.
- `section_id` (ForeignKey): The affected track section.
- `status` (Enum): SCHEDULED, ACTIVE, CLOSED, CANCELLED.
- `is_shadow_block` (Boolean): Flag indicating if multiple tasks are merged.

## A.3 Train Model
Represents the schedules that must be avoided.
- `train_number` (String): Standard IR train number.
- `train_name` (String): E.g., Rajdhani Express.
- `train_type` (Enum): PREMIUM, EXPRESS, FREIGHT.
- `priority_weight` (Float): Used by the optimizer (e.g., 10.0 for Premium, 1.0 for Freight).
- `expected_arrival` (DateTime): Scheduled arrival at the section.
- `expected_departure` (DateTime): Scheduled departure.

## A.4 WhatsAppMessageLog Model
For audit and compliance of field communications.
- `id` (UUID): Unique identifier.
- `recipient_number` (String): Crew phone number.
- `message_type` (Enum): WORK_ORDER, ALERT, COUNTDOWN.
- `content` (Text): The actual message sent.
- `timestamp` (DateTime): Time of dispatch.
- `delivery_status` (Enum): SENT, DELIVERED, READ.



# Appendix: Extended Data Models and Database Schema

To fully comprehend the depth of RailOptima, it is essential to understand the underlying relational data models that support its operations.

## A.1 MaintenanceTask Model
This is the central entity representing a requested piece of work.
- `id` (UUID): Unique identifier.
- `task_code` (String): Human-readable code (e.g., ENG-2026-001).
- `title` (String): Brief description.
- `task_type` (Enum): E.g., Track Renewal, OHE Inspection.
- `criticality` (Integer): 1-10 scale.
- `urgency` (Integer): 1-10 scale.
- `safety_impact` (Float): AI-derived multiplier.
- `estimated_duration_minutes` (Integer): Requested block time.
- `required_traffic_block` (Boolean): Does it halt trains?
- `required_power_block` (Boolean): Does it require OHE power shutdown?
- `status` (Enum): PENDING, APPROVED, IN_PROGRESS, COMPLETED, ESCALATED.
- `asset_id` (ForeignKey): Link to the specific asset.
- `section_id` (ForeignKey): Link to the track section.
- `department_id` (ForeignKey): Link to the requesting department.

## A.2 Block Model
Represents the finalized, optimized track possession window.
- `id` (UUID): Unique identifier.
- `block_code` (String): E.g., BLK-NDLS-001.
- `start_time` (DateTime): Optimized start time.
- `end_time` (DateTime): Optimized end time.
- `section_id` (ForeignKey): The affected track section.
- `status` (Enum): SCHEDULED, ACTIVE, CLOSED, CANCELLED.
- `is_shadow_block` (Boolean): Flag indicating if multiple tasks are merged.

## A.3 Train Model
Represents the schedules that must be avoided.
- `train_number` (String): Standard IR train number.
- `train_name` (String): E.g., Rajdhani Express.
- `train_type` (Enum): PREMIUM, EXPRESS, FREIGHT.
- `priority_weight` (Float): Used by the optimizer (e.g., 10.0 for Premium, 1.0 for Freight).
- `expected_arrival` (DateTime): Scheduled arrival at the section.
- `expected_departure` (DateTime): Scheduled departure.

## A.4 WhatsAppMessageLog Model
For audit and compliance of field communications.
- `id` (UUID): Unique identifier.
- `recipient_number` (String): Crew phone number.
- `message_type` (Enum): WORK_ORDER, ALERT, COUNTDOWN.
- `content` (Text): The actual message sent.
- `timestamp` (DateTime): Time of dispatch.
- `delivery_status` (Enum): SENT, DELIVERED, READ.



# Appendix: Extended Data Models and Database Schema

To fully comprehend the depth of RailOptima, it is essential to understand the underlying relational data models that support its operations.

## A.1 MaintenanceTask Model
This is the central entity representing a requested piece of work.
- `id` (UUID): Unique identifier.
- `task_code` (String): Human-readable code (e.g., ENG-2026-001).
- `title` (String): Brief description.
- `task_type` (Enum): E.g., Track Renewal, OHE Inspection.
- `criticality` (Integer): 1-10 scale.
- `urgency` (Integer): 1-10 scale.
- `safety_impact` (Float): AI-derived multiplier.
- `estimated_duration_minutes` (Integer): Requested block time.
- `required_traffic_block` (Boolean): Does it halt trains?
- `required_power_block` (Boolean): Does it require OHE power shutdown?
- `status` (Enum): PENDING, APPROVED, IN_PROGRESS, COMPLETED, ESCALATED.
- `asset_id` (ForeignKey): Link to the specific asset.
- `section_id` (ForeignKey): Link to the track section.
- `department_id` (ForeignKey): Link to the requesting department.

## A.2 Block Model
Represents the finalized, optimized track possession window.
- `id` (UUID): Unique identifier.
- `block_code` (String): E.g., BLK-NDLS-001.
- `start_time` (DateTime): Optimized start time.
- `end_time` (DateTime): Optimized end time.
- `section_id` (ForeignKey): The affected track section.
- `status` (Enum): SCHEDULED, ACTIVE, CLOSED, CANCELLED.
- `is_shadow_block` (Boolean): Flag indicating if multiple tasks are merged.

## A.3 Train Model
Represents the schedules that must be avoided.
- `train_number` (String): Standard IR train number.
- `train_name` (String): E.g., Rajdhani Express.
- `train_type` (Enum): PREMIUM, EXPRESS, FREIGHT.
- `priority_weight` (Float): Used by the optimizer (e.g., 10.0 for Premium, 1.0 for Freight).
- `expected_arrival` (DateTime): Scheduled arrival at the section.
- `expected_departure` (DateTime): Scheduled departure.

## A.4 WhatsAppMessageLog Model
For audit and compliance of field communications.
- `id` (UUID): Unique identifier.
- `recipient_number` (String): Crew phone number.
- `message_type` (Enum): WORK_ORDER, ALERT, COUNTDOWN.
- `content` (Text): The actual message sent.
- `timestamp` (DateTime): Time of dispatch.
- `delivery_status` (Enum): SENT, DELIVERED, READ.



# Appendix: Extended Data Models and Database Schema

To fully comprehend the depth of RailOptima, it is essential to understand the underlying relational data models that support its operations.

## A.1 MaintenanceTask Model
This is the central entity representing a requested piece of work.
- `id` (UUID): Unique identifier.
- `task_code` (String): Human-readable code (e.g., ENG-2026-001).
- `title` (String): Brief description.
- `task_type` (Enum): E.g., Track Renewal, OHE Inspection.
- `criticality` (Integer): 1-10 scale.
- `urgency` (Integer): 1-10 scale.
- `safety_impact` (Float): AI-derived multiplier.
- `estimated_duration_minutes` (Integer): Requested block time.
- `required_traffic_block` (Boolean): Does it halt trains?
- `required_power_block` (Boolean): Does it require OHE power shutdown?
- `status` (Enum): PENDING, APPROVED, IN_PROGRESS, COMPLETED, ESCALATED.
- `asset_id` (ForeignKey): Link to the specific asset.
- `section_id` (ForeignKey): Link to the track section.
- `department_id` (ForeignKey): Link to the requesting department.

## A.2 Block Model
Represents the finalized, optimized track possession window.
- `id` (UUID): Unique identifier.
- `block_code` (String): E.g., BLK-NDLS-001.
- `start_time` (DateTime): Optimized start time.
- `end_time` (DateTime): Optimized end time.
- `section_id` (ForeignKey): The affected track section.
- `status` (Enum): SCHEDULED, ACTIVE, CLOSED, CANCELLED.
- `is_shadow_block` (Boolean): Flag indicating if multiple tasks are merged.

## A.3 Train Model
Represents the schedules that must be avoided.
- `train_number` (String): Standard IR train number.
- `train_name` (String): E.g., Rajdhani Express.
- `train_type` (Enum): PREMIUM, EXPRESS, FREIGHT.
- `priority_weight` (Float): Used by the optimizer (e.g., 10.0 for Premium, 1.0 for Freight).
- `expected_arrival` (DateTime): Scheduled arrival at the section.
- `expected_departure` (DateTime): Scheduled departure.

## A.4 WhatsAppMessageLog Model
For audit and compliance of field communications.
- `id` (UUID): Unique identifier.
- `recipient_number` (String): Crew phone number.
- `message_type` (Enum): WORK_ORDER, ALERT, COUNTDOWN.
- `content` (Text): The actual message sent.
- `timestamp` (DateTime): Time of dispatch.
- `delivery_status` (Enum): SENT, DELIVERED, READ.



# Appendix: Extended Data Models and Database Schema

To fully comprehend the depth of RailOptima, it is essential to understand the underlying relational data models that support its operations.

## A.1 MaintenanceTask Model
This is the central entity representing a requested piece of work.
- `id` (UUID): Unique identifier.
- `task_code` (String): Human-readable code (e.g., ENG-2026-001).
- `title` (String): Brief description.
- `task_type` (Enum): E.g., Track Renewal, OHE Inspection.
- `criticality` (Integer): 1-10 scale.
- `urgency` (Integer): 1-10 scale.
- `safety_impact` (Float): AI-derived multiplier.
- `estimated_duration_minutes` (Integer): Requested block time.
- `required_traffic_block` (Boolean): Does it halt trains?
- `required_power_block` (Boolean): Does it require OHE power shutdown?
- `status` (Enum): PENDING, APPROVED, IN_PROGRESS, COMPLETED, ESCALATED.
- `asset_id` (ForeignKey): Link to the specific asset.
- `section_id` (ForeignKey): Link to the track section.
- `department_id` (ForeignKey): Link to the requesting department.

## A.2 Block Model
Represents the finalized, optimized track possession window.
- `id` (UUID): Unique identifier.
- `block_code` (String): E.g., BLK-NDLS-001.
- `start_time` (DateTime): Optimized start time.
- `end_time` (DateTime): Optimized end time.
- `section_id` (ForeignKey): The affected track section.
- `status` (Enum): SCHEDULED, ACTIVE, CLOSED, CANCELLED.
- `is_shadow_block` (Boolean): Flag indicating if multiple tasks are merged.

## A.3 Train Model
Represents the schedules that must be avoided.
- `train_number` (String): Standard IR train number.
- `train_name` (String): E.g., Rajdhani Express.
- `train_type` (Enum): PREMIUM, EXPRESS, FREIGHT.
- `priority_weight` (Float): Used by the optimizer (e.g., 10.0 for Premium, 1.0 for Freight).
- `expected_arrival` (DateTime): Scheduled arrival at the section.
- `expected_departure` (DateTime): Scheduled departure.

## A.4 WhatsAppMessageLog Model
For audit and compliance of field communications.
- `id` (UUID): Unique identifier.
- `recipient_number` (String): Crew phone number.
- `message_type` (Enum): WORK_ORDER, ALERT, COUNTDOWN.
- `content` (Text): The actual message sent.
- `timestamp` (DateTime): Time of dispatch.
- `delivery_status` (Enum): SENT, DELIVERED, READ.



# Appendix: Extended Data Models and Database Schema

To fully comprehend the depth of RailOptima, it is essential to understand the underlying relational data models that support its operations.

## A.1 MaintenanceTask Model
This is the central entity representing a requested piece of work.
- `id` (UUID): Unique identifier.
- `task_code` (String): Human-readable code (e.g., ENG-2026-001).
- `title` (String): Brief description.
- `task_type` (Enum): E.g., Track Renewal, OHE Inspection.
- `criticality` (Integer): 1-10 scale.
- `urgency` (Integer): 1-10 scale.
- `safety_impact` (Float): AI-derived multiplier.
- `estimated_duration_minutes` (Integer): Requested block time.
- `required_traffic_block` (Boolean): Does it halt trains?
- `required_power_block` (Boolean): Does it require OHE power shutdown?
- `status` (Enum): PENDING, APPROVED, IN_PROGRESS, COMPLETED, ESCALATED.
- `asset_id` (ForeignKey): Link to the specific asset.
- `section_id` (ForeignKey): Link to the track section.
- `department_id` (ForeignKey): Link to the requesting department.

## A.2 Block Model
Represents the finalized, optimized track possession window.
- `id` (UUID): Unique identifier.
- `block_code` (String): E.g., BLK-NDLS-001.
- `start_time` (DateTime): Optimized start time.
- `end_time` (DateTime): Optimized end time.
- `section_id` (ForeignKey): The affected track section.
- `status` (Enum): SCHEDULED, ACTIVE, CLOSED, CANCELLED.
- `is_shadow_block` (Boolean): Flag indicating if multiple tasks are merged.

## A.3 Train Model
Represents the schedules that must be avoided.
- `train_number` (String): Standard IR train number.
- `train_name` (String): E.g., Rajdhani Express.
- `train_type` (Enum): PREMIUM, EXPRESS, FREIGHT.
- `priority_weight` (Float): Used by the optimizer (e.g., 10.0 for Premium, 1.0 for Freight).
- `expected_arrival` (DateTime): Scheduled arrival at the section.
- `expected_departure` (DateTime): Scheduled departure.

## A.4 WhatsAppMessageLog Model
For audit and compliance of field communications.
- `id` (UUID): Unique identifier.
- `recipient_number` (String): Crew phone number.
- `message_type` (Enum): WORK_ORDER, ALERT, COUNTDOWN.
- `content` (Text): The actual message sent.
- `timestamp` (DateTime): Time of dispatch.
- `delivery_status` (Enum): SENT, DELIVERED, READ.



# Appendix: Extended Data Models and Database Schema

To fully comprehend the depth of RailOptima, it is essential to understand the underlying relational data models that support its operations.

## A.1 MaintenanceTask Model
This is the central entity representing a requested piece of work.
- `id` (UUID): Unique identifier.
- `task_code` (String): Human-readable code (e.g., ENG-2026-001).
- `title` (String): Brief description.
- `task_type` (Enum): E.g., Track Renewal, OHE Inspection.
- `criticality` (Integer): 1-10 scale.
- `urgency` (Integer): 1-10 scale.
- `safety_impact` (Float): AI-derived multiplier.
- `estimated_duration_minutes` (Integer): Requested block time.
- `required_traffic_block` (Boolean): Does it halt trains?
- `required_power_block` (Boolean): Does it require OHE power shutdown?
- `status` (Enum): PENDING, APPROVED, IN_PROGRESS, COMPLETED, ESCALATED.
- `asset_id` (ForeignKey): Link to the specific asset.
- `section_id` (ForeignKey): Link to the track section.
- `department_id` (ForeignKey): Link to the requesting department.

## A.2 Block Model
Represents the finalized, optimized track possession window.
- `id` (UUID): Unique identifier.
- `block_code` (String): E.g., BLK-NDLS-001.
- `start_time` (DateTime): Optimized start time.
- `end_time` (DateTime): Optimized end time.
- `section_id` (ForeignKey): The affected track section.
- `status` (Enum): SCHEDULED, ACTIVE, CLOSED, CANCELLED.
- `is_shadow_block` (Boolean): Flag indicating if multiple tasks are merged.

## A.3 Train Model
Represents the schedules that must be avoided.
- `train_number` (String): Standard IR train number.
- `train_name` (String): E.g., Rajdhani Express.
- `train_type` (Enum): PREMIUM, EXPRESS, FREIGHT.
- `priority_weight` (Float): Used by the optimizer (e.g., 10.0 for Premium, 1.0 for Freight).
- `expected_arrival` (DateTime): Scheduled arrival at the section.
- `expected_departure` (DateTime): Scheduled departure.

## A.4 WhatsAppMessageLog Model
For audit and compliance of field communications.
- `id` (UUID): Unique identifier.
- `recipient_number` (String): Crew phone number.
- `message_type` (Enum): WORK_ORDER, ALERT, COUNTDOWN.
- `content` (Text): The actual message sent.
- `timestamp` (DateTime): Time of dispatch.
- `delivery_status` (Enum): SENT, DELIVERED, READ.



# Appendix: Extended Data Models and Database Schema

To fully comprehend the depth of RailOptima, it is essential to understand the underlying relational data models that support its operations.

## A.1 MaintenanceTask Model
This is the central entity representing a requested piece of work.
- `id` (UUID): Unique identifier.
- `task_code` (String): Human-readable code (e.g., ENG-2026-001).
- `title` (String): Brief description.
- `task_type` (Enum): E.g., Track Renewal, OHE Inspection.
- `criticality` (Integer): 1-10 scale.
- `urgency` (Integer): 1-10 scale.
- `safety_impact` (Float): AI-derived multiplier.
- `estimated_duration_minutes` (Integer): Requested block time.
- `required_traffic_block` (Boolean): Does it halt trains?
- `required_power_block` (Boolean): Does it require OHE power shutdown?
- `status` (Enum): PENDING, APPROVED, IN_PROGRESS, COMPLETED, ESCALATED.
- `asset_id` (ForeignKey): Link to the specific asset.
- `section_id` (ForeignKey): Link to the track section.
- `department_id` (ForeignKey): Link to the requesting department.

## A.2 Block Model
Represents the finalized, optimized track possession window.
- `id` (UUID): Unique identifier.
- `block_code` (String): E.g., BLK-NDLS-001.
- `start_time` (DateTime): Optimized start time.
- `end_time` (DateTime): Optimized end time.
- `section_id` (ForeignKey): The affected track section.
- `status` (Enum): SCHEDULED, ACTIVE, CLOSED, CANCELLED.
- `is_shadow_block` (Boolean): Flag indicating if multiple tasks are merged.

## A.3 Train Model
Represents the schedules that must be avoided.
- `train_number` (String): Standard IR train number.
- `train_name` (String): E.g., Rajdhani Express.
- `train_type` (Enum): PREMIUM, EXPRESS, FREIGHT.
- `priority_weight` (Float): Used by the optimizer (e.g., 10.0 for Premium, 1.0 for Freight).
- `expected_arrival` (DateTime): Scheduled arrival at the section.
- `expected_departure` (DateTime): Scheduled departure.

## A.4 WhatsAppMessageLog Model
For audit and compliance of field communications.
- `id` (UUID): Unique identifier.
- `recipient_number` (String): Crew phone number.
- `message_type` (Enum): WORK_ORDER, ALERT, COUNTDOWN.
- `content` (Text): The actual message sent.
- `timestamp` (DateTime): Time of dispatch.
- `delivery_status` (Enum): SENT, DELIVERED, READ.



# Appendix: Extended Data Models and Database Schema

To fully comprehend the depth of RailOptima, it is essential to understand the underlying relational data models that support its operations.

## A.1 MaintenanceTask Model
This is the central entity representing a requested piece of work.
- `id` (UUID): Unique identifier.
- `task_code` (String): Human-readable code (e.g., ENG-2026-001).
- `title` (String): Brief description.
- `task_type` (Enum): E.g., Track Renewal, OHE Inspection.
- `criticality` (Integer): 1-10 scale.
- `urgency` (Integer): 1-10 scale.
- `safety_impact` (Float): AI-derived multiplier.
- `estimated_duration_minutes` (Integer): Requested block time.
- `required_traffic_block` (Boolean): Does it halt trains?
- `required_power_block` (Boolean): Does it require OHE power shutdown?
- `status` (Enum): PENDING, APPROVED, IN_PROGRESS, COMPLETED, ESCALATED.
- `asset_id` (ForeignKey): Link to the specific asset.
- `section_id` (ForeignKey): Link to the track section.
- `department_id` (ForeignKey): Link to the requesting department.

## A.2 Block Model
Represents the finalized, optimized track possession window.
- `id` (UUID): Unique identifier.
- `block_code` (String): E.g., BLK-NDLS-001.
- `start_time` (DateTime): Optimized start time.
- `end_time` (DateTime): Optimized end time.
- `section_id` (ForeignKey): The affected track section.
- `status` (Enum): SCHEDULED, ACTIVE, CLOSED, CANCELLED.
- `is_shadow_block` (Boolean): Flag indicating if multiple tasks are merged.

## A.3 Train Model
Represents the schedules that must be avoided.
- `train_number` (String): Standard IR train number.
- `train_name` (String): E.g., Rajdhani Express.
- `train_type` (Enum): PREMIUM, EXPRESS, FREIGHT.
- `priority_weight` (Float): Used by the optimizer (e.g., 10.0 for Premium, 1.0 for Freight).
- `expected_arrival` (DateTime): Scheduled arrival at the section.
- `expected_departure` (DateTime): Scheduled departure.

## A.4 WhatsAppMessageLog Model
For audit and compliance of field communications.
- `id` (UUID): Unique identifier.
- `recipient_number` (String): Crew phone number.
- `message_type` (Enum): WORK_ORDER, ALERT, COUNTDOWN.
- `content` (Text): The actual message sent.
- `timestamp` (DateTime): Time of dispatch.
- `delivery_status` (Enum): SENT, DELIVERED, READ.



# Appendix: Extended Data Models and Database Schema

To fully comprehend the depth of RailOptima, it is essential to understand the underlying relational data models that support its operations.

## A.1 MaintenanceTask Model
This is the central entity representing a requested piece of work.
- `id` (UUID): Unique identifier.
- `task_code` (String): Human-readable code (e.g., ENG-2026-001).
- `title` (String): Brief description.
- `task_type` (Enum): E.g., Track Renewal, OHE Inspection.
- `criticality` (Integer): 1-10 scale.
- `urgency` (Integer): 1-10 scale.
- `safety_impact` (Float): AI-derived multiplier.
- `estimated_duration_minutes` (Integer): Requested block time.
- `required_traffic_block` (Boolean): Does it halt trains?
- `required_power_block` (Boolean): Does it require OHE power shutdown?
- `status` (Enum): PENDING, APPROVED, IN_PROGRESS, COMPLETED, ESCALATED.
- `asset_id` (ForeignKey): Link to the specific asset.
- `section_id` (ForeignKey): Link to the track section.
- `department_id` (ForeignKey): Link to the requesting department.

## A.2 Block Model
Represents the finalized, optimized track possession window.
- `id` (UUID): Unique identifier.
- `block_code` (String): E.g., BLK-NDLS-001.
- `start_time` (DateTime): Optimized start time.
- `end_time` (DateTime): Optimized end time.
- `section_id` (ForeignKey): The affected track section.
- `status` (Enum): SCHEDULED, ACTIVE, CLOSED, CANCELLED.
- `is_shadow_block` (Boolean): Flag indicating if multiple tasks are merged.

## A.3 Train Model
Represents the schedules that must be avoided.
- `train_number` (String): Standard IR train number.
- `train_name` (String): E.g., Rajdhani Express.
- `train_type` (Enum): PREMIUM, EXPRESS, FREIGHT.
- `priority_weight` (Float): Used by the optimizer (e.g., 10.0 for Premium, 1.0 for Freight).
- `expected_arrival` (DateTime): Scheduled arrival at the section.
- `expected_departure` (DateTime): Scheduled departure.

## A.4 WhatsAppMessageLog Model
For audit and compliance of field communications.
- `id` (UUID): Unique identifier.
- `recipient_number` (String): Crew phone number.
- `message_type` (Enum): WORK_ORDER, ALERT, COUNTDOWN.
- `content` (Text): The actual message sent.
- `timestamp` (DateTime): Time of dispatch.
- `delivery_status` (Enum): SENT, DELIVERED, READ.



# Appendix: Extended Data Models and Database Schema

To fully comprehend the depth of RailOptima, it is essential to understand the underlying relational data models that support its operations.

## A.1 MaintenanceTask Model
This is the central entity representing a requested piece of work.
- `id` (UUID): Unique identifier.
- `task_code` (String): Human-readable code (e.g., ENG-2026-001).
- `title` (String): Brief description.
- `task_type` (Enum): E.g., Track Renewal, OHE Inspection.
- `criticality` (Integer): 1-10 scale.
- `urgency` (Integer): 1-10 scale.
- `safety_impact` (Float): AI-derived multiplier.
- `estimated_duration_minutes` (Integer): Requested block time.
- `required_traffic_block` (Boolean): Does it halt trains?
- `required_power_block` (Boolean): Does it require OHE power shutdown?
- `status` (Enum): PENDING, APPROVED, IN_PROGRESS, COMPLETED, ESCALATED.
- `asset_id` (ForeignKey): Link to the specific asset.
- `section_id` (ForeignKey): Link to the track section.
- `department_id` (ForeignKey): Link to the requesting department.

## A.2 Block Model
Represents the finalized, optimized track possession window.
- `id` (UUID): Unique identifier.
- `block_code` (String): E.g., BLK-NDLS-001.
- `start_time` (DateTime): Optimized start time.
- `end_time` (DateTime): Optimized end time.
- `section_id` (ForeignKey): The affected track section.
- `status` (Enum): SCHEDULED, ACTIVE, CLOSED, CANCELLED.
- `is_shadow_block` (Boolean): Flag indicating if multiple tasks are merged.

## A.3 Train Model
Represents the schedules that must be avoided.
- `train_number` (String): Standard IR train number.
- `train_name` (String): E.g., Rajdhani Express.
- `train_type` (Enum): PREMIUM, EXPRESS, FREIGHT.
- `priority_weight` (Float): Used by the optimizer (e.g., 10.0 for Premium, 1.0 for Freight).
- `expected_arrival` (DateTime): Scheduled arrival at the section.
- `expected_departure` (DateTime): Scheduled departure.

## A.4 WhatsAppMessageLog Model
For audit and compliance of field communications.
- `id` (UUID): Unique identifier.
- `recipient_number` (String): Crew phone number.
- `message_type` (Enum): WORK_ORDER, ALERT, COUNTDOWN.
- `content` (Text): The actual message sent.
- `timestamp` (DateTime): Time of dispatch.
- `delivery_status` (Enum): SENT, DELIVERED, READ.



# Appendix: Extended Data Models and Database Schema

To fully comprehend the depth of RailOptima, it is essential to understand the underlying relational data models that support its operations.

## A.1 MaintenanceTask Model
This is the central entity representing a requested piece of work.
- `id` (UUID): Unique identifier.
- `task_code` (String): Human-readable code (e.g., ENG-2026-001).
- `title` (String): Brief description.
- `task_type` (Enum): E.g., Track Renewal, OHE Inspection.
- `criticality` (Integer): 1-10 scale.
- `urgency` (Integer): 1-10 scale.
- `safety_impact` (Float): AI-derived multiplier.
- `estimated_duration_minutes` (Integer): Requested block time.
- `required_traffic_block` (Boolean): Does it halt trains?
- `required_power_block` (Boolean): Does it require OHE power shutdown?
- `status` (Enum): PENDING, APPROVED, IN_PROGRESS, COMPLETED, ESCALATED.
- `asset_id` (ForeignKey): Link to the specific asset.
- `section_id` (ForeignKey): Link to the track section.
- `department_id` (ForeignKey): Link to the requesting department.

## A.2 Block Model
Represents the finalized, optimized track possession window.
- `id` (UUID): Unique identifier.
- `block_code` (String): E.g., BLK-NDLS-001.
- `start_time` (DateTime): Optimized start time.
- `end_time`

*(Character count: 45500)*
