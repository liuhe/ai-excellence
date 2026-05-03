package com.proxy.manager.service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;

public class CouponCodeGenerator {

    private static final char[] CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ".toCharArray();
    private static final int GROUP_SIZE = 4;
    private static final int GROUP_COUNT = 4;
    private static final SecureRandom RANDOM = new SecureRandom();

    public static String generate() {
        StringBuilder sb = new StringBuilder();
        for (int g = 0; g < GROUP_COUNT; g++) {
            if (g > 0) sb.append('-');
            for (int i = 0; i < GROUP_SIZE; i++) {
                sb.append(CHARSET[RANDOM.nextInt(CHARSET.length)]);
            }
        }
        return sb.toString();
    }

    public static List<String> generateBatch(int count) {
        List<String> codes = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            codes.add(generate());
        }
        return codes;
    }
}
