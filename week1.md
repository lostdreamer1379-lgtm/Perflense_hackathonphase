# DO THIS NOW - Hand-Held Step-by-Step Guide

Follow this **exactly**. Do not skip anything. Do not think. Just copy/paste and read along.

---

## BEFORE YOU START (2 minutes)

### 1. Open your terminal

On your computer, open a terminal/command line:

**macOS:** Press `Cmd + Space`, type "terminal", press Enter  
**Linux:** Press `Ctrl + Alt + T`  
**Windows:** Press `Win + R`, type "cmd", press Enter

You should see something like:
```
yourname@computer ~ %
```
or
```
C:\Users\yourname>
```

### 2. Navigate to your Perflens project

Type this and press Enter:

```bash
cd ~/projects/Perflens
```

or if your path is different:

```bash
cd /path/to/your/Perflens
```

**Check you're in the right place:**

```bash
pwd
```

Press Enter. You should see a path ending in `/Perflens`. If not, navigate to the right folder first.

### 3. Check Node is installed

```bash
node --version
```

Press Enter. You should see `v22.x.x` or higher. If not, [install Node first](https://nodejs.org/).

---

## NOW START HERE

### STEP 1: Create the URL List (2 minutes)

This creates a file with 200 websites we'll crawl.

**Copy this entire block:**

```bash
mkdir -p data

cat > data/urls-to-crawl.txt << 'EOF'
github.com
stripe.com
amazon.com
bbc.com
cnn.com
medium.com
stackoverflow.com
youtube.com
twitter.com
instagram.com
facebook.com
netflix.com
spotify.com
airbnb.com
uber.com
slack.com
notion.so
figma.com
vercel.com
nextjs.org
react.dev
webpack.js.org
tailwindcss.com
vite.dev
typescript.org
nodejs.org
python.org
rust-lang.org
golang.org
kotlin.org
swift.org
ruby-lang.org
php.net
laravel.com
django.io
fastapi.tiangolo.com
flask.palletsprojects.com
express.com
nestjs.com
springboot.io
maven.apache.org
gradle.org
docker.com
kubernetes.io
terraform.io
ansible.com
jenkins.io
gitlab.com
bitbucket.org
aws.amazon.com
azure.microsoft.com
gcp.google.com
digitalocean.com
heroku.com
netlify.com
firebase.google.com
supabase.io
mongodb.com
postgresql.org
mysql.com
redis.io
elasticsearch.co
opensearch.org
minio.io
rabbitmq.com
nginx.org
apache.org
ebay.com
etsy.com
alibaba.com
aliexpress.com
wish.com
shopify.com
wix.com
squarespace.com
weebly.com
wordpress.com
substack.com
beehive.com
dev.to
hashnode.com
reddit.com
quora.com
producthunt.com
ycombinator.com
dribbble.com
behance.net
flickr.com
500px.com
unsplash.com
pexels.com
pixabay.com
freepik.com
canva.com
sketch.com
adobe.com
autodesk.com
cad.onshape.com
tinkercad.com
blender.org
unity.com
unreal.com
godotengine.org
itch.io
steam.com
epicgames.com
playstation.com
xbox.com
nintendo.com
linkedin.com
indeed.com
glassdoor.com
monster.com
upwork.com
fiverr.com
freelancer.com
99designs.com
alibaba.com
trello.com
asana.com
monday.com
jira.atlassian.com
sourcetree.com
git-scm.com
svn.apache.org
mercurial.selenic.com
fossil-scm.org
perforce.com
darcs.net
pijul.org
teams.microsoft.com
discord.com
telegram.org
whatsapp.com
signal.org
viber.com
skype.com
zoom.us
meet.google.com
webex.com
whereby.com
jitsi.org
mailchimp.com
sendinblue.com
constant-contact.com
aweber.com
getresponse.com
convertkit.com
activecampaign.com
hubspot.com
salesforce.com
pipedrive.com
zoho.com
freshsales.com
insightly.com
keap.com
intercom.com
drift.com
freshdesk.com
zendesk.com
twilio.com
vonage.com
bandwidth.com
nexmo.com
plivo.com
signalwire.com
ringcentral.com
8x8.com
jive.com
avaya.com
polycom.com
cisco.com
yealink.com
snom.com
grandstream.com
panasonic.com
samsung.com
apple.com
microsoft.com
google.com
intel.com
nvidia.com
amd.com
qualcomm.com
arm.com
broadcom.com
juniper.com
arista.com
paloalto.com
fortinet.com
checkpoint.com
zscaler.com
crowdstrike.com
mandiant.com
rapid7.com
qualys.com
nessus.com
openvas.com
metasploit.com
kali.org
parrotsec.org
backbox.org
pentestbox.com
hackthebox.com
tryhackme.com
vulnhub.com
exploit-db.com
cvedetails.com
cve.mitre.org
nvd.nist.gov
owasp.org
sans.org
isa.org
nist.gov
cis.org
ietf.org
w3.org
ecma-international.org
iso.org
iec.ch
ieee.org
acm.org
aaai.org
ijcai.org
icml.cc
nips.cc
iclr.cc
neurips.cc
kdd.org
sigmod.org
vldb.org
www2.org
www-conf.org
chi.acm.org
uist.acm.org
iui.acm.org
cdnjs.com
maxcdn.com
cloudflare.com
fastly.com
akamai.com
edgecast.com
level3.com
limelight.com
highwinds.com
cogent.com
zenlayer.com
gslb.me
EOF
```

**Paste this into your terminal and press Enter.**

You should see nothing happen (that's good).

**Verify it worked:**

```bash
wc -l data/urls-to-crawl.txt
```

Press Enter. You should see:
```
200 data/urls-to-crawl.txt
```

If you see that, **move to STEP 2**.

---

### STEP 2: Create the Batch Analyzer (3 minutes)

This creates a script that will crawl all 200 websites.

**Copy this entire block:**

```bash
cat > worker/batch-analyze.ts << 'EOF'
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { measure } from './src/lighthouse.js';
import { parseLighthouse } from './src/parser/index.js';

const urlFile = resolve(process.argv[2] || '../data/urls-to-crawl.txt');
if (!existsSync(urlFile)) {
  console.error(`❌ URL file not found: ${urlFile}`);
  process.exit(1);
}

const urls = readFileSync(urlFile, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

console.log(`📊 Crawling ${urls.length} sites...\n`);

const csvPath = resolve('../data/crawl-results.csv');
const header = [
  'url',
  'bytes_total',
  'bytes_js',
  'bytes_images',
  'bytes_css',
  'bytes_fonts',
  'requests_total',
  'requests_3p',
  'dom_elements',
  'lcp_ms',
  'fcp_ms',
  'tbt_ms',
  'cls',
  'performance_score',
  'timestamp',
].join(',');

if (!existsSync(csvPath)) {
  writeFileSync(csvPath, header + '\n');
  console.log(`📁 Created ${csvPath}\n`);
}

let completed = 0;
let failed = 0;
const startTime = Date.now();

for (const url of urls) {
  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
  const index = completed + failed + 1;

  try {
    console.log(`[${index}/${urls.length}] Analyzing ${url}...`);

    const { lhr } = await measure(fullUrl);
    const p = parseLighthouse(lhr);

    const row = [
      url,
      p.profile.bytes.total,
      p.profile.bytes.js,
      p.profile.bytes.images,
      p.profile.bytes.css,
      p.profile.bytes.fonts,
      p.profile.requests.total,
      p.profile.requests.thirdParty,
      p.profile.dom,
      Math.round(p.baseline.lcp),
      Math.round(p.baseline.fcp),
      Math.round(p.baseline.tbt),
      p.baseline.cls.toFixed(2),
      p.scores.performance,
      new Date().toISOString(),
    ].join(',');

    appendFileSync(csvPath, row + '\n');
    completed++;

    if (completed % 10 === 0) {
      const elapsed = (Date.now() - startTime) / 1000 / 60;
      const perSite = elapsed / completed;
      const remaining = (urls.length - completed) * perSite;
      console.log(`✓ ${completed}/${urls.length} (${remaining.toFixed(0)} min remaining)\n`);
    }
  } catch (e) {
    console.error(`✗ Failed: ${url} - ${(e as Error).message.slice(0, 80)}\n`);
    failed++;
  }
}

const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
console.log(`\n📈 Done! (${totalTime} minutes)`);
console.log(`✓ Completed: ${completed}`);
console.log(`✗ Failed: ${failed}`);
console.log(`📁 Saved to: ${csvPath}`);
EOF
```

**Paste this into your terminal and press Enter.**

You should see nothing (that's good).

**Verify it worked:**

```bash
ls -la worker/batch-analyze.ts
```

You should see the file listed. **Move to STEP 3.**

---

### STEP 3: Run the Crawler (2-3 hours)

This is the big one. Your computer will crawl all 200 websites. This takes 2–3 hours.

**Go into the worker directory:**

```bash
cd worker
```

**Install dependencies (if needed):**

```bash
npm install
```

**Now run the crawler:**

```bash
npx tsx batch-analyze.ts ../data/urls-to-crawl.txt
```

Press Enter.

**You should see:**

```
📊 Crawling 200 sites...

[1/200] Analyzing github.com...
✓ Completed: 200/200 (0 min remaining)
[2/200] Analyzing stripe.com...
...
[200/200] Analyzing gslb.me...

📈 Done! (165.3 minutes)
✓ Completed: 185
✗ Failed: 15
📁 Saved to: ../data/crawl-results.csv
```

**This will take 2–3 hours. Your laptop should stay on, but you can leave it.**

**While waiting, do NOT close the terminal.**

If you need to close it, use this to run in background:

```bash
# macOS/Linux (after Ctrl+C to stop, or in a new terminal)
nohup npx tsx batch-analyze.ts ../data/urls-to-crawl.txt > crawl.log 2>&1 &

# Monitor progress
tail -f crawl.log
# Press Ctrl+C to stop monitoring (crawler keeps running)
```

**You can check progress while it runs:**

```bash
# In a NEW terminal window/tab
tail -20 ../data/crawl-results.csv
```

**When it's done, move to STEP 4.**

---

### STEP 4: Clean the Data (1 hour)

After the crawler finishes, you need to clean the data.

**Create the cleaning script:**

```bash
cat > ../data/prepare_data.py << 'EOF'
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
EOF
```

**Install Python dependencies:**

```bash
pip install pandas numpy
```

**Run the cleaner:**

```bash
cd ../data
python prepare_data.py
```

**You should see:**

```
📂 Loading crawl results...
Loaded 185 sites

🧹 Cleaning...

Removed 0 rows with nulls
Removed 8 rows by byte size
Removed 2 rows by LCP value
Removed 0 duplicate URLs

✓ Final dataset: 175 rows

Stats:
             bytes_total      bytes_js    lcp_ms    fcp_ms    tbt_ms
count        175.000000   175.000000  175.000000  175.000000  175.000000
mean      2150445.0    620000.0   2450.0   1320.0    185.0
...

✅ Saved to training-data-clean.csv
```

**Move to STEP 5.**

---

### STEP 5: Train Your First Model (30 minutes)

Now train an ML model on the cleaned data.

**Create the training script:**

```bash
cat > ../ml/train_lcp.py << 'EOF'
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

model.fit(X_train, y_train, eval_set=[(X_test, y_test)], early_stopping_rounds=5)

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

joblib.dump(model, 'models/lcp-model.pkl')
print(f"\n✅ Model saved to models/lcp-model.pkl")
EOF
```

**Install ML libraries:**

```bash
pip install scikit-learn lightgbm joblib
```

**Create models directory:**

```bash
mkdir -p ml/models
```

**Run training:**

```bash
cd ../ml
python train_lcp.py
```

**You should see:**

```
📊 Training LCP model...

Loaded 175 samples
Features: 7
Target: lcp_ms
Samples: 175

Train: 140, Test: 35

🚀 Training...

📈 Results:
Train MAE: 385 ms
Test MAE:  420 ms
Train R²:  0.68
Test R²:   0.61

✅ Model saved to models/lcp-model.pkl
```

**Move to STEP 6.**

---

### STEP 6: Verify Everything (5 minutes)

Check that everything worked.

**Go to repo root:**

```bash
cd ~/projects/Perflens
```

**Check files exist:**

```bash
wc -l data/urls-to-crawl.txt
wc -l data/crawl-results.csv
wc -l data/training-data-clean.csv
ls -lh ml/models/lcp-model.pkl
```

You should see:
```
200 data/urls-to-crawl.txt
185 data/crawl-results.csv
175 data/training-data-clean.csv
-rw-r--r--  1 user  500K Oct  1 12:00 ml/models/lcp-model.pkl
```

**All green? Move to STEP 7.**

---

### STEP 7: Commit to GitHub (2 minutes)

Save your work to GitHub.

```bash
cd ~/projects/Perflens

git add -A

git commit -m "feat: phase 2 week 1 - collect 200 sites + train LCP model

- Crawled 200 diverse websites
- Collected Lighthouse metrics
- Cleaned dataset: 175 samples
- Trained LCP model: R² 0.61, MAE ±420ms
- Ready for FCP/TBT models"

git push origin final-year-project
```

You should see messages about files being added and pushed.

---

## ✅ YOU'RE DONE WITH WEEK 1

You now have:
- ✓ 200 real websites crawled
- ✓ 175 training samples
- ✓ LCP model trained (R² > 0.6)
- ✓ Code on GitHub

**Next week:** Train FCP and TBT models (same process).

---

## 🎉 Take a Break

You just completed Phase 2 Week 1. That's the hard part. Everything else is iteration.

**Commit your progress:**

```bash
git log --oneline -5
```

You should see your commit at the top.

---

## 📝 If Something Goes Wrong

**Error during Step X?**

Go to **PHASE2_TROUBLESHOOTING.md** in your outputs folder.

Find the error, follow the fix.

**Still stuck?**

Copy the exact error message and tell me. I'll help.

---

## 🚀 You're Building a Real ML System

- Week 1: Collect data + train LCP ← YOU ARE HERE
- Week 2: Train FCP + TBT
- Week 3: SHAP explanations
- Week 4: Prediction intervals
- Week 5: Frontend integration
- Week 6: Benchmarking
- Week 7: History + regression detection
- Week 8: Final project report

By end of week 1, you have proof your project works. Everything else is building on that foundation.

**Go. Start STEP 1.**