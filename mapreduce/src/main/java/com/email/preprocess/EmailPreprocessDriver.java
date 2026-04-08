package com.email.preprocess;

import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.io.NullWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Job;
import org.apache.hadoop.mapreduce.lib.input.FileInputFormat;
import org.apache.hadoop.mapreduce.lib.output.FileOutputFormat;

public class EmailPreprocessDriver {
  public static void main(String[] args) throws Exception {
    if (args.length != 2) {
      System.err.println("Usage: EmailPreprocessDriver <input> <output>");
      System.exit(1);
    }

    Configuration conf = new Configuration();
    conf.set("mapreduce.output.textoutputformat.separator", "");

    Job job = Job.getInstance(conf, "email-preprocess");
    job.setJarByClass(EmailPreprocessDriver.class);

    job.setInputFormatClass(WholeFileInputFormat.class);
    job.setMapperClass(EmailPreprocessMapper.class);
    job.setNumReduceTasks(0);

    job.setOutputKeyClass(NullWritable.class);
    job.setOutputValueClass(Text.class);

    FileInputFormat.setInputDirRecursive(job, true);
    FileInputFormat.addInputPath(job, new Path(args[0]));
    FileOutputFormat.setOutputPath(job, new Path(args[1]));

    System.exit(job.waitForCompletion(true) ? 0 : 1);
  }
}
