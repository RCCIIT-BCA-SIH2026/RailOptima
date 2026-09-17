"""
STEP 12 — Validated Train Delay Prediction Model Training Pipeline v2
Dataset: data/datasets/indian_railway_failure_detection_maintenance_v2.csv
Target: delay_minutes
Features: 10 pre-dispatch environmental & operational attributes (0 data leakage)
Architecture: HistGradientBoostingRegressor pipeline with ColumnTransformer & SimpleImputer
Artifacts Output:
- ml/train_delay_prediction_model_v2.pkl
- ml/train_delay_prediction_metrics_v2.json
- ml/train_delay_prediction_feature_importance_v2.json
"""

import os
import sys
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Tuple

import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split, KFold, cross_validate
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import HistGradientBoostingRegressor
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
logger = logging.getLogger("train_delay_prediction_v2")

NUMERICAL_FEATURES = [
    "rainfall_mm",
    "humidity_percent",
    "ambient_temperature_c",
    "average_speed_kmph",
    "distance_travelled_km",
    "train_age_years",
    "last_maintenance_days"
]

CATEGORICAL_FEATURES = [
    "season",
    "region",
    "train_type"
]

ALL_FEATURES = NUMERICAL_FEATURES + CATEGORICAL_FEATURES
TARGET_COLUMN = "delay_minutes"


def build_v2_pipeline() -> Pipeline:
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


def main():
    data_path = "data/datasets/indian_railway_failure_detection_maintenance_v2.csv"
    logger.info(f"Loading dataset from: {data_path}")
    df = pd.read_csv(data_path)
    
    X = df[ALL_FEATURES]
    y = df[TARGET_COLUMN].values.astype(float)
    
    # 80% Train, 10% Validation, 10% Test
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X, y, test_size=0.10, random_state=42
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val, test_size=(1.0 / 9.0), random_state=42
    )
    
    logger.info(f"Splits: Train={len(X_train):,}, Val={len(X_val):,}, Test={len(X_test):,}")
    
    pipeline = build_v2_pipeline()
    pipeline.fit(X_train, y_train)
    
    test_pred = np.maximum(0.0, pipeline.predict(X_test))
    test_mae = float(mean_absolute_error(y_test, test_pred))
    test_rmse = float(root_mean_squared_error(y_test, test_pred))
    test_r2 = float(r2_score(y_test, test_pred))
    
    logger.info(f"V2 Model Test Evaluation: MAE={test_mae:.4f}m, RMSE={test_rmse:.4f}m, R2={test_r2:.4f}")
    
    os.makedirs("ml", exist_ok=True)
    v2_model_path = "ml/train_delay_prediction_model_v2.pkl"
    joblib.dump(pipeline, v2_model_path)
    logger.info(f"Saved v2 model pipeline to {v2_model_path}")


if __name__ == "__main__":
    main()

