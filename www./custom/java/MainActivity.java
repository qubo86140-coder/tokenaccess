package com.lokeii.tokenaccess;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;
import java.io.BufferedReader;
import java.io.InputStreamReader;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(this.getBridge().getWebView(), true);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getPackageName()));
                startActivity(i);
            }
        }

        getBridge().getWebView().addJavascriptInterface(new NativeBridge(), "AndroidBridge");
    }

    public class NativeBridge {

        @JavascriptInterface
        public void exec(String cmd, String cbName) {
            final String result = runCommand(cmd);
            runOnUiThread(() -> getBridge().getWebView().evaluateJavascript(
                    "if(window['" + cbName + "'])window['" + cbName + "'](" + jsonEscape(result) + ");", null));
        }

        private String runCommand(String cmd) {
            try {
                if (cmd.startsWith("overlay_start")) {
                    startService(new Intent(MainActivity.this, OverlayService.class));
                    return "overlay started";
                }
                if (cmd.startsWith("overlay_stop")) {
                    stopService(new Intent(MainActivity.this, OverlayService.class));
                    return "overlay stopped";
                }
                if (cmd.startsWith("save_token ")) {
                    byte[] raw = android.util.Base64.decode(cmd.substring(11).trim(), android.util.Base64.DEFAULT);
                    return TokenStore.save(MainActivity.this, new String(raw));
                }
                if (cmd.startsWith("save_android_id ")) {
                    byte[] raw = android.util.Base64.decode(cmd.substring(16).trim(), android.util.Base64.DEFAULT);
                    return TokenStore.saveAndroidId(MainActivity.this, new String(raw));
                }
                if (cmd.startsWith("list_tokens")) return TokenStore.list(MainActivity.this);
                if (cmd.startsWith("use_token ")) return TokenStore.use(MainActivity.this, Integer.parseInt(cmd.substring(10).trim()));
                if (cmd.startsWith("clear_tokens")) return TokenStore.clear(MainActivity.this);

                if (cmd.startsWith("run_frida_script ")) {
                    String path = cmd.substring(17).trim();
                    return runSu("frida -H 127.0.0.1:31337 -n Gadget -l " + path + " --no-pause > /data/local/tmp/frida.log 2>&1 &");
                }
                if (cmd.startsWith("attach_frida ")) {
                    String pkg = cmd.substring(13).trim();
                    String script = "/data/local/tmp/scripts/pubg-hook.js";
                    return runSu("frida -H 127.0.0.1:31337 -f " + pkg + " -l " + script + " --no-pause > /data/local/tmp/frida.log 2>&1 &");
                }

                if (cmd.startsWith("su -c ")) {
                    String real = cmd.substring(6).trim();
                    if (real.startsWith("\"") && real.endsWith("\"")) real = real.substring(1, real.length() - 1);
                    return runSu(real);
                }
                return runShell(cmd);
            } catch (Exception e) {
                return "ERROR: " + e.getMessage();
            }
        }

        private String runSu(String cmd) {
            try {
                Process p = Runtime.getRuntime().exec(new String[]{"su", "-c", cmd});
                return read(p);
            } catch (Exception e) { return "ERROR: " + e.getMessage(); }
        }
        private String runShell(String cmd) {
            try {
                Process p = Runtime.getRuntime().exec(new String[]{"sh", "-c", cmd});
                return read(p);
            } catch (Exception e) { return "ERROR: " + e.getMessage(); }
        }
        private String read(Process p) throws Exception {
            BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream()));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) sb.append(line).append("\n");
            p.waitFor();
            return sb.toString().trim();
        }

        private String jsonEscape(String s) {
            return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"")
                          .replace("\n", "\\n").replace("\r", "") + "\"";
        }
    }
            }
