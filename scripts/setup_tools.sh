#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
TOOLS_DIR="$PROJECT_ROOT/tools"

HADOOP_VERSION="3.5.0"
MAHOUT_VERSION="0.13.0"
HADOOP_TGZ="hadoop-${HADOOP_VERSION}.tar.gz"
MAHOUT_TGZ="apache-mahout-distribution-${MAHOUT_VERSION}.tar.gz"
HADOOP_URL="https://archive.apache.org/dist/hadoop/common/hadoop-${HADOOP_VERSION}/${HADOOP_TGZ}"
MAHOUT_URL="https://archive.apache.org/dist/mahout/${MAHOUT_VERSION}/${MAHOUT_TGZ}"

download() {
  local url="$1"
  local dest="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -L "$url" -o "$dest"
  elif command -v wget >/dev/null 2>&1; then
    wget -O "$dest" "$url"
  else
    echo "curl or wget is required" >&2
    exit 1
  fi
}

mkdir -p "$TOOLS_DIR"

if [ ! -d "$TOOLS_DIR/hadoop" ]; then
  download "$HADOOP_URL" "$TOOLS_DIR/$HADOOP_TGZ"
  tar -xzf "$TOOLS_DIR/$HADOOP_TGZ" -C "$TOOLS_DIR"
  mv "$TOOLS_DIR/hadoop-${HADOOP_VERSION}" "$TOOLS_DIR/hadoop"
  rm -f "$TOOLS_DIR/$HADOOP_TGZ"
fi

if [ ! -d "$TOOLS_DIR/mahout" ]; then
  download "$MAHOUT_URL" "$TOOLS_DIR/$MAHOUT_TGZ"
  tar -xzf "$TOOLS_DIR/$MAHOUT_TGZ" -C "$TOOLS_DIR"
  mv "$TOOLS_DIR/apache-mahout-distribution-${MAHOUT_VERSION}" "$TOOLS_DIR/mahout"
  rm -f "$TOOLS_DIR/$MAHOUT_TGZ"
fi

"$SCRIPT_DIR/env.sh"
