#!/usr/bin/env bash
set -euo pipefail

HDFS_BASE=/email_project
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$SCRIPT_DIR/env.sh"
LOCAL_RAW="$SCRIPT_DIR/../data/raw"
LOCAL_SPAM="$LOCAL_RAW/spam"
LOCAL_IMPORTANT="$LOCAL_RAW/important"

hdfs dfs -mkdir -p "$HDFS_BASE"
hdfs dfs -rm -r -f "$HDFS_BASE/raw" || true
hdfs dfs -mkdir -p "$HDFS_BASE/raw"
hdfs dfs -put "$LOCAL_SPAM" "$HDFS_BASE/raw/"
hdfs dfs -put "$LOCAL_IMPORTANT" "$HDFS_BASE/raw/"
