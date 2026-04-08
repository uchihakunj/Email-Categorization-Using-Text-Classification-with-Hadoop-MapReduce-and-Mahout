#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
source "$SCRIPT_DIR/env.sh"

ARTIFACTS_DIR="$PROJECT_ROOT/artifacts"
HDFS_MODEL="/email_project/model_sa"
HDFS_LABELS="/email_project/labelindex_sa"

mkdir -p "$ARTIFACTS_DIR"

hdfs dfs -get -f "$HDFS_MODEL" "$ARTIFACTS_DIR/"
hdfs dfs -get -f "$HDFS_LABELS" "$ARTIFACTS_DIR/"

echo "Exported model to $ARTIFACTS_DIR"
