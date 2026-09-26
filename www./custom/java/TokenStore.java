package com.lokeii.tokenaccess;

import android.content.Context;
import java.io.*;

public class TokenStore {
    private static final String DIR = "/data/local/tmp/tokenaccess";
    private static final String TOKENS = DIR + "/tokens.txt";
    private static final String ACTIVE = DIR + "/active.txt";
    private static final String FRIDA = DIR + "/frida-token.txt";
    private static final String AID = DIR + "/android_id.txt";

    private static void ensure() {
        File d = new File(DIR);
        if (!d.exists()) d.mkdirs();
        try { Runtime.getRuntime().exec(new String[]{"su", "-c", "chmod 777 " + DIR}).waitFor(); } catch (Exception e) {}
    }

    public static String save(Context ctx, String token) {
        try {
            ensure();
            StringBuilder all = new StringBuilder();
            File f = new File(TOKENS);
            if (f.exists()) {
                BufferedReader r = new BufferedReader(new FileReader(f));
                String l;
                while ((l = r.readLine()) != null) if (!l.trim().isEmpty()) all.append(l).append("\n");
                r.close();
            }
            all.append(token).append("\n");
            write(TOKENS, all.toString());
            write(ACTIVE, token);
            write(FRIDA, token);
            return "saved";
        } catch (Exception e) { return "ERROR: " + e.getMessage(); }
    }

    public static String saveAndroidId(Context ctx, String aid) {
        try { ensure(); write(AID, aid); return "saved"; }
        catch (Exception e) { return "ERROR: " + e.getMessage(); }
    }

    public static String list(Context ctx) {
        try {
            File f = new File(TOKENS);
            if (!f.exists()) return "EMPTY";
            BufferedReader r = new BufferedReader(new FileReader(f));
            StringBuilder sb = new StringBuilder();
            String l;
            while ((l = r.readLine()) != null) if (!l.trim().isEmpty()) sb.append(l).append("\n");
            r.close();
            return sb.length() == 0 ? "EMPTY" : sb.toString().trim();
        } catch (Exception e) { return "EMPTY"; }
    }

    public static String use(Context ctx, int idx) {
        try {
            BufferedReader r = new BufferedReader(new FileReader(TOKENS));
            String l;
            int i = 0;
            String found = null;
            while ((l = r.readLine()) != null) {
                if (l.trim().isEmpty()) continue;
                if (i == idx) { found = l; break; }
                i++;
            }
            r.close();
            if (found == null) return "ERROR: bad index";
            write(ACTIVE, found);
            write(FRIDA, found);
            return found;
        } catch (Exception e) { return "ERROR: " + e.getMessage(); }
    }

    public static String clear(Context ctx) {
        try {
            new File(TOKENS).delete();
            new File(ACTIVE).delete();
            new File(FRIDA).delete();
            new File(AID).delete();
            return "cleared";
        } catch (Exception e) { return "ERROR: " + e.getMessage(); }
    }

    private static void write(String path, String data) throws IOException {
        BufferedWriter w = new BufferedWriter(new FileWriter(path));
        w.write(data);
        w.close();
    }
}
