import pandas as pd
import sys

print("📂 Loading crawl results...")

try:
    df = pd.read_csv('crawl-results.csv')
except FileNotFoundError:
    print("❌ crawl-results.csv not found. Run the crawler first!")
    sys.exit(1)

print(f"Loaded {len(df)} sites\n")

df.columns = [
    'url', 'bytes_total', 'bytes_js', 'bytes_images', 'bytes_css',
    'bytes_fonts', 'requests_total', 'requests_3p', 'dom_elements',
    'lcp_ms', 'fcp_ms', 'tbt_ms', 'cls', 'performance_score', 'timestamp'
]

print("🧹 Cleaning...\n")

before = len(df)
df = df.dropna()
print(f"Removed {before - len(df)} rows with nulls")

before = len(df)
df = df[(df['bytes_total'] >= 10000) & (df['bytes_total'] <= 30000000)]
print(f"Removed {before - len(df)} rows by byte size")

before = len(df)
df = df[(df['lcp_ms'] > 0) & (df['lcp_ms'] < 15000)]
print(f"Removed {before - len(df)} rows by LCP value")

before = len(df)
df = df.drop_duplicates(subset=['url'])
print(f"Removed {before - len(df)} duplicate URLs")

print(f"\n✓ Final dataset: {len(df)} rows\n")
print("Stats:")
print(df[['bytes_total', 'bytes_js', 'lcp_ms', 'fcp_ms', 'tbt_ms']].describe())

df.to_csv('training-data-clean.csv', index=False)
print(f"\n✅ Saved to training-data-clean.csv")
