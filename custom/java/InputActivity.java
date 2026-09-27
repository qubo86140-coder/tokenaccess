package com.lokeii.tokenaccess;

import android.app.Activity;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public class InputActivity extends Activity {
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(40, 80, 40, 40);
        root.setBackgroundColor(0xFF0A0C10);

        TextView title = new TextView(this);
        title.setText("Вставь токен");
        title.setTextColor(0xFFF2A900);
        title.setTextSize(20);
        root.addView(title);

        EditText input = new EditText(this);
        input.setHint("access_token=...; refresh_token=...");
        input.setTextColor(0xFFE8EBF0);
        input.setHintTextColor(0xFF8B95A7);
        input.setMinLines(4);
        input.setGravity(Gravity.TOP);
        root.addView(input);

        Button save = new Button(this);
        save.setText("Сохранить");
        save.setBackgroundColor(0xFFF2A900);
        save.setTextColor(0xFF111111);
        save.setOnClickListener(v -> {
            String t = input.getText().toString().trim();
            if (!t.isEmpty()) {
                TokenStore.save(this, t);
                Toast.makeText(this, "Сохранено", Toast.LENGTH_SHORT).show();
            }
            finish();
        });
        root.addView(save);

        Button cancel = new Button(this);
        cancel.setText("Отмена");
        cancel.setBackgroundColor(0xFF333333);
        cancel.setTextColor(0xFFE8EBF0);
        cancel.setOnClickListener(v -> finish());
        root.addView(cancel);

        setContentView(root);
    }
}
