package com.lokeii.tokenaccess;

import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.IBinder;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;

public class OverlayService extends Service {
    private WindowManager wm;
    private LinearLayout overlay;

    @Override public IBinder onBind(Intent i) { return null; }

    @Override
    public void onCreate() {
        super.onCreate();
        wm = (WindowManager) getSystemService(WINDOW_SERVICE);

        overlay = new LinearLayout(this);
        overlay.setOrientation(LinearLayout.VERTICAL);
        overlay.setPadding(20, 20, 20, 20);
        overlay.setBackgroundColor(0xCC0A0C10);

        Button btn = new Button(this);
        btn.setText("TOKEN");
        btn.setBackgroundColor(0xFFF2A900);
        btn.setTextColor(0xFF111111);
        btn.setOnClickListener(v -> {
            Intent i = new Intent(this, InputActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        });
        overlay.addView(btn);

        Button hide = new Button(this);
        hide.setText("x");
        hide.setBackgroundColor(0xFF333333);
        hide.setTextColor(0xFFE8EBF0);
        hide.setOnClickListener(v -> stopSelf());
        overlay.addView(hide);

        WindowManager.LayoutParams p = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT);
        p.gravity = Gravity.TOP | Gravity.START;
        p.x = 80;
        p.y = 400;

        wm.addView(overlay, p);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (overlay != null && wm != null) {
            try { wm.removeView(overlay); } catch (Exception e) {}
        }
    }
}
