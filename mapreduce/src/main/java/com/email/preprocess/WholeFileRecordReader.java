package com.email.preprocess;

import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.FSDataInputStream;
import org.apache.hadoop.io.BytesWritable;
import org.apache.hadoop.io.IOUtils;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.InputSplit;
import org.apache.hadoop.mapreduce.RecordReader;
import org.apache.hadoop.mapreduce.TaskAttemptContext;
import org.apache.hadoop.mapreduce.lib.input.FileSplit;

import java.io.IOException;

public class WholeFileRecordReader extends RecordReader<Text, BytesWritable> {
  private FileSplit fileSplit;
  private Configuration conf;
  private boolean processed = false;

  private final Text key = new Text();
  private final BytesWritable value = new BytesWritable();

  @Override
  public void initialize(InputSplit split, TaskAttemptContext context) throws IOException {
    this.fileSplit = (FileSplit) split;
    this.conf = context.getConfiguration();
  }

  @Override
  public boolean nextKeyValue() throws IOException {
    if (processed) {
      return false;
    }

    long length = fileSplit.getLength();
    if (length > Integer.MAX_VALUE) {
      throw new IOException("File too large: " + fileSplit.getPath());
    }

    byte[] contents = new byte[(int) length];
    try (FSDataInputStream in = fileSplit.getPath().getFileSystem(conf).open(fileSplit.getPath())) {
      IOUtils.readFully(in, contents, 0, contents.length);
    }

    key.set(fileSplit.getPath().toString());
    value.set(contents, 0, contents.length);
    processed = true;
    return true;
  }

  @Override
  public Text getCurrentKey() {
    return key;
  }

  @Override
  public BytesWritable getCurrentValue() {
    return value;
  }

  @Override
  public float getProgress() {
    return processed ? 1.0f : 0.0f;
  }

  @Override
  public void close() {
    // Nothing to close
  }
}
