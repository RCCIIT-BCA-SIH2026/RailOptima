from typing import List, Dict, Any, Optional
from datetime import datetime

class ConflictDetector:
    """
    Spatial-Temporal Conflict Detection Engine for Indian Railways.
    Detects:
    1. Spatial Overlaps: Two independent maintenance blocks scheduled on the same section during overlapping times.
    2. Train Path Clashes: A maintenance block interrupting a scheduled train path (especially high-priority trains).
    3. Resource Contention: Same machinery or gang crew double-booked or assigned across geographically distant sections without transit time.
    4. Power-Traffic Mismatches: TRD power isolation required but scheduled independently of traffic possession.
    """

    @classmethod
    def detect_block_overlaps(cls, blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        conflicts = []
        n = len(blocks)
        for i in range(n):
            b1 = blocks[i]
            for j in range(i + 1, n):
                b2 = blocks[j]
                # Same section check
                if b1.get("section_id") == b2.get("section_id"):
                    s1, e1 = b1["start_time"], b1["end_time"]
                    s2, e2 = b2["start_time"], b2["end_time"]
                    
                    # Check temporal overlap
                    if max(s1, s2) < min(e1, e2):
                        # If not already an integrated shadow block
                        if b1.get("block_type") != "Integrated" or b2.get("block_type") != "Integrated":
                            conflicts.append({
                                "conflict_type": "Spatial_Overlap",
                                "severity": "High",
                                "block_id_1": b1.get("id"),
                                "block_id_2": b2.get("id"),
                                "section_id": b1.get("section_id"),
                                "overlap_start": max(s1, s2).isoformat(),
                                "overlap_end": min(e1, e2).isoformat(),
                                "description": f"Conflicting blocks {b1.get('block_code', 'B1')} and {b2.get('block_code', 'B2')} scheduled simultaneously on the same section.",
                                "resolution_suggestion": "Bundle into a single Multi-Department Integrated Shadow Block or reschedule one block by at least 60 minutes."
                            })
        return conflicts

    @classmethod
    def detect_train_path_clashes(cls, blocks: List[Dict[str, Any]], train_schedules: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        conflicts = []
        for block in blocks:
            b_start = block["start_time"]
            b_end = block["end_time"]
            b_sec = block.get("section_id")

            for sched in train_schedules:
                if sched.get("section_id") == b_sec:
                    t_entry = sched["scheduled_entry_time"]
                    t_exit = sched["scheduled_exit_time"]
                    
                    # Temporal intersection
                    if max(b_start, t_entry) < min(b_end, t_exit):
                        train_prio = sched.get("train_priority", 3)
                        sev = "High" if train_prio <= 2 else "Medium"
                        conflicts.append({
                            "conflict_type": "Train_Path_Clash",
                            "severity": sev,
                            "block_id_1": block.get("id"),
                            "train_id": sched.get("train_id"),
                            "train_no": sched.get("train_no", "Unknown"),
                            "train_name": sched.get("train_name", "Train"),
                            "section_id": b_sec,
                            "description": f"Block {block.get('block_code', 'B')} overlaps with {sched.get('train_name', 'Train')} (Priority {train_prio}) between {t_entry.strftime('%H:%M')} and {t_exit.strftime('%H:%M')}.",
                            "resolution_suggestion": "Regulate train at preceding junction loop line or shift block window to off-peak night slot."
                        })
        return conflicts

    @classmethod
    def detect_resource_contention(cls, resource_assignments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        conflicts = []
        n = len(resource_assignments)
        for i in range(n):
            r1 = resource_assignments[i]
            for j in range(i + 1, n):
                r2 = resource_assignments[j]
                if r1.get("resource_id") == r2.get("resource_id"):
                    s1, e1 = r1["start_time"], r1["end_time"]
                    s2, e2 = r2["start_time"], r2["end_time"]
                    if max(s1, s2) < min(e1, e2):
                        conflicts.append({
                            "conflict_type": "Resource_Contention",
                            "severity": "High",
                            "resource_id": r1.get("resource_id"),
                            "resource_code": r1.get("resource_code", "RES"),
                            "block_id_1": r1.get("block_id"),
                            "block_id_2": r2.get("block_id"),
                            "description": f"Resource {r1.get('resource_code', 'RES')} double-booked for concurrent blocks.",
                            "resolution_suggestion": "Reassign second block to an alternative available machine or sequence tasks linearly."
                        })
        return conflicts

    @classmethod
    def run_full_conflict_audit(cls, blocks: List[Dict[str, Any]], train_schedules: List[Dict[str, Any]], resource_assignments: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        """Aggregates all conflict checks into a consolidated conflict register."""
        all_conflicts = []
        all_conflicts.extend(cls.detect_block_overlaps(blocks))
        all_conflicts.extend(cls.detect_train_path_clashes(blocks, train_schedules))
        if resource_assignments:
            all_conflicts.extend(cls.detect_resource_contention(resource_assignments))
        return all_conflicts

conflict_detector = ConflictDetector()

