package com.email.preprocess;

import org.apache.hadoop.fs.Path;
import org.apache.hadoop.io.BytesWritable;
import org.apache.hadoop.io.NullWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Mapper;
import org.apache.hadoop.mapreduce.lib.output.MultipleOutputs;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

public class EmailPreprocessMapper extends Mapper<Text, BytesWritable, NullWritable, Text> {
  private static final SimpleStemmer STEMMER = new SimpleStemmer();
  private MultipleOutputs<NullWritable, Text> multipleOutputs;

  @Override
  protected void setup(Context context) {
    multipleOutputs = new MultipleOutputs<>(context);
  }

  @Override
  protected void cleanup(Context context) throws IOException, InterruptedException {
    multipleOutputs.close();
  }

  @Override
  protected void map(Text key, BytesWritable value, Context context) throws IOException, InterruptedException {
    Path filePath = new Path(key.toString());
    Path parent = filePath.getParent();
    String label = parent == null ? "unknown" : parent.getName();
    String filename = filePath.getName();

    String content = new String(value.getBytes(), 0, value.getLength(), StandardCharsets.UTF_8);
    String cleaned = normalize(content);
    if (cleaned.isEmpty()) {
      return;
    }

    String baseOutput = label + "/" + filename;
    multipleOutputs.write(NullWritable.get(), new Text(cleaned), baseOutput);
  }

  private String normalize(String text) {
    String lower = text.toLowerCase(Locale.ROOT);
    String cleaned = lower.replaceAll("[^a-z0-9]+", " ").trim();
    if (cleaned.isEmpty()) {
      return "";
    }

    String[] parts = cleaned.split("\\s+");
    StringBuilder sb = new StringBuilder(cleaned.length());
    for (String token : parts) {
      String stem = STEMMER.stem(token);
      if (stem == null || stem.isEmpty()) {
        continue;
      }
      if (sb.length() > 0) {
        sb.append(' ');
      }
      sb.append(stem);
    }

    return sb.toString();
  }
}
