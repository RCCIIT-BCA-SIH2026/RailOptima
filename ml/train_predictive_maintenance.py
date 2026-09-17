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
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("train_predictive_maintenance")

# -------------------------------------------------------------------
# Feature Definitions
# -------------------------------------------------------------------
NUMERICAL_FEATURES = [
    # Sensors & Telemetry (10)
    "rail_wear_mm",
    "track_vibration_level",
    "wheel_wear_percent",
    "brake_pad_wear_percent",
    "brake_pressure_psi",
    "axle_temperature_c",
    "bearing_temperature_c",
    "battery_voltage",
    "sensor_health_index",
    "inspection_score",
    # Asset & Operational (5)
    "train_age_years",
    "distance_travelled_km",
    "average_speed_kmph",
    "delay_minutes",
    "last_maintenance_days",
    # Environmental & Context numerical (3)
    "ambient_temperature_c",
    "humidity_percent",
    "rainfall_mm"
]

CATEGORICAL_FEATURES = [
    # Environmental & Context categorical (3)
    "region",
    "season",
    "train_type"
]

ALL_FEATURES = NUMERICAL_FEATURES + CATEGORICAL_FEATURES
TARGET_COLUMN = "maintenance_required"
EXCLUDED_COLUMNS = ["train_id", "failure_type", "failure_severity", "risk_score"]


def validate_dataset(df: pd.DataFrame) -> None:
    """Validates that dataset is valid, non-empty, and has all required columns."""
    if df is None or len(df) == 0:
        raise ValueError("Dataset is empty.")

    missing_features = [col for col in ALL_FEATURES if col not in df.columns]
    if missing_features:
        raise KeyError(f"Dataset is missing required feature columns: {missing_features}")

    if TARGET_COLUMN not in df.columns:
        raise KeyError(f"Target column '{TARGET_COLUMN}' not found in dataset.")

    unique_targets = set(df[TARGET_COLUMN].dropna().unique())
    if not unique_targets.issubset({0, 1}):
        raise ValueError(f"Target column '{TARGET_COLUMN}' contains invalid non-binary values: {unique_targets}")

    if df[TARGET_COLUMN].isnull().any():
        raise ValueError(f"Target column '{TARGET_COLUMN}' contains null/missing values.")

    logger.info(f"Dataset validation passed: {len(df):,} records, {len(ALL_FEATURES)} features, target '{TARGET_COLUMN}'.")


def build_pipeline() -> Pipeline:
    """Builds a unified sklearn Pipeline containing ColumnTransformer preprocessing and RandomForestClassifier."""
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

    full_pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", RandomForestClassifier(
            n_estimators=200,
            max_depth=12,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1
        ))
    ])

    return full_pipeline


def train_and_evaluate(
    data_path: str,
    output_dir: str
) -> Dict[str, Any]:
    """Loads dataset, splits data (80/10/10), trains pipeline, evaluates, and saves artifacts."""
    logger.info(f"Loading dataset from: {data_path}")
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset file not found at: {data_path}")

    df = pd.read_csv(data_path)
    validate_dataset(df)

    X = df[ALL_FEATURES]
    y = df[TARGET_COLUMN].astype(int)

    # Stratified Split: 80% train, 10% validation, 10% final test
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=42
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, stratify=y_temp, random_state=42
    )

    logger.info(
        f"Split sizes: Train={len(X_train):,} ({len(X_train)/len(df)*100:.0f}%), "
        f"Validation={len(X_val):,} ({len(X_val)/len(df)*100:.0f}%), "
        f"Test={len(X_test):,} ({len(X_test)/len(df)*100:.0f}%)"
    )

    # Build and fit pipeline
    pipeline = build_pipeline()
    logger.info("Fitting complete preprocessing + RandomForest pipeline on training set...")
    pipeline.fit(X_train, y_train)
    logger.info("Training complete.")

    # 1. Validation Evaluation
    val_pred = pipeline.predict(X_val)
    val_proba = pipeline.predict_proba(X_val)[:, 1]
    val_acc = float(accuracy_score(y_val, val_pred))
    val_roc = float(roc_auc_score(y_val, val_proba))
    val_f1 = float(f1_score(y_val, val_pred))
    logger.info(f"Validation Evaluation: Accuracy={val_acc:.4f}, ROC-AUC={val_roc:.4f}, F1={val_f1:.4f}")

    # 2. Final Test Set Evaluation (evaluated only once on hold-out test set)
    logger.info("Evaluating on held-out final test set...")
    test_pred = pipeline.predict(X_test)
    test_proba = pipeline.predict_proba(X_test)[:, 1]

    acc = float(accuracy_score(y_test, test_pred))
    prec = float(precision_score(y_test, test_pred))
    rec = float(recall_score(y_test, test_pred))
    f1 = float(f1_score(y_test, test_pred))
    roc_auc = float(roc_auc_score(y_test, test_proba))
    cm = confusion_matrix(y_test, test_pred).tolist()
    clf_report = classification_report(y_test, test_pred, output_dict=True)

    # Detailed counts
    tn, fp, fn, tp = confusion_matrix(y_test, test_pred).ravel()
    logger.info(f"Test Accuracy:  {acc:.4f}")
    logger.info(f"Test Precision: {prec:.4f}")
    logger.info(f"Test Recall:    {rec:.4f}")
    logger.info(f"Test F1-Score:  {f1:.4f}")
    logger.info(f"Test ROC-AUC:   {roc_auc:.4f}")
    logger.info(f"Confusion Matrix: TN={tn}, FP={fp}, FN={fn}, TP={tp}")

    # 3. Extract Feature Importances
    preprocessor = pipeline.named_steps["preprocessor"]
    rf = pipeline.named_steps["classifier"]
    
    transformed_feature_names = preprocessor.get_feature_names_out()
    raw_importances = rf.feature_importances_

    # Clean transformed feature names
    cleaned_feature_names = [
        name.replace("num__", "").replace("cat__", "") for name in transformed_feature_names
    ]
    
    feature_importances = [
        {"feature": name, "importance": round(float(imp), 5)}
        for name, imp in sorted(
            zip(cleaned_feature_names, raw_importances),
            key=lambda item: item[1],
            reverse=True
        )
    ]

    os.makedirs(output_dir, exist_ok=True)

    # 4. Save COMPLETE pipeline as .pkl
    model_path = os.path.join(output_dir, "predictive_maintenance_model.pkl")
    joblib.dump(pipeline, model_path, compress=3)
    logger.info(f"Saved complete pipeline to: {model_path} ({os.path.getsize(model_path):,} bytes)")

    # 5. Save metrics JSON
    metrics_path = os.path.join(output_dir, "predictive_maintenance_metrics.json")
    metrics_data = {
        "dataset_name": os.path.basename(data_path),
        "total_records": len(df),
        "feature_names": ALL_FEATURES,
        "numerical_features": NUMERICAL_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "excluded_columns": EXCLUDED_COLUMNS,
        "target_column": TARGET_COLUMN,
        "train_records": len(X_train),
        "validation_records": len(X_val),
        "test_records": len(X_test),
        "model_name": "RandomForestClassifier (Pipeline with Median Imputation + OneHotEncoder)",
        "hyperparameters": {
            "n_estimators": 200,
            "max_depth": 12,
            "class_weight": "balanced",
            "random_state": 42,
            "n_jobs": -1
        },
        "validation_metrics": {
            "accuracy": round(val_acc, 4),
            "roc_auc": round(val_roc, 4),
            "f1": round(val_f1, 4)
        },
        "test_metrics": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "roc_auc": round(roc_auc, 4),
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp),
            "confusion_matrix": cm,
            "classification_report": clf_report
        },
        "training_timestamp": datetime.utcnow().isoformat() + "Z"
    }

    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics_data, f, indent=2)
    logger.info(f"Saved metrics report to: {metrics_path}")

    # 6. Save Feature Importance JSON
    fi_path = os.path.join(output_dir, "predictive_maintenance_feature_importance.json")
    with open(fi_path, "w", encoding="utf-8") as f:
        json.dump(feature_importances, f, indent=2)
    logger.info(f"Saved feature importances to: {fi_path}")

    return {
        "metrics": metrics_data,
        "feature_importances": feature_importances,
        "pipeline": pipeline,
        "X_test": X_test,
        "y_test": y_test
    }


def predict_sample(pipeline: Pipeline, sample: Dict[str, Any]) -> Dict[str, Any]:
    """Single-sample inference matching required schema."""
    df_sample = pd.DataFrame([sample])
    pred = int(pipeline.predict(df_sample)[0])
    proba = float(pipeline.predict_proba(df_sample)[0][1])
    return {
        "maintenance_required": bool(pred == 1),
        "maintenance_probability": round(proba, 4)
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
    print("\n--- INFERENCE TEST ON TEST SAMPLES ---")
    X_test = result["X_test"]
    y_test = result["y_test"]
    loaded_pipe = joblib.load(os.path.join(output_directory, "predictive_maintenance_model.pkl"))

    for idx in range(3):
        sample_dict = X_test.iloc[idx].to_dict()
        actual_label = int(y_test.iloc[idx])
        out = predict_sample(loaded_pipe, sample_dict)
        print(f"Sample {idx+1}: Actual={actual_label} | Prediction={out}")

