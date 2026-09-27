(function () {
    "use strict";
    var paths = ["frida", "gum-js-loop", "gmain", "gadget", "linjector", "sysupd", "fs-daemon", "xposed"];

    ["fopen", "fopen64"].forEach(function (name) {
        var fn = Module.findExportByName(null, name);
        if (!fn) return;
        Interceptor.attach(fn, {
            onEnter: function (a) {
                try {
                    var p = a[0].readCString();
                    if (!p) return;
                    for (var i = 0; i < paths.length; i++) {
                        if (p.indexOf(paths[i]) >= 0) { a[0] = Memory.allocUtf8String("/dev/null"); return; }
                    }
                } catch (e) {}
            }
        });
    });

    var ptrace = Module.findExportByName(null, "ptrace");
    if (ptrace) {
        Interceptor.replace(ptrace, new NativeCallback(function () { return 0; }, "long", ["int", "int", "pointer", "pointer"]));
    }

    ["stat", "lstat", "__xstat", "__lxstat"].forEach(function (name) {
        var fn = Module.findExportByName(null, name);
        if (!fn) return;
        Interceptor.attach(fn, {
            onEnter: function (a) {
                try {
                    var p = a[0].readCString();
                    if (!p) return;
                    for (var i = 0; i < paths.length; i++) {
                        if (p.indexOf(paths[i]) >= 0) { a[0] = Memory.allocUtf8String("/dev/null"); return; }
                    }
                } catch (e) {}
            }
        });
    });

    console.log("[ace-bypass] активен");
})();
