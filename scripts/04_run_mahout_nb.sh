#!/usr/bin/env bash
set -euo pipefail

HDFS_BASE=/email_project
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$SCRIPT_DIR/env.sh"

hdfs dfs -rm -r -f "$HDFS_BASE/seq" || true
hdfs dfs -rm -r -f "$HDFS_BASE/vectors" || true
hdfs dfs -rm -r -f "$HDFS_BASE/model" || true
hdfs dfs -rm -r -f "$HDFS_BASE/labelindex" || true
hdfs dfs -rm -r -f "$HDFS_BASE/nb-output" || true

mahout seqdirectory -i "$HDFS_BASE/cleaned" -o "$HDFS_BASE/seq" -c
mahout seq2sparse -i "$HDFS_BASE/seq" -o "$HDFS_BASE/vectors" -lnorm -nv -wt tfidf
mahout trainnb -i "$HDFS_BASE/vectors/tf-vectors" -o "$HDFS_BASE/model" -li "$HDFS_BASE/labelindex" -ow
mahout testnb -i "$HDFS_BASE/vectors/tf-vectors" -o "$HDFS_BASE/nb-output" -m "$HDFS_BASE/model" -l "$HDFS_BASE/labelindex" -ow
