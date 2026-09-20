from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    department: Optional[str] = None
    username: str
    full_name: str
    canonical_role: Optional[str] = None
    user: Optional[Dict[str, Any]] = None

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    role_name: Optional[str] = "Supervisor"
    department_code: Optional[str] = "ENG"

class LogoutResponse(BaseModel):
    message: str
    status: str = "success"


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    department: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class DashboardSummary(BaseModel):
    total_assets: int
    active_defects: int
    critical_defects: int
    scheduled_blocks_today: int
    pending_approvals: int
    system_punctuality_pct: float
    asset_availability_pct: float
    total_trains_active: int
    active_speed_restrictions_count: int
    data_mode: str = "SIMULATED DEMO DATA"

class CorridorResponse(BaseModel):
    id: int
    code: str
    name: str
    zone: str
    division: str
    start_station: str
    end_station: str
    total_distance_km: float

    model_config = ConfigDict(from_attributes=True)

class SectionResponse(BaseModel):
    id: int
    corridor_id: int
    section_code: str
    start_station: str
    end_station: str
    track_type: str
    length_km: float
    max_permissible_speed: int
    line_capacity: int
    current_traffic_density: float
    start_lat: Optional[float] = None
    start_lng: Optional[float] = None
    end_lat: Optional[float] = None
    end_lng: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

# ==================== DEFECT SCHEMAS ====================

class DefectCreate(BaseModel):
    asset_id: Optional[int] = None
    department_code: Optional[str] = "ENG"
    department_id: Optional[int] = None
    section_id: Optional[int] = None
    location: Optional[str] = None
    defect_type: str
    description: Optional[str] = None
    severity: Optional[str] = "Major"
    criticality: Optional[str] = "P1 - Urgent"
    due_date: Optional[datetime] = None
    estimated_repair_duration_minutes: Optional[int] = 120
    status: Optional[str] = "Open"
    reported_by_system: Optional[str] = "TMS"
    speed_restriction_imposed: Optional[int] = 0

class DefectUpdate(BaseModel):
    asset_id: Optional[int] = None
    department_id: Optional[int] = None
    section_id: Optional[int] = None
    location: Optional[str] = None
    defect_type: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    criticality: Optional[str] = None
    due_date: Optional[datetime] = None
    estimated_repair_duration_minutes: Optional[int] = None
    status: Optional[str] = None
    speed_restriction_imposed: Optional[int] = None
    calculated_priority_score: Optional[float] = None

class DefectResponse(BaseModel):
    id: int
    defect_code: str
    asset_id: Optional[int] = None
    department_id: int
    section_id: Optional[int] = None
    location: Optional[str] = None
    defect_type: str
    description: Optional[str] = None
    severity: str
    criticality: Optional[str] = "P1 - Urgent"
    reported_at: datetime
    due_date: Optional[datetime] = None
    estimated_repair_duration_minutes: Optional[int] = 120
    reported_by_system: str
    status: str
    calculated_priority_score: float
    speed_restriction_imposed: int
    department_code: Optional[str] = None
    section_code: Optional[str] = None
    asset_code: Optional[str] = None
    asset_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class DefectListResponse(BaseModel):
    items: List[DefectResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class DefectStatisticsResponse(BaseModel):
    total_defects: int
    open_count: int
    investigating_count: int
    scheduled_count: int
    resolved_count: int
    critical_p0_count: int
    urgent_p1_count: int
    speed_restrictions_count: int
    avg_priority_score: float
    system_source_breakdown: Dict[str, int]
    department_breakdown: Dict[str, int]

# ==================== MAINTENANCE SCHEMAS ====================

class MaintenanceTaskCreate(BaseModel):
    title: str
    asset_id: Optional[int] = None
    defect_id: Optional[int] = None
    department_code: Optional[str] = "ENG"
    department_id: Optional[int] = None
    section_id: Optional[int] = None
    location: Optional[str] = None
    task_type: Optional[str] = "Track Maintenance"
    description: Optional[str] = None
    criticality: Optional[str] = "Medium"
    urgency: Optional[str] = "Within 3 Days"
    safety_impact: Optional[str] = "Low"
    estimated_duration_minutes: int = 120
    required_resources: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = "Pending"
    required_track_possession: Optional[bool] = True
    required_power_block: Optional[bool] = False
    required_traffic_block: Optional[bool] = True

class MaintenanceTaskUpdate(BaseModel):
    title: Optional[str] = None
    asset_id: Optional[int] = None
    defect_id: Optional[int] = None
    department_id: Optional[int] = None
    section_id: Optional[int] = None
    location: Optional[str] = None
    task_type: Optional[str] = None
    description: Optional[str] = None
    criticality: Optional[str] = None
    urgency: Optional[str] = None
    safety_impact: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None
    required_resources: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None
    required_track_possession: Optional[bool] = None
    required_power_block: Optional[bool] = None
    required_traffic_block: Optional[bool] = None

class MaintenanceTaskResponse(BaseModel):
    id: int
    task_code: str
    title: str
    asset_id: Optional[int] = None
    defect_id: Optional[int] = None
    department_id: int
    section_id: Optional[int] = None
    location: Optional[str] = None
    task_type: Optional[str] = None
    description: Optional[str] = None
    criticality: Optional[str] = "Medium"
    urgency: Optional[str] = "Within 3 Days"
    safety_impact: Optional[str] = "Low"
    estimated_duration_minutes: int
    required_resources: Optional[str] = None
    due_date: Optional[datetime] = None
    required_track_possession: bool = True
    required_power_block: bool = False
    required_traffic_block: bool = True
    status: str
    department_code: Optional[str] = None
    section_code: Optional[str] = None
    asset_code: Optional[str] = None
    asset_name: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class MaintenanceTaskListResponse(BaseModel):
    items: List[MaintenanceTaskResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class MaintenanceStatisticsResponse(BaseModel):
    total_tasks: int
    pending_count: int
    scheduled_count: int
    in_progress_count: int
    completed_count: int
    critical_count: int
    high_count: int
    avg_duration_minutes: float
    department_breakdown: Dict[str, int]

# ==================== TRAIN SCHEMAS ====================

class TrainCreate(BaseModel):
    train_no: str
    train_name: str
    train_type: str = "Mail_Express"
    priority_level: Optional[int] = 3
    max_speed: Optional[int] = 110
    is_freight: Optional[bool] = False
    origin: Optional[str] = "New Delhi (NDLS)"
    destination: Optional[str] = "Bhopal Junction (BPL)"
    route: Optional[str] = "NDLS - AGC - GWL - VGLJ - BPL"
    scheduled_departure: Optional[datetime] = None
    scheduled_arrival: Optional[datetime] = None
    expected_departure: Optional[datetime] = None
    expected_arrival: Optional[datetime] = None
    delay_minutes: Optional[int] = 0
    status: Optional[str] = "On Time"

class TrainUpdate(BaseModel):
    train_name: Optional[str] = None
    train_type: Optional[str] = None
    priority_level: Optional[int] = None
    max_speed: Optional[int] = None
    is_freight: Optional[bool] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    route: Optional[str] = None
    scheduled_departure: Optional[datetime] = None
    scheduled_arrival: Optional[datetime] = None
    expected_departure: Optional[datetime] = None
    expected_arrival: Optional[datetime] = None
    delay_minutes: Optional[int] = None
    status: Optional[str] = None

class TrainResponse(BaseModel):
    id: int
    train_no: str
    train_name: str
    train_type: str
    priority_level: int
    max_speed: int
    is_freight: bool
    origin: Optional[str] = "New Delhi (NDLS)"
    destination: Optional[str] = "Bhopal Junction (BPL)"
    route: Optional[str] = "NDLS - AGC - GWL - VGLJ - BPL"
    scheduled_departure: Optional[datetime] = None
    scheduled_arrival: Optional[datetime] = None
    expected_departure: Optional[datetime] = None
    expected_arrival: Optional[datetime] = None
    delay_minutes: int = 0
    status: str = "On Time"

    model_config = ConfigDict(from_attributes=True)

class TrainListResponse(BaseModel):
    items: List[TrainResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class TrainStatisticsResponse(BaseModel):
    total_trains: int
    on_time_count: int
    delayed_count: int
    running_count: int
    freight_count: int
    passenger_count: int
    avg_delay_minutes: float
    punctuality_rate_pct: float

# ==================== BLOCK SCHEMAS ====================

class BlockCreate(BaseModel):
    section_id: Optional[int] = None
    section_code: Optional[str] = None
    lead_department_code: Optional[str] = "ENG"
    lead_department_id: Optional[int] = None
    block_type: Optional[str] = "Traffic"
    work_type: Optional[str] = "Track Maintenance"
    requested_start_time: datetime
    requested_end_time: datetime
    duration_minutes: Optional[int] = None
    affected_assets: Optional[str] = "TRK-MAIN-01, SLP-PSC-88"
    affected_trains: Optional[str] = "12002, 22436"
    status: Optional[str] = "Upcoming"
    approval_status: Optional[str] = "Approved"

class BlockUpdate(BaseModel):
    section_id: Optional[int] = None
    lead_department_id: Optional[int] = None
    block_type: Optional[str] = None
    work_type: Optional[str] = None
    requested_start_time: Optional[datetime] = None
    requested_end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    affected_assets: Optional[str] = None
    affected_trains: Optional[str] = None
    status: Optional[str] = None
    approval_status: Optional[str] = None

class BlockResponse(BaseModel):
    id: int
    block_code: str
    plan_id: Optional[int] = None
    section_id: int
    section_code: Optional[str] = None
    block_type: str
    requested_start_time: datetime
    requested_end_time: datetime
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None
    duration_minutes: int = 180
    lead_department_id: int
    lead_department_code: Optional[str] = None
    work_type: Optional[str] = "Track Maintenance"
    affected_assets: Optional[str] = None
    affected_trains: Optional[str] = None
    status: str
    approval_status: Optional[str] = "Approved"
    total_tasks_count: int = 1

    model_config = ConfigDict(from_attributes=True)

class BlockListResponse(BaseModel):
    items: List[BlockResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class BlockStatisticsResponse(BaseModel):
    total_blocks: int
    upcoming_count: int
    active_count: int
    completed_count: int
    approved_count: int
    pending_approval_count: int
    total_duration_hours: float

class ApprovalActionRequest(BaseModel):
    action: str # Approved, Rejected, Modification_Requested
    comments: Optional[str] = "Approved by railway officer"

class OptimizeRequest(BaseModel):
    horizon_hours: int = 24
    section_id: Optional[int] = None
    department_id: Optional[int] = None
    strategy_code: Optional[str] = "BALANCED" # BALANCED, AGGRESSIVE, ZERO_PASSENGER_DISRUPTION

class WhatIfRequest(BaseModel):
    name: str = "Corridor Disruption Simulation"
    freight_surge_pct: int = 20
    emergency_defects_count: int = 2
    speed_restriction_pct: int = 15
    section_code: Optional[str] = "NDLS-TKD-UP"

# --- AI Maintenance Priority Engine Schemas ---
class AIPriorityRequest(BaseModel):
    task_id: Optional[int] = None
    task_code: Optional[str] = None
    title: Optional[str] = None
    asset_id: Optional[int] = None
    asset_type: Optional[str] = None
    asset_health: Optional[float] = None
    asset_status: Optional[str] = None
    criticality: Optional[str] = None
    urgency: Optional[str] = None
    safety_impact: Optional[str] = None
    asset_availability_impact: Optional[Union[str, float]] = None
    overdue_status: Optional[Union[str, bool, float]] = None
    operational_impact: Optional[Union[str, float]] = None
    due_date: Optional[Union[datetime, str]] = None
    is_overdue: Optional[bool] = False
    estimated_duration_minutes: Optional[int] = None
    required_traffic_block: Optional[bool] = True
    required_power_block: Optional[bool] = False
    traffic_density_gmt: Optional[float] = None
    line_capacity: Optional[int] = None
    section_id: Optional[int] = None
    section_code: Optional[str] = None
    location: Optional[str] = None
    department_code: Optional[str] = None

class FactorDetail(BaseModel):
    score: float
    max_score: float
    weight_pct: int
    detail: str

class AIPriorityResponse(BaseModel):
    task: Dict[str, Any]
    priority_score: int
    priority_level: str
    score: int
    level: str
    raw_score: Optional[float] = None
    reasons: List[str]
    factor_breakdown: Optional[Dict[str, Any]] = None
    recommendation_id: Optional[int] = None
    data_mode: str = "SIMULATED DEMO DATA"

class AIPriorityRecommendationItem(BaseModel):
    id: int
    task_id: Optional[int] = None
    task_code: Optional[str] = None
    title: Optional[str] = None
    department_code: Optional[str] = "ENG"
    priority_score: int
    priority_level: str
    criticality: Optional[str] = None
    urgency: Optional[str] = None
    safety_impact: Optional[str] = None
    asset_availability_impact: Optional[str] = None
    overdue_status: Optional[str] = None
    operational_impact: Optional[str] = None
    reasons: List[str]
    factor_breakdown: Optional[Dict[str, Any]] = None
    recommended_window: Optional[str] = None
    created_at: Optional[datetime] = None

class AIPriorityRecommendationsResponse(BaseModel):
    total_recommendations: int
    recommendations: List[AIPriorityRecommendationItem]
    data_mode: str = "SIMULATED DEMO DATA"

class AIPrioritiesListResponse(BaseModel):
    summary: Dict[str, Any]
    priorities: List[AIPriorityResponse]
    data_mode: str = "SIMULATED DEMO DATA"

# --- Automatic Block Planning Optimization Engine Schemas ---
class AIOptimizeBlocksRequest(BaseModel):
    date_range: Optional[Dict[str, Any]] = None
    section: Optional[Union[str, Dict[str, Any]]] = None
    maintenance_tasks: Optional[List[Dict[str, Any]]] = None
    train_schedule: Optional[List[Dict[str, Any]]] = None
    available_blocks: Optional[List[Dict[str, Any]]] = None
    resources: Optional[List[Dict[str, Any]]] = None
    existing_blocks: Optional[List[Dict[str, Any]]] = None
    goods_train_forecast: Optional[List[Dict[str, Any]]] = None
    passenger_train_traffic: Optional[List[Dict[str, Any]]] = None

class AIOptimizeBlocksResponse(BaseModel):
    recommended_block: Dict[str, Any]
    alternative_blocks: List[Dict[str, Any]]
    scheduled_tasks: List[Dict[str, Any]]
    affected_trains: List[Dict[str, Any]]
    estimated_train_impact: Dict[str, Any]
    asset_availability_improvement: Dict[str, Any]
    reasoning: str
    solver_info: Optional[Dict[str, Any]] = None
    data_mode: str = "SIMULATED DEMO DATA"

# ==================== CONFLICT & MULTI-DEPT SCHEMAS ====================

class ResolutionDetail(BaseModel):
    action_code: str
    title: str
    details: str
    estimated_delay_saved_minutes: Optional[int] = 0
    feasibility: Optional[str] = "High"

class ConflictItemResponse(BaseModel):
    conflict_id: str
    conflict_type: str
    severity: str
    title: str
    description: str
    entities_involved: Optional[Dict[str, Any]] = None
    location: Optional[str] = None
    time_window: Optional[Dict[str, Any]] = None
    status: str = "Open"
    recommended_resolution: Optional[ResolutionDetail] = None

class ConflictListResponse(BaseModel):
    summary: Dict[str, Any]
    conflicts: List[ConflictItemResponse]
    data_mode: str = "SIMULATED DEMO DATA"

class ConflictCheckRequest(BaseModel):
    block_code: Optional[str] = None
    task_code: Optional[str] = None
    section_code: Optional[str] = "NDLS-TKD-UP"
    start_time: Optional[Union[datetime, str]] = None
    end_time: Optional[Union[datetime, str]] = None
    department_code: Optional[str] = "ENG"
    block_type: Optional[str] = "Traffic"
    required_power_block: Optional[bool] = False
    required_traffic_block: Optional[bool] = True
    assigned_resources: Optional[List[str]] = None

class ConflictCheckResponse(BaseModel):
    has_conflicts: bool
    conflict_count: int
    risk_level: str
    can_proceed_safely: bool
    conflicts: List[Dict[str, Any]]
    recommended_resolutions: List[Dict[str, Any]]
    data_mode: str = "SIMULATED DEMO DATA"

class BundledTaskDetail(BaseModel):
    task_code: str
    title: str
    department: str
    department_name: Optional[str] = None
    duration_minutes: int
    priority_score: int
    criticality: Optional[str] = "Medium"
    required_resources: Optional[str] = None

class CombinedBlockRecommendation(BaseModel):
    recommendation_id: str
    title: str
    section_code: str
    block_type: str = "Integrated Shadow Block"
    departments_involved: List[str]
    departments_display: Optional[List[str]] = None
    tasks_count: int
    bundled_tasks: List[BundledTaskDetail]
    separate_total_minutes: int
    separate_total_hours: float
    combined_duration_minutes: int
    combined_duration_hours: float
    track_capacity_saved_hours: float
    train_disruption_reduction_pct: int
    synergy_score: int
    recommended_window: Optional[Dict[str, Any]] = None
    safety_checklist: List[str]
    resource_allocations: Optional[List[str]] = None
    data_mode: str = "SIMULATED DEMO DATA"

class CoordinationOpportunitiesResponse(BaseModel):
    total_opportunities: int
    total_track_hours_saved: float
    recommendations: List[CombinedBlockRecommendation]
    data_mode: str = "SIMULATED DEMO DATA"

# ==================== WEEKLY & MONTHLY PLANNER SCHEMAS ====================

class AlternativeTimeSlot(BaseModel):
    slot_id: str
    title: str
    start_time: str
    end_time: str
    duration_minutes: int
    passenger_delay_minutes: int = 0
    freight_delay_minutes: int = 0
    recommended: bool = True
    reason: str

class BlockRescheduleRequest(BaseModel):
    target_date: Optional[str] = None
    target_hour: Optional[Union[float, int]] = None
    new_start_time: Optional[Union[datetime, str]] = None
    new_end_time: Optional[Union[datetime, str]] = None
    force: Optional[bool] = False

class BlockRescheduleResponse(BaseModel):
    success: bool
    conflict_detected: bool
    conflict_count: int
    risk_level: str
    conflicts: List[Dict[str, Any]] = []
    alternative_time_slots: List[AlternativeTimeSlot] = []
    block: Optional[Dict[str, Any]] = None
    message: str
    data_mode: str = "SIMULATED DEMO DATA"

class WeeklyBlockItem(BaseModel):
    id: int
    block_code: str
    section_code: str
    department: str
    department_name: Optional[str] = None
    color_theme: Optional[str] = "amber"
    status: str
    block_type: str
    work_type: str
    start_time: str
    end_time: str
    day_of_week: str
    day_index: int
    start_hour: float
    end_hour: float
    duration_minutes: int
    tasks_count: int = 1
    has_conflict: bool = False

class WeeklyScheduleResponse(BaseModel):
    start_date: str
    end_date: str
    days: List[Dict[str, Any]]
    blocks: List[WeeklyBlockItem]
    department_breakdown: Dict[str, int]
    total_blocks: int
    data_mode: str = "SIMULATED DEMO DATA"

class MonthlyDaySummary(BaseModel):
    date: str
    day_number: int
    day_name: str
    is_current_month: bool
    total_blocks: int
    blocks: List[Dict[str, Any]] = []
    critical_tasks_count: int = 0
    overdue_tasks_count: int = 0
    departments_involved: List[str] = []

class MonthlySummaryResponse(BaseModel):
    month: str
    total_blocks: int
    critical_tasks_count: int
    overdue_tasks_count: int
    asset_availability_pct: float
    department_workload_hours: Dict[str, float]
    calendar_days: List[MonthlyDaySummary]
    data_mode: str = "SIMULATED DEMO DATA"


# -------------------------------------------------------------------
# Predictive Maintenance Machine Learning Schemas
# -------------------------------------------------------------------
class RiskFactorDetail(BaseModel):
    feature: str
    importance: float
    value: Optional[Any] = None

class PredictiveMaintenanceRequest(BaseModel):
    # Optional Asset & RBAC Context
    asset_id: Optional[int] = None
    asset_code: Optional[str] = None
    department_code: Optional[str] = None

    # Sensors & Telemetry (10)
    rail_wear_mm: Optional[float] = None
    track_vibration_level: Optional[float] = None
    wheel_wear_percent: Optional[float] = None
    brake_pad_wear_percent: Optional[float] = None
    brake_pressure_psi: Optional[float] = None
    axle_temperature_c: Optional[float] = None
    bearing_temperature_c: Optional[float] = None
    battery_voltage: Optional[float] = None
    sensor_health_index: Optional[float] = None
    inspection_score: Optional[float] = None

    # Asset & Operational (5)
    train_age_years: Optional[float] = None
    distance_travelled_km: Optional[float] = None
    average_speed_kmph: Optional[float] = None
    delay_minutes: Optional[float] = None
    last_maintenance_days: Optional[float] = None

    # Environmental & Context (6)
    ambient_temperature_c: Optional[float] = None
    humidity_percent: Optional[float] = None
    rainfall_mm: Optional[float] = None
    region: Optional[str] = None
    season: Optional[str] = None
    train_type: Optional[str] = None

class PredictiveMaintenanceResponse(BaseModel):
    maintenance_required: bool
    maintenance_probability: float
    risk_level: str
    top_risk_factors: List[RiskFactorDetail] = []
    model_version: str
    model_type: str = "RandomForestClassifier"
    recommended_action: Optional[str] = None
    status: str = "success"
    recommendation_id: Optional[int] = None
    recommendation_code: Optional[str] = None
    recommendation_status: Optional[str] = "PENDING_REVIEW"
    is_official_update: Optional[bool] = False


# -------------------------------------------------------------------
# Train Delay Prediction Machine Learning Schemas
# -------------------------------------------------------------------
class DelayFactorDetail(BaseModel):
    feature: str
    importance_pct: float
    feature_value: Optional[Any] = None
    category: Optional[str] = "Environmental"

class TrainDelayPredictionRequest(BaseModel):
    # Environmental & Weather (3)
    rainfall_mm: Optional[float] = None
    humidity_percent: Optional[float] = None
    ambient_temperature_c: Optional[float] = None

    # Train Operational (4)
    average_speed_kmph: Optional[float] = None
    distance_travelled_km: Optional[float] = None
    train_age_years: Optional[float] = None
    last_maintenance_days: Optional[float] = None

    # Environmental & Operational Context (3)
    season: Optional[str] = None
    region: Optional[str] = None
    train_type: Optional[str] = None

    # Optional Operational / Timetable Identifiers
    train_no: Optional[str] = None
    train_id: Optional[int] = None
    scheduled_arrival: Optional[Union[datetime, str]] = None

class TrainDelayPredictionResponse(BaseModel):
    predicted_delay_minutes: float
    scheduled_arrival: Optional[str] = None
    predicted_eta: Optional[str] = None
    delay_severity_tier: Optional[str] = None
    is_delayed: Optional[bool] = False
    top_contributing_factors: List[DelayFactorDetail] = []
    model_version: Optional[str] = None
    model_type: str = "HistGradientBoostingRegressor"
    recommended_action: Optional[str] = None
    eta_calculation_formula: Optional[str] = None
    eta_design_note: Optional[str] = None
    status: str = "success"


# -------------------------------------------------------------------
# AI Recommendation Governance & Approval Schemas
# -------------------------------------------------------------------
class AIRecommendationActionRequest(BaseModel):
    approval_comment: Optional[str] = None
    rejection_reason: Optional[str] = None

class AIRecommendationItemResponse(BaseModel):
    id: int
    recommendation_code: Optional[str] = None
    recommendation_type: str = "PREDICTIVE_MAINTENANCE"
    source_module: Optional[str] = "ai_predictive_maintenance"
    entity_type: str = "ASSET"
    entity_id: Optional[str] = None
    asset_id: Optional[int] = None
    asset_code: Optional[str] = None
    task_id: Optional[int] = None
    department_code: str = "ENG"
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    prediction: Optional[str] = None
    probability: Optional[float] = None
    maintenance_probability: Optional[float] = None
    maintenance_required: Optional[bool] = None
    risk_level: Optional[str] = "Medium"
    top_risk_factors: Optional[Any] = None
    recommended_action: Optional[str] = None
    model_type: Optional[str] = None
    model_version: Optional[str] = None
    predicted_delay_minutes: Optional[float] = None
    predicted_eta: Optional[str] = None
    scheduled_arrival: Optional[str] = None
    status: str = "PENDING_REVIEW"
    created_at: Optional[str] = None
    reviewed_at: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewer_name: Optional[str] = None
    approval_comment: Optional[str] = None
    rejection_reason: Optional[str] = None

class AIRecommendationsListResponse(BaseModel):
    total_count: int
    pending_count: int = 0
    approved_count: int = 0
    rejected_count: int = 0
    critical_count: int = 0
    recommendations: List[AIRecommendationItemResponse] = []
    data_mode: str = "OFFICIAL RAILWAY AI GOVERNANCE"


# -------------------------------------------------------------------
# Unified 90-Attribute ML Query Schemas
# -------------------------------------------------------------------
class MLUnifiedQueryRequest(BaseModel):
    query: Optional[str] = None
    train_id: Optional[int] = None
    train_no: Optional[str] = None
    track_id: Optional[int] = None
    section_code: Optional[str] = None
    asset_id: Optional[int] = None
    asset_code: Optional[str] = None
    task_id: Optional[int] = None
    task_code: Optional[str] = None
    block_id: Optional[int] = None
    block_code: Optional[str] = None
    telemetry_override: Optional[Dict[str, Any]] = None

class TrainDataDomain(BaseModel):
    train_id: Optional[int] = None
    train_no_name: str
    train_type: str
    origin: str
    destination: str
    current_location: str
    current_station: str
    next_station: str
    scheduled_arrival_departure: str
    actual_arrival_departure: str
    current_delay_minutes: int
    current_speed_kmph: float
    historical_delay_avg_minutes: float

class TrackDataDomain(BaseModel):
    track_id: str
    railway_zone_region: str
    section: str
    track_condition: str
    rail_wear_mm: float
    track_vibration_level: float
    track_defect_history_count: int
    last_inspection_date: str
    inspection_score: float
    track_availability_pct: float
    current_block_status: str

class AssetMaintenanceDataDomain(BaseModel):
    asset_id: str
    asset_type: str
    asset_location: str
    installation_date: str
    last_maintenance_date: str
    days_since_maintenance: int
    maintenance_history: List[Dict[str, Any]] = []
    previous_failures_count: int
    failure_frequency_per_year: float
    asset_health_score: float
    current_defects_count: int

class SensorTelemetryDataDomain(BaseModel):
    rail_wear_mm: float
    wheel_wear_percent: float
    brake_pad_wear_percent: float
    brake_pressure_psi: float
    axle_temperature_c: float
    bearing_temperature_c: float
    battery_voltage: float
    sensor_health_index: float
    inspection_score: float
    distance_travelled_km: float
    average_speed_kmph: float
    delay_minutes: float
    ambient_temperature_c: float
    humidity_percent: float
    rainfall_mm: float

class MLDataDomain(BaseModel):
    training_features: List[str]
    correct_feature_names: List[str]
    correct_feature_units: Dict[str, str]
    same_preprocessing_as_training: str
    historical_actual_target_values: Dict[str, Any]
    model_predictions: Dict[str, Any]
    prediction_probability_confidence: Dict[str, Any]
    model_version: str
    data_timestamp: str
    data_source: str

class MaintenancePlanningDomain(BaseModel):
    task_id: str
    task_type: str
    priority_level: str
    estimated_duration_minutes: int
    required_department: str
    required_staff_count: int
    required_equipment: str
    maintenance_window: str
    safety_restrictions: List[str]

class BlockPlanningDomain(BaseModel):
    block_id: str
    track_section: str
    block_start_time: str
    block_end_time: str
    block_status: str
    train_movement_during_block: str
    conflicting_train_schedules: List[str]
    track_availability_status: str
    proposed_maintenance_window: str

class AIGovernanceDomain(BaseModel):
    recommendation_id: str
    ai_recommendation: str
    ai_confidence_pct: float
    reason_explanation: List[str]
    affected_asset_section: str
    affected_department: str
    recommendation_status: str
    reviewer_authorized_officer: str
    approval_rejection_status: str
    approval_timestamp: Optional[str] = None
    rejection_reason: Optional[str] = None
    audit_log_id: str

class Top25PriorityFeatures(BaseModel):
    asset_id: str
    train_id: str
    rail_wear_mm: float
    wheel_wear_percent: float
    brake_pad_wear_percent: float
    brake_pressure_psi: float
    axle_temperature_c: float
    bearing_temperature_c: float
    battery_voltage: float
    sensor_health_index: float
    inspection_score: float
    train_age_years: float
    distance_travelled_km: float
    average_speed_kmph: float
    delay_minutes: float
    last_maintenance_days: int
    ambient_temperature_c: float
    humidity_percent: float
    rainfall_mm: float
    region: str
    season: str
    train_type: str
    historical_maintenance_failure_result: str
    timestamp: str
    data_source: str

class MLUnifiedQueryResponse(BaseModel):
    query_resolved: str
    data_mode: str = "OFFICIAL RAILWAY ML PIPELINE"
    timestamp: str
    
    # Priority Top 25 Minimum Required ML Features
    top_25_priority_features: Top25PriorityFeatures

    # 8 Structured 90-Attribute Domains
    train_data: TrainDataDomain
    track_data: TrackDataDomain
    asset_maintenance_data: AssetMaintenanceDataDomain
    sensor_telemetry_data: SensorTelemetryDataDomain
    ml_data: MLDataDomain
    maintenance_planning: MaintenancePlanningDomain
    block_planning: BlockPlanningDomain
    ai_governance: AIGovernanceDomain

    # Full Inference Summary
    inference_summary: Dict[str, Any]





