#!/usr/bin/env bash
set -euo pipefail

HDFS_BASE=/email_project
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$SCRIPT_DIR/env.sh"
JAR="$SCRIPT_DIR/../mapreduce/target/email-preprocess-1.0.jar"
MAIN_CLASS=com.email.preprocess.EmailPreprocessDriver

hdfs dfs -rm -r -f "$HDFS_BASE/cleaned" || true
hadoop jar "$JAR" "$MAIN_CLASS" "$HDFS_BASE/raw" "$HDFS_BASE/cleaned"
