#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$SCRIPT_DIR/env.sh"

"$SCRIPT_DIR/01_put_raw_to_hdfs.sh"
"$SCRIPT_DIR/02_build_preprocess.sh"
"$SCRIPT_DIR/03_run_preprocess.sh"
"$SCRIPT_DIR/04_run_mahout_nb.sh"
