package com.email.preprocess;

public class SimpleStemmer {
  public String stem(String token) {
    if (token == null || token.length() < 3) {
      return token;
    }

    String t = token;
    int len = t.length();

    if (len > 4 && t.endsWith("ies")) {
      return t.substring(0, len - 3) + "y";
    }
    if (len > 5 && t.endsWith("ing")) {
      return t.substring(0, len - 3);
    }
    if (len > 4 && t.endsWith("ed")) {
      return t.substring(0, len - 2);
    }
    if (len > 4 && t.endsWith("ly")) {
      return t.substring(0, len - 2);
    }
    if (len > 4 && t.endsWith("es")) {
      return t.substring(0, len - 2);
    }
    if (len > 3 && t.endsWith("s")) {
      return t.substring(0, len - 1);
    }

    return t;
  }
}
