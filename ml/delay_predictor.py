from typing import Dict, Any, List

class TrainDelayPredictor:
    """
    ML and Queuing-based Train Delay Impact Predictor.
    Estimates the downstream cascading delays caused by a maintenance possession block.
    """

    # Time-of-day traffic congestion multipliers (24-hour cycle)
    TIME_SLOT_CONGESTION = {
        (1, 5): 0.35,   # Night window 01:00 - 05:00: lowest passenger congestion
        (5, 9): 1.40,   # Morning peak: high passenger density
        (9, 12): 1.10,  # Midday regular
        (12, 16): 0.85, # Afternoon lull: favorable for maintenance
        (16, 21): 1.50, # Evening peak: highest passenger density
        (21, 24): 0.90, # Late evening
        (0, 1): 0.50    # Midnight transition
    }

    @classmethod
    def _get_time_congestion_multiplier(cls, hour: int) -> float:
        for (start_h, end_h), mult in cls.TIME_SLOT_CONGESTION.items():
            if start_h <= hour < end_h:
                return mult
        return 1.0

    @classmethod
    def estimate_delay_impact(cls, block_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates projected passenger and freight delay minutes.
        """
        duration_minutes = block_params.get("duration_minutes", 180)
        start_hour = block_params.get("start_hour", 2) # Default 02:00 AM
        line_capacity_pct = block_params.get("line_capacity_pct", 80.0) # Line occupancy %
        passenger_trains_count = block_params.get("passenger_trains_scheduled", 2)
        freight_trains_count = block_params.get("freight_trains_scheduled", 3)
        has_loop_line = block_params.get("has_loop_line_for_precedence", True)

        congestion_mult = cls._get_time_congestion_multiplier(start_hour)
        capacity_factor = line_capacity_pct / 60.0

        # Passenger delay calculation:
        # High priority trains are regulated with utmost care; loop line minimizes delay
        loop_mitigation = 0.55 if has_loop_line else 1.0
        passenger_delay_per_train = (duration_minutes * 0.12) * congestion_mult * capacity_factor * loop_mitigation
        total_passenger_delay = int(passenger_delay_per_train * passenger_trains_count)

        # Freight delay calculation:
        # Freight trains are held in sidings/loops during blocks
        freight_delay_per_train = (duration_minutes * 0.45) * congestion_mult * capacity_factor
        total_freight_delay = int(freight_delay_per_train * freight_trains_count)

        total_delay = total_passenger_delay + total_freight_delay

        # Calculate punctuality impact score (0 to 100, 100 being zero disruption)
        punctuality_score = max(0.0, 100.0 - (total_passenger_delay * 0.8 + total_freight_delay * 0.2))
        punctuality_score = round(punctuality_score, 1)

        return {
            "total_projected_delay_minutes": total_delay,
            "passenger_delay_minutes": total_passenger_delay,
            "freight_delay_minutes": total_freight_delay,
            "affected_passenger_trains": passenger_trains_count,
            "affected_freight_trains": freight_trains_count,
            "corridor_punctuality_score": punctuality_score,
            "congestion_level": "Low" if congestion_mult <= 0.6 else ("High" if congestion_mult >= 1.3 else "Moderate")
        }

delay_predictor = TrainDelayPredictor()

