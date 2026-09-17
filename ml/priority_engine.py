from typing import Dict, Any, List
from datetime import datetime

class AIPriorityEngine:
    """
    AI Multi-Criteria Priority Engine for Indian Railways Maintenance.
    Calculates composite defect criticality scores (0 - 100) based on:
    - Defect severity (Critical = 40 pts base, Major = 25 pts, Minor = 10 pts)
    - Speed restriction penalty (proportional to drop from max permissible speed)
    - Section traffic density (GMT - Gross Million Tonnes)
    - Asset degradation / health deficit (100 - health_score)
    - Aging penalty (escalates priority as open defects remain unresolved)
    """

    SEVERITY_WEIGHTS = {
        "Critical": 40.0,
        "Major": 25.0,
        "Minor": 10.0
    }

    DEPARTMENT_HAZARD_FACTORS = {
        "ENG": 1.15,  # Track fracture is direct derailment risk
        "SNT": 1.10,  # Signal/Point failure causes wrong routing or collision risk
        "TRD": 1.05   # OHE failure causes dead engine / line block
    }

    @classmethod
    def calculate_priority(cls, defect_data: Dict[str, Any]) -> Dict[str, Any]:
        severity = defect_data.get("severity", "Major")
        speed_rest = defect_data.get("speed_restriction_imposed", 0)
        max_speed = defect_data.get("max_permissible_speed", 130)
        gmt = defect_data.get("traffic_density_gmt", 45.0)
        asset_health = defect_data.get("asset_health", 80.0)
        hours_open = defect_data.get("hours_open", 12.0)
        dept_code = defect_data.get("department_code", "ENG")

        # 1. Base severity component (max 40 pts)
        base_sev = cls.SEVERITY_WEIGHTS.get(severity, 20.0)

        # 2. Speed restriction penalty (max 25 pts)
        # If speed is restricted to 30 on a 130 km/h line, delta is 100 km/h -> large penalty
        speed_penalty = 0.0
        if speed_rest > 0 and max_speed > speed_rest:
            speed_drop_ratio = (max_speed - speed_rest) / max_speed
            speed_penalty = min(25.0, speed_drop_ratio * 25.0)

        # 3. Traffic density component (max 15 pts)
        # 60+ GMT is very high density trunk line on Indian Railways
        gmt_factor = min(15.0, (gmt / 60.0) * 15.0)

        # 4. Asset health deficit component (max 12 pts)
        health_deficit = max(0.0, (100.0 - asset_health) * 0.12)

        # 5. Aging escalation component (max 8 pts)
        # Escalates progressively for open defects
        aging_factor = min(8.0, (hours_open / 48.0) * 8.0)

        raw_score = base_sev + speed_penalty + gmt_factor + health_deficit + aging_factor
        
        # Apply department-specific safety hazard multiplier
        hazard_multiplier = cls.DEPARTMENT_HAZARD_FACTORS.get(dept_code, 1.0)
        final_score = min(100.0, raw_score * hazard_multiplier)
        final_score = round(final_score, 1)

        # Determine priority category
        if final_score >= 85.0:
            prio_tier = "P0 - Emergency"
            action_window = "Immediate (< 12 hours)"
        elif final_score >= 65.0:
            prio_tier = "P1 - Urgent"
            action_window = "Within 24-48 hours"
        else:
            prio_tier = "P2 - Routine"
            action_window = "Scheduled Weekly Block"

        return {
            "priority_score": final_score,
            "priority_tier": prio_tier,
            "action_window": action_window,
            "breakdown": {
                "base_severity_pts": round(base_sev, 1),
                "speed_penalty_pts": round(speed_penalty, 1),
                "traffic_density_pts": round(gmt_factor, 1),
                "health_deficit_pts": round(health_deficit, 1),
                "aging_factor_pts": round(aging_factor, 1),
                "hazard_multiplier": hazard_multiplier
            }
        }

    @classmethod
    def prioritize_backlog(cls, defects: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Sorts a collection of defects in descending order of AI priority score."""
        scored_defects = []
        for d in defects:
            calc = cls.calculate_priority(d)
            d_copy = dict(d)
            d_copy.update(calc)
            scored_defects.append(d_copy)
        
        scored_defects.sort(key=lambda x: x["priority_score"], reverse=True)
        return scored_defects

    @classmethod
    def calculate_defect_priority(
        cls,
        severity: str = "Major",
        defect_type: str = "",
        asset_health: float = 80.0,
        track_density_gmt: float = 55.0,
        speed_restriction: float = 0.0,
        department_code: str = "ENG"
    ) -> float:
        """Convenience method returning raw priority score (0-100) for DB ingestion."""
        res = cls.calculate_priority({
            "severity": severity,
            "defect_type": defect_type,
            "asset_health": asset_health,
            "traffic_density_gmt": track_density_gmt,
            "speed_restriction_imposed": speed_restriction,
            "department_code": department_code
        })
        return res["priority_score"]

    @classmethod
    def score_maintenance_task(cls, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Delegate to AIMaintenancePriorityEngine for full 6-factor explainable maintenance task scoring."""
        return AIMaintenancePriorityEngine.score_task(task_data)

    @classmethod
    def rank_maintenance_tasks(cls, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Delegate to AIMaintenancePriorityEngine for ranked maintenance tasks."""
        return AIMaintenancePriorityEngine.rank_tasks(tasks)


class AIMaintenancePriorityEngine:
    """
    AI Maintenance Priority Engine for Indian Railways.
    
    Transparent, explainable 6-factor scoring system (0 - 100 scale):
    1. Asset criticality (max 18 pts)
    2. Urgency (max 20 pts)
    3. Safety impact (max 25 pts)
    4. Asset availability impact (max 12 pts)
    5. Overdue status (max 10 pts)
    6. Operational impact (max 15 pts)
    
    Classification Tiers:
    - 80 - 100: Critical
    - 60 - 79:  High
    - 40 - 59:  Medium
    - 0  - 39:  Low
    """

    CRITICAL_ASSET_TYPES = {
        "turnout", "point_machine", "point machine", "points",
        "substation", "tss", "25kv", "transformer",
        "bridge", "sej", "expansion joint",
        "track_circuit", "track circuit", "aftc", "axle_counter", "msdac", "interlocking"
    }

    MEDIUM_ASSET_TYPES = {
        "rail", "track", "sleeper", "ohe_mast", "mast", "catenary", "signal_post", "signal"
    }

    @classmethod
    def score_task(cls, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates explainable 0-100 score for a maintenance task based on 6 criteria.
        Returns composite score, classification level, human-readable reasons, and factor breakdown.
        """
        # --- 1. Asset Criticality (Max 18 pts) ---
        asset_type = str(task.get("asset_type") or "").lower()
        asset_status = str(task.get("asset_status") or "").lower()
        asset_health = float(task.get("asset_health") or task.get("health_score") or 80.0)
        direct_crit = str(task.get("criticality") or "").lower()

        # Type points (max 8)
        if any(cat in asset_type for cat in cls.CRITICAL_ASSET_TYPES) or "point" in asset_type or "substation" in asset_type:
            type_pts = 8.0
        elif any(cat in asset_type for cat in cls.MEDIUM_ASSET_TYPES) or "rail" in asset_type:
            type_pts = 5.0
        elif direct_crit == "critical":
            type_pts = 8.0
        elif direct_crit == "high":
            type_pts = 6.0
        else:
            type_pts = 3.0

        # Health / Status points (max 10)
        if asset_status == "critical" or asset_health <= 40.0:
            health_pts = 10.0
        elif asset_status == "degraded" or asset_health <= 70.0:
            health_pts = 6.0
        elif asset_health <= 85.0:
            health_pts = 3.0
        elif direct_crit == "critical":
            health_pts = 10.0
        elif direct_crit == "high":
            health_pts = 7.0
        elif direct_crit == "medium":
            health_pts = 5.0
        else:
            health_pts = 1.0

        asset_crit_score = min(18.0, round(type_pts + health_pts, 1))

        # --- 2. Urgency (Max 20 pts) ---
        urgency_str = str(task.get("urgency") or "").lower()
        if "immediate" in urgency_str:
            urgency_score = 20.0
            urgency_label = "Immediate"
        elif "24" in urgency_str or "day" in urgency_str and "1" in urgency_str:
            urgency_score = 15.0
            urgency_label = "Within 24 Hours"
        elif "3" in urgency_str:
            urgency_score = 10.0
            urgency_label = "Within 3 Days"
        elif "routine" in urgency_str:
            urgency_score = 4.0
            urgency_label = "Routine"
        else:
            urgency_score = 8.0
            urgency_label = "Standard"

        # --- 3. Safety Impact (Max 25 pts) ---
        safety_str = str(task.get("safety_impact") or "").lower()
        speed_rest = float(task.get("speed_restriction_imposed") or 0.0)
        defect_sev = str(task.get("defect_severity") or task.get("severity") or "").lower()

        if "derailment" in safety_str or "fracture" in safety_str:
            safety_score = 25.0
            safety_desc = "Derailment risk on track infrastructure"
        elif "signal" in safety_str or "interlocking" in safety_str:
            safety_score = 21.0
            safety_desc = "Signal/Interlocking failure hazard"
        elif "ohe" in safety_str or "tripping" in safety_str or "traction" in safety_str:
            safety_score = 18.0
            safety_desc = "OHE tripping and power breakdown hazard"
        elif "speed" in safety_str or speed_rest > 0:
            extra = 4.0 if (0 < speed_rest <= 45) else 2.0
            safety_score = min(25.0, 16.0 + extra)
            safety_desc = f"Active speed restriction imposed ({int(speed_rest)} km/h)"
        elif defect_sev == "critical":
            safety_score = 22.0
            safety_desc = "Linked critical defect with safety ramifications"
        elif defect_sev == "major":
            safety_score = 15.0
            safety_desc = "Major defect hazard"
        elif "low" in safety_str:
            safety_score = 5.0
            safety_desc = "Low direct safety hazard"
        else:
            safety_score = 8.0
            safety_desc = "Standard preventive safety baseline"

        # --- 4. Asset Availability Impact (Max 12 pts) ---
        avail_input = task.get("asset_availability_impact")
        if isinstance(avail_input, (int, float)):
            availability_score = min(12.0, max(0.0, float(avail_input)))
            possession_pts = round(availability_score * 0.5, 1)
            dur_pts = round(availability_score * 0.5, 1)
            duration_mins = 180
        elif isinstance(avail_input, str) and avail_input.strip():
            avail_str = avail_input.strip().lower()
            if "critical" in avail_str:
                availability_score = 12.0
            elif "high" in avail_str:
                availability_score = 10.0
            elif "medium" in avail_str or "moderate" in avail_str:
                availability_score = 6.0
            elif "low" in avail_str:
                availability_score = 3.0
            else:
                availability_score = 5.0
            possession_pts = round(availability_score * 0.5, 1)
            dur_pts = round(availability_score * 0.5, 1)
            duration_mins = 180
        else:
            duration_mins = int(task.get("estimated_duration_minutes") or task.get("duration_minutes") or 120)
            req_traffic = bool(task.get("required_traffic_block") or task.get("traffic_block", True))
            req_power = bool(task.get("required_power_block") or task.get("power_block", False))

            if req_traffic and req_power:
                possession_pts = 6.0
            elif req_traffic:
                possession_pts = 4.0
            else:
                possession_pts = 2.0

            if duration_mins >= 240:
                dur_pts = 6.0
            elif duration_mins >= 180:
                dur_pts = 4.5
            elif duration_mins >= 120:
                dur_pts = 3.0
            else:
                dur_pts = 1.5

            availability_score = min(12.0, round(possession_pts + dur_pts, 1))

        # --- 5. Overdue Status (Max 10 pts) ---
        overdue_input = task.get("overdue_status")
        is_overdue_flag = bool(task.get("is_overdue", False))
        overdue_score = 0.0
        days_overdue = 0.0

        if isinstance(overdue_input, (int, float)):
            overdue_score = min(10.0, max(0.0, float(overdue_input)))
            days_overdue = round(overdue_score * 0.7, 1)
            is_overdue_flag = overdue_score >= 4.0
        elif isinstance(overdue_input, str) and overdue_input.strip():
            overdue_str = overdue_input.strip().lower()
            if "critical" in overdue_str or "> 7" in overdue_str:
                overdue_score = 10.0
                days_overdue = 7.0
                is_overdue_flag = True
            elif "overdue" in overdue_str or "yes" in overdue_str or "true" in overdue_str:
                overdue_score = 8.0
                days_overdue = 2.0
                is_overdue_flag = True
            elif "due soon" in overdue_str or "24" in overdue_str:
                overdue_score = 4.0
                days_overdue = 0.0
            else:
                overdue_score = 0.0
                days_overdue = 0.0
        elif isinstance(overdue_input, bool):
            overdue_score = 8.0 if overdue_input else 0.0
            days_overdue = 2.0 if overdue_input else 0.0
            is_overdue_flag = overdue_input
        else:
            due_date = task.get("due_date")

            if isinstance(due_date, str):
                try:
                    due_dt = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
                    if due_dt.tzinfo is not None:
                        due_dt = due_dt.replace(tzinfo=None)
                except Exception:
                    due_dt = None
            elif isinstance(due_date, datetime):
                due_dt = due_date.replace(tzinfo=None) if due_date.tzinfo else due_date
            else:
                due_dt = None

            now = datetime.utcnow()
            if due_dt:
                delta_seconds = (now - due_dt).total_seconds()
                if delta_seconds > 0:
                    days_overdue = round(delta_seconds / 86400.0, 1)
                    if days_overdue >= 7.0:
                        overdue_score = 10.0
                    elif days_overdue >= 3.0:
                        overdue_score = 8.0
                    elif days_overdue >= 1.0:
                        overdue_score = 6.0
                    else:
                        overdue_score = 4.0
                elif delta_seconds > -86400:
                    overdue_score = 2.0  # Due within 24 hours
            elif is_overdue_flag:
                overdue_score = 8.0
                days_overdue = 2.0

        # --- 6. Operational Impact (Max 15 pts) ---
        op_input = task.get("operational_impact")
        gmt_pts = 0.0
        cap_pts = 0.0
        if isinstance(op_input, (int, float)):
            operational_score = min(15.0, max(0.0, float(op_input)))
            gmt = 50.0
            line_cap = 60
            op_detail = f"Direct operational impact score ({operational_score} pts)"
        elif isinstance(op_input, str) and op_input.strip():
            op_str = op_input.strip().lower()
            if "critical" in op_str or "extreme" in op_str:
                operational_score = 15.0
            elif "high" in op_str:
                operational_score = 13.0
            elif "medium" in op_str or "moderate" in op_str:
                operational_score = 8.0
            elif "low" in op_str:
                operational_score = 3.0
            else:
                operational_score = 7.0
            gmt = 55.0
            line_cap = 60
            op_detail = f"Operational impact classified as '{op_input}' ({operational_score} pts)"
        else:
            gmt = float(task.get("traffic_density_gmt") or task.get("current_traffic_density") or 50.0)
            line_cap = int(task.get("line_capacity") or 60)
            loc = str(task.get("location") or task.get("section_code") or "").upper()

            if gmt >= 50.0 or any(trunk in loc for trunk in ["NDLS", "BPL", "NGP", "HWH", "CSMT", "GWL"]):
                gmt_pts = 9.0
            elif gmt >= 35.0:
                gmt_pts = 6.0
            else:
                gmt_pts = 3.0

            if line_cap >= 60:
                cap_pts = 6.0
            elif line_cap >= 40:
                cap_pts = 4.0
            else:
                cap_pts = 2.0

            operational_score = min(15.0, round(gmt_pts + cap_pts, 1))
            op_detail = f"Traffic density ({gmt} GMT, {gmt_pts} pts) + line capacity ({line_cap} trains/day, {cap_pts} pts)"

        # --- Total Score & Level Classification ---
        total_raw = asset_crit_score + urgency_score + safety_score + availability_score + overdue_score + operational_score
        total_score = min(100.0, max(0.0, round(total_raw, 1)))

        # Classification
        if total_score >= 80.0:
            priority_level = "Critical"
        elif total_score >= 60.0:
            priority_level = "High"
        elif total_score >= 40.0:
            priority_level = "Medium"
        else:
            priority_level = "Low"

        # --- Explainable Natural Language Reasons ---
        reasons = []

        # 1. Safety reason
        if safety_score >= 16.0 or any(kw in safety_str for kw in ["critical", "high", "derailment", "fracture"]):
            if "derailment" in safety_str or "fracture" in safety_str:
                reasons.append("Safety-related defect")
            elif speed_rest > 0:
                reasons.append("Safety-related defect: Speed restriction imposed")
            else:
                reasons.append("Safety-related defect")

        # 2. Asset criticality reason
        if asset_crit_score >= 12.0 or direct_crit in ["critical", "high"]:
            reasons.append("High asset criticality")

        # 3. Overdue reason
        if overdue_score >= 4.0 or is_overdue_flag or (isinstance(overdue_input, str) and "overdue" in str(overdue_input).lower()):
            reasons.append("Maintenance overdue")
        elif overdue_score >= 2.0:
            reasons.append("Maintenance due within 24 hours")

        # 4. Operational impact reason
        if operational_score >= 11.0 or (isinstance(op_input, str) and str(op_input).lower() in ["critical", "high"]):
            reasons.append("High operational impact")

        # 5. Urgency reason
        if urgency_score >= 15.0 and len(reasons) < 4:
            reasons.append(f"Immediate urgency: Requires intervention {urgency_label}")

        # 6. Availability impact reason
        if availability_score >= 8.0 and len(reasons) < 4:
            reasons.append(f"Asset availability impact: Requires {duration_mins}m window")

        # Fallback if no specific high thresholds were met (e.g. low/medium routine task)
        if not reasons:
            reasons.append("Routine preventive maintenance cycle")
            reasons.append("Stable asset condition under normal operating tolerance")

        # Build clean explainable task summary
        task_info = {
            "id": task.get("id"),
            "task_code": task.get("task_code") or f"TSK-{task.get('id', 'SIM')}",
            "title": task.get("title") or task.get("task_type") or "Maintenance Task",
            "department": task.get("department_code") or task.get("department") or "ENG",
            "location": task.get("location") or "Mainline Section",
            "status": task.get("status") or "Pending"
        }

        factor_breakdown = {
            "asset_criticality": {
                "score": asset_crit_score,
                "max_score": 18.0,
                "weight_pct": 18,
                "detail": f"Asset type weight ({type_pts} pts) + health deficit ({health_pts} pts)"
            },
            "urgency": {
                "score": urgency_score,
                "max_score": 20.0,
                "weight_pct": 20,
                "detail": f"Urgency marked as '{urgency_label}'"
            },
            "safety_impact": {
                "score": safety_score,
                "max_score": 25.0,
                "weight_pct": 25,
                "detail": safety_desc
            },
            "asset_availability_impact": {
                "score": availability_score,
                "max_score": 12.0,
                "weight_pct": 12,
                "detail": f"Possession severity ({possession_pts} pts) + duration {duration_mins}m ({dur_pts} pts)"
            },
            "overdue_status": {
                "score": overdue_score,
                "max_score": 10.0,
                "weight_pct": 10,
                "detail": f"Overdue by {days_overdue} days" if days_overdue > 0 else ("Due within 24 hours" if overdue_score > 0 else "Within SLA window")
            },
            "operational_impact": {
                "score": operational_score,
                "max_score": 15.0,
                "weight_pct": 15,
                "detail": op_detail
            }
        }

        # Integer score rounding for clean display
        display_score = int(round(total_score))

        return {
            "task": task_info,
            "priority_score": display_score,
            "priority_level": priority_level,
            "score": display_score,
            "level": priority_level,
            "raw_score": total_score,
            "reasons": reasons,
            "factor_breakdown": factor_breakdown
        }

    @classmethod
    def rank_tasks(cls, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Scores and ranks a list of maintenance tasks descending by priority score."""
        scored = [cls.score_task(t) for t in tasks]
        scored.sort(key=lambda x: (x["priority_score"], x["raw_score"]), reverse=True)
        return scored


priority_engine = AIPriorityEngine()
maintenance_priority_engine = AIMaintenancePriorityEngine()



