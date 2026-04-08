package com.email.preprocess;

import org.apache.hadoop.io.BytesWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.InputSplit;
import org.apache.hadoop.mapreduce.RecordReader;
import org.apache.hadoop.mapreduce.TaskAttemptContext;
import org.apache.hadoop.mapreduce.lib.input.FileInputFormat;

import java.io.IOException;

public class WholeFileInputFormat extends FileInputFormat<Text, BytesWritable> {
  @Override
  protected boolean isSplitable(org.apache.hadoop.mapreduce.JobContext context, org.apache.hadoop.fs.Path filename) {
    return false;
  }

  @Override
  public RecordReader<Text, BytesWritable> createRecordReader(InputSplit split, TaskAttemptContext context)
      throws IOException {
    WholeFileRecordReader reader = new WholeFileRecordReader();
    reader.initialize(split, context);
    return reader;
  }
}
