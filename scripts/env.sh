#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
TOOLS_DIR="$PROJECT_ROOT/tools"

if [ -d "$TOOLS_DIR/mahout/bin" ]; then
  export MAHOUT_HOME="$TOOLS_DIR/mahout"
  export PATH="$MAHOUT_HOME/bin:$PATH"
fi

if [ -d "$TOOLS_DIR/hadoop/bin" ]; then
  export HADOOP_HOME="$TOOLS_DIR/hadoop"
  export HADOOP_CONF_DIR="$HADOOP_HOME/etc/hadoop"
  export PATH="$HADOOP_HOME/bin:$HADOOP_HOME/sbin:$PATH"
fi
