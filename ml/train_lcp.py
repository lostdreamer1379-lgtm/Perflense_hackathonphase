import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from lightgbm import LGBMRegressor
import joblib
import sys

print("📊 Training LCP model...\n")

try:
    df = pd.read_csv('../data/training-data-clean.csv')
except FileNotFoundError:
    print("❌ training-data-clean.csv not found!")
    sys.exit(1)

print(f"Loaded {len(df)} samples")

features = ['bytes_js', 'bytes_images', 'dom_elements', 'requests_3p', 'bytes_css', 'performance_score', 'bytes_fonts']
X = df[features].fillna(0)
y = df['lcp_ms']

print(f"Features: {len(features)}")
print(f"Target: lcp_ms")
print(f"Samples: {len(X)}\n")

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print(f"Train: {len(X_train)}, Test: {len(X_test)}\n")

print("🚀 Training...")
model = LGBMRegressor(
    n_estimators=50,
    learning_rate=0.1,
    num_leaves=15,
    verbose=-1,
    random_state=42
)

model.fit(X_train, y_train)

train_pred = model.predict(X_train)
test_pred = model.predict(X_test)

train_mae = mean_absolute_error(y_train, train_pred)
test_mae = mean_absolute_error(y_test, test_pred)
train_r2 = r2_score(y_train, train_pred)
test_r2 = r2_score(y_test, test_pred)

print(f"\n📈 Results:")
print(f"Train MAE: {train_mae:.0f} ms")
print(f"Test MAE:  {test_mae:.0f} ms")
print(f"Train R²:  {train_r2:.3f}")
print(f"Test R²:   {test_r2:.3f}")

import os
os.makedirs('models', exist_ok=True)
joblib.dump(model, 'models/lcp-model.pkl')
print(f"\n✅ Model saved to models/lcp-model.pkl")

feature_importance = pd.DataFrame({
    'feature': features,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

print(f"\n📊 Feature Importance:")
print(feature_importance.to_string(index=False))

with open('results.txt', 'w') as f:
    f.write(f"LCP Model Results\n")
    f.write(f"=================\n\n")
    f.write(f"Training Samples: {len(X_train)}\n")
    f.write(f"Test Samples: {len(X_test)}\n\n")
    f.write(f"Train MAE: {train_mae:.0f} ms\n")
    f.write(f"Test MAE:  {test_mae:.0f} ms\n")
    f.write(f"Train R²:  {train_r2:.3f}\n")
    f.write(f"Test R²:   {test_r2:.3f}\n\n")
    f.write(f"Feature Importance:\n")
    f.write(feature_importance.to_string(index=False))

print(f"📁 Results saved to results.txt")
