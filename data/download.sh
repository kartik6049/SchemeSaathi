#!/usr/bin/env bash
# Downloads the raw scheme datasets into data/raw/ (untrusted input — parsed, never executed).
#
#  1. JanSahayak schemes_full.json — myScheme search index (4,651 schemes: name,
#     description, tags, categories, states, ministry). github.com/S-Raha23/JanSahayak
#     NOTE: that repo has no licence; the content is public myScheme metadata.
#  2. Hugging Face shrijayan/gov_myscheme — ~600 myScheme scheme pages as PDF with
#     full Details/Benefits/Eligibility/Application/Documents text (Apache-2.0).
#
# Source of all content: MyScheme (https://www.myscheme.gov.in), Government of India.
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p raw/jansahayak raw/hf_gov_myscheme/pdf

echo "→ myScheme index (JanSahayak)"
curl -fsSL -o raw/jansahayak/schemes_full.json \
  "https://raw.githubusercontent.com/S-Raha23/JanSahayak/HEAD/backend/data/schemes_full.json"
# Date the snapshot was committed — used as "last verified" for imported schemes
curl -fsSL "https://api.github.com/repos/S-Raha23/JanSahayak/commits?path=backend/data/schemes_full.json&per_page=1" |
  python3 -I -c 'import sys, json; print(json.load(sys.stdin)[0]["commit"]["committer"]["date"][:10])' > raw/jansahayak/SNAPSHOT_DATE

echo "→ myScheme scheme pages (Hugging Face)"
curl -fsSL "https://huggingface.co/api/datasets/shrijayan/gov_myscheme/tree/main?recursive=true" |
  python3 -I -c '
import sys, json, urllib.parse
for x in json.load(sys.stdin):
    p = x["path"]
    if x.get("type") == "file" and p.endswith(".pdf") and " copy" not in p:
        print("https://huggingface.co/datasets/shrijayan/gov_myscheme/resolve/main/" + urllib.parse.quote(p))
' > raw/hf_gov_myscheme/urls.txt
(cd raw/hf_gov_myscheme/pdf && xargs -P 8 -n 1 curl -fsSLO < ../urls.txt)
curl -fsSL -o raw/hf_gov_myscheme/README.md "https://huggingface.co/datasets/shrijayan/gov_myscheme/resolve/main/README.md"

echo "✓ $(ls raw/hf_gov_myscheme/pdf | wc -l | tr -d ' ') PDFs, $(du -sh raw | cut -f1) total"
echo "Next: cd ../server && npm run data:extract && npm run data:build && npm run db:import"
