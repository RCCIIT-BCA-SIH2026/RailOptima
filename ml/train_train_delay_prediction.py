import os
import sys
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Tuple

import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import (
    mean_absolute_error,
    root_mean_squared_error,
    r2_score
)
from sklearn.inspection import permutation_importance

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("train_train_delay_prediction")

# -------------------------------------------------------------------
# Feature Definitions
# -------------------------------------------------------------------
NUMERICAL_FEATURES = [
    # Environmental & Weather (3)
    "rainfall_mm",
    "humidity_percent",
    "ambient_temperature_c",
    # Train Operational (4)
    "average_speed_kmph",
    "distance_travelled_km",
    "train_age_years",
    "last_maintenance_days"
]

CATEGORICAL_FEATURES = [
    # Environmental & Operational Context (3)
    "season",
    "region",
    "train_type"
]

ALL_FEATURES = NUMERICAL_FEATURES + CATEGORICAL_FEATURES
TARGET_COLUMN = "delay_minutes"

EXCLUDED_COLUMNS = [
    "train_id",
    "risk_score",
    "failure_type",
    "failure_severity",
    "maintenance_required",
    "rail_wear_mm",
    "track_vibration_level",
    "wheel_wear_percent",
    "brake_pad_wear_percent",
    "brake_pressure_psi",
    "axle_temperature_c",
    "bearing_temperature_c",
    "battery_voltage",
    "sensor_health_index",
    "inspection_score"
]


def validate_dataset(df: pd.DataFrame) -> None:
    """Validates that dataset is valid, non-empty, and has all required columns."""
    if df is None or len(df) == 0:
        raise ValueError("Dataset is empty.")

    missing_features = [col for col in ALL_FEATURES if col not in df.columns]
    if missing_features:
        raise KeyError(f"Dataset is missing required feature columns: {missing_features}")

    if TARGET_COLUMN not in df.columns:
        raise KeyError(f"Target column '{TARGET_COLUMN}' not found in dataset.")

    if df[TARGET_COLUMN].isnull().any():
        raise ValueError(f"Target column '{TARGET_COLUMN}' contains null/missing values.")

    logger.info(f"Dataset validation passed: {len(df):,} records, {len(ALL_FEATURES)} features, target '{TARGET_COLUMN}'.")


def build_pipeline(regressor_type: str = "HistGradientBoosting") -> Pipeline:
    """
    Builds a unified sklearn Pipeline containing ColumnTransformer preprocessing and Regressor.
    Handles numerical median imputation and categorical most-frequent imputation + one-hot encoding.
    """
    num_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median"))
    ])

    cat_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", num_pipeline, NUMERICAL_FEATURES),
            ("cat", cat_pipeline, CATEGORICAL_FEATURES)
        ],
        remainder="drop"
    )

    if regressor_type == "RandomForest":
        regressor = RandomForestRegressor(
            n_estimators=100,
            max_depth=12,
            random_state=42,
            n_jobs=-1
        )
    else:
        regressor = HistGradientBoostingRegressor(
            max_iter=150,
            max_depth=8,
            learning_rate=0.08,
            random_state=42
        )

    return Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", regressor)
    ])


def calculate_mape_safe(y_true: np.ndarray, y_pred: np.ndarray, threshold: float = 1.0) -> Tuple[float, int]:
    """
    Calculates Mean Absolute Percentage Error (MAPE) safely on non-zero delay records (y >= threshold).
    Standard MAPE is mathematically undefined when y_true == 0.
    """
    mask = y_true >= threshold
    if not np.any(mask):
        return 0.0, 0
    mape = float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100.0)
    return round(mape, 2), int(np.sum(mask))


def calculate_smape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Calculates Symmetric Mean Absolute Percentage Error (sMAPE) which is bounded [0, 200%]."""
    denominator = (np.abs(y_true) + np.abs(y_pred)) / 2.0
    diff = np.abs(y_pred - y_true)
    # Avoid zero division when both true and pred are 0
    mask = denominator > 1e-6
    if not np.any(mask):
        return 0.0
    smape = float(np.mean(diff[mask] / denominator[mask]) * 100.0)
    return round(smape, 2)


def train_and_evaluate(data_path: str, output_dir: str) -> Dict[str, Any]:
    """
    Loads dataset, splits 80% train / 10% validation / 10% test,
    evaluates candidate models, fits final pipeline, computes comprehensive test metrics,
    and saves production artifacts.
    """
    logger.info(f"Loading dataset from: {data_path}")
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset file not found at: {data_path}")

    df = pd.read_csv(data_path)
    validate_dataset(df)

    X = df[ALL_FEATURES]
    y = df[TARGET_COLUMN].values.astype(float)

    # 80% Train, 10% Validation, 10% Test
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X, y, test_size=0.10, random_state=42
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val, test_size=0.111111, random_state=42
    )

    logger.info(
        f"Split sizes: Train={len(X_train):,} ({len(X_train)/len(df)*100:.0f}%), "
        f"Validation={len(X_val):,} ({len(X_val)/len(df)*100:.0f}%), "
        f"Test={len(X_test):,} ({len(X_test)/len(df)*100:.0f}%)"
    )

    # 1. Baseline Calculations on Validation Set
    mean_baseline_pred = float(np.mean(y_train))
    median_baseline_pred = float(np.median(y_train))
    val_mae_mean_baseline = float(mean_absolute_error(y_val, np.full_like(y_val, mean_baseline_pred)))
    val_mae_median_baseline = float(mean_absolute_error(y_val, np.full_like(y_val, median_baseline_pred)))

    logger.info(f"Validation Baseline - Mean Predictor MAE: {val_mae_mean_baseline:.4f}m, Median Predictor MAE: {val_mae_median_baseline:.4f}m")

    # 2. Model Evaluation on Validation Set
    logger.info("Training HistGradientBoostingRegressor on 80,000 samples...")
    hgb_pipeline = build_pipeline(regressor_type="HistGradientBoosting")
    hgb_pipeline.fit(X_train, y_train)
    val_pred_hgb = np.maximum(0.0, hgb_pipeline.predict(X_val))
    val_mae_hgb = float(mean_absolute_error(y_val, val_pred_hgb))
    val_rmse_hgb = float(root_mean_squared_error(y_val, val_pred_hgb))
    val_r2_hgb = float(r2_score(y_val, val_pred_hgb))
    logger.info(f"HistGradientBoosting Validation: MAE={val_mae_hgb:.4f}m, RMSE={val_rmse_hgb:.4f}m, R2={val_r2_hgb:.4f}")

    logger.info("Evaluating RandomForestRegressor on validation set for comparison...")
    rf_pipeline = build_pipeline(regressor_type="RandomForest")
    rf_pipeline.fit(X_train, y_train)
    val_pred_rf = np.maximum(0.0, rf_pipeline.predict(X_val))
    val_mae_rf = float(mean_absolute_error(y_val, val_pred_rf))
    val_rmse_rf = float(root_mean_squared_error(y_val, val_pred_rf))
    val_r2_rf = float(r2_score(y_val, val_pred_rf))
    logger.info(f"RandomForest Validation: MAE={val_mae_rf:.4f}m, RMSE={val_rmse_rf:.4f}m, R2={val_r2_rf:.4f}")

    # Select Primary Model (HistGradientBoosting is primary recommended: ultra-fast inference, compact footprint, equal/better generalization)
    selected_pipeline = hgb_pipeline
    selected_model_name = "HistGradientBoostingRegressor"
    logger.info(f"Selected primary production model: {selected_model_name}")

    # 3. Final Evaluation on Strictly Held-Out Test Set (10,000 records)
    logger.info("Evaluating final model on strictly held-out Test Set (10,000 records)...")
    test_pred = np.maximum(0.0, selected_pipeline.predict(X_test))
    
    test_mae = float(mean_absolute_error(y_test, test_pred))
    test_rmse = float(root_mean_squared_error(y_test, test_pred))
    test_r2 = float(r2_score(y_test, test_pred))

    # Baselines on test set
    test_mean_baseline_mae = float(mean_absolute_error(y_test, np.full_like(y_test, mean_baseline_pred)))
    test_median_baseline_mae = float(mean_absolute_error(y_test, np.full_like(y_test, median_baseline_pred)))
    baseline_mae = test_median_baseline_mae
    mae_improvement_pct = round(((baseline_mae - test_mae) / baseline_mae) * 100.0, 2)

    # Percentage error metrics
    mape_delayed, delayed_count = calculate_mape_safe(y_test, test_pred, threshold=5.0)
    smape = calculate_smape(y_test, test_pred)

    # Prediction error analysis
    errors = np.abs(test_pred - y_test)
    raw_residuals = test_pred - y_test
    error_percentiles = {
        "p25": round(float(np.percentile(errors, 25)), 3),
        "p50_median": round(float(np.percentile(errors, 50)), 3),
        "p75": round(float(np.percentile(errors, 75)), 3),
        "p90": round(float(np.percentile(errors, 90)), 3),
        "p95": round(float(np.percentile(errors, 95)), 3),
        "p99": round(float(np.percentile(errors, 99)), 3),
        "max_error": round(float(np.max(errors)), 3)
    }

    # Error distribution buckets
    error_distribution = {
        "within_2_mins_pct": round(float(np.mean(errors <= 2.0) * 100.0), 2),
        "within_5_mins_pct": round(float(np.mean(errors <= 5.0) * 100.0), 2),
        "within_10_mins_pct": round(float(np.mean(errors <= 10.0) * 100.0), 2),
        "within_15_mins_pct": round(float(np.mean(errors <= 15.0) * 100.0), 2),
        "exceeding_15_mins_pct": round(float(np.mean(errors > 15.0) * 100.0), 2)
    }

    logger.info(f"Test Set Results: MAE={test_mae:.4f}m, RMSE={test_rmse:.4f}m, R2={test_r2:.4f}")
    logger.info(f"Baseline Comparison: Model MAE={test_mae:.4f}m vs Median Baseline={baseline_mae:.4f}m ({mae_improvement_pct}% error reduction)")
    logger.info(f"Error Percentiles (minutes): p50={error_percentiles['p50_median']}m, p90={error_percentiles['p90']}m, p95={error_percentiles['p95']}m")
    logger.info(f"Predictions within 5 minutes: {error_distribution['within_5_mins_pct']}%")

    # 4. Actual vs Predicted Sample Examples
    sample_indices = [0, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
    actual_vs_predicted_examples = []
    for idx in sample_indices:
        actual_val = float(y_test[idx])
        pred_val = round(float(test_pred[idx]), 2)
        err = round(abs(pred_val - actual_val), 2)
        sample_row = X_test.iloc[idx].to_dict()
        actual_vs_predicted_examples.append({
            "sample_index": idx,
            "actual_delay_minutes": actual_val,
            "predicted_delay_minutes": pred_val,
            "absolute_error_minutes": err,
            "season": sample_row.get("season"),
            "region": sample_row.get("region"),
            "train_type": sample_row.get("train_type"),
            "rainfall_mm": sample_row.get("rainfall_mm"),
            "humidity_percent": sample_row.get("humidity_percent")
        })

    # 5. Permutation Feature Importance on Test Set
    logger.info("Computing permutation feature importance on test set...")
    perm_result = permutation_importance(
        selected_pipeline,
        X_test,
        y_test,
        n_repeats=5,
        random_state=42,
        scoring="r2"
    )

    feature_importances = []
    for idx in perm_result.importances_mean.argsort()[::-1]:
        feat_name = ALL_FEATURES[idx]
        mean_imp = float(perm_result.importances_mean[idx])
        std_imp = float(perm_result.importances_std[idx])
        feature_importances.append({
            "feature": feat_name,
            "importance_score": round(max(0.0, mean_imp), 5),
            "importance_std": round(std_imp, 5),
            "category": "Environmental" if feat_name in ["rainfall_mm", "humidity_percent", "ambient_temperature_c", "season", "region"] else "Operational"
        })

    # Normalize relative importance percentage
    total_score = sum(item["importance_score"] for item in feature_importances)
    for item in feature_importances:
        item["importance_pct"] = round((item["importance_score"] / max(1e-6, total_score)) * 100.0, 2)

    os.makedirs(output_dir, exist_ok=True)

    # 6. Save Complete Pipeline Model (.pkl)
    model_path = os.path.join(output_dir, "train_delay_prediction_model.pkl")
    joblib.dump(selected_pipeline, model_path, compress=3)
    logger.info(f"Saved complete pipeline to: {model_path} ({os.path.getsize(model_path):,} bytes)")

    # 7. Save Metrics JSON
    metrics_path = os.path.join(output_dir, "train_delay_prediction_metrics.json")
    metrics_data = {
        "dataset_name": os.path.basename(data_path),
        "total_records": len(df),
        "target_column": TARGET_COLUMN,
        "feature_names": ALL_FEATURES,
        "numerical_features": NUMERICAL_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "excluded_columns": EXCLUDED_COLUMNS,
        "train_records": len(X_train),
        "validation_records": len(X_val),
        "test_records": len(X_test),
        "primary_model": selected_model_name,
        "models_evaluated": {
            "HistGradientBoostingRegressor": {
                "val_mae_minutes": round(val_mae_hgb, 4),
                "val_rmse_minutes": round(val_rmse_hgb, 4),
                "val_r2": round(val_r2_hgb, 4)
            },
            "RandomForestRegressor": {
                "val_mae_minutes": round(val_mae_rf, 4),
                "val_rmse_minutes": round(val_rmse_rf, 4),
                "val_r2": round(val_r2_rf, 4)
            }
        },
        "test_metrics": {
            "mae_minutes": round(test_mae, 4),
            "rmse_minutes": round(test_rmse, 4),
            "r2_score": round(test_r2, 4),
            "smape_pct": smape,
            "mape_delayed_trains_pct": mape_delayed,
            "mape_note": "Standard MAPE is mathematically undefined due to exact on-time records (delay=0m). Reported MAPE applies to delayed trains (delay >= 5m). sMAPE is symmetric and bounded.",
            "baseline_median_mae_minutes": round(baseline_mae, 4),
            "baseline_mean_mae_minutes": round(test_mean_baseline_mae, 4),
            "improvement_over_baseline_pct": mae_improvement_pct,
            "average_error_minutes": round(test_mae, 2)
        },
        "error_percentiles_minutes": error_percentiles,
        "error_distribution": error_distribution,
        "actual_vs_predicted_examples": actual_vs_predicted_examples,
        "training_timestamp": datetime.utcnow().isoformat() + "Z"
    }

    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics_data, f, indent=2)
    logger.info(f"Saved metrics to: {metrics_path}")

    # 8. Save Feature Importance JSON
    fi_path = os.path.join(output_dir, "train_delay_prediction_feature_importance.json")
    with open(fi_path, "w", encoding="utf-8") as f:
        json.dump(feature_importances, f, indent=2)
    logger.info(f"Saved feature importances to: {fi_path}")

    return {
        "metrics": metrics_data,
        "feature_importances": feature_importances,
        "pipeline": selected_pipeline
    }


if __name__ == "__main__":
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    dataset_file = os.path.join(
        project_root,
        "data",
        "datasets",
        "indian_railway_failure_detection_maintenance_v2.csv"
    )
    output_directory = os.path.join(project_root, "ml")

    result = train_and_evaluate(dataset_file, output_directory)
    print("\n=== TRAINING COMPLETED SUCCESSFULLY ===")
    m = result["metrics"]["test_metrics"]
    print(f"Test MAE:  {m['mae_minutes']} minutes (average error)")
    print(f"Test RMSE: {m['rmse_minutes']} minutes")
    print(f"Test R²:   {m['r2_score']}")
    print(f"Baseline MAE: {m['baseline_median_mae_minutes']} minutes")
    print(f"Improvement:  {m['improvement_over_baseline_pct']}%")

