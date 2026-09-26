(function () {
    "use strict";

    var TOKEN_FILE = "/data/local/tmp/tokenaccess/frida-token.txt";
    var token = null;

    try {
        var f = new File(TOKEN_FILE, "r");
        token = f.read().trim();
        f.close();
        console.log("[pubg-hook] токен получен: " + token.length + " символов");
    } catch (e) {
        console.log("[pubg-hook] токен не найден");
    }

    Java.perform(function () {
        try {
            var RC = Java.use("okhttp3.internal.connection.RealCall");
            RC.execute.implementation = function () {
                try {
                    var req = this.request();
                    var url = req.url().toString();
                    if (/oauth|login|token|auth/i.test(url)) {
                        console.log("[pubg-hook] HTTP: " + url);
                        console.log("[pubg-hook] headers: " + req.headers().toString());
                    }
                } catch (e) {}
                return this.execute();
            };
            console.log("[pubg-hook] OkHttp перехвачен");
        } catch (e) { console.log("[pubg-hook] OkHttp нет"); }

        try {
            var SP = Java.use("android.app.SharedPreferencesImpl");
            SP.getString.overload("java.lang.String", "java.lang.String").implementation = function (k, def) {
                var v = this.getString(k, def);
                if (/token|auth|session/i.test(k)) console.log("[pubg-hook] SP: " + k + " = " + v);
                return v;
            };
            console.log("[pubg-hook] SharedPreferences перехвачен");
        } catch (e) {}

        Process.enumerateModules().forEach(function (m) {
            if (/UE4|anogs|tgpa|ace|tencent/i.test(m.name)) {
                console.log("[pubg-hook] module: " + m.name + " @ " + m.base);
            }
        });
    });

    console.log("[pubg-hook] загружен");
})();
