(function () {
    "use strict";

    var AID_FILE = "/data/local/tmp/tokenaccess/android_id.txt";
    var spoofId = null;

    try {
        var f = new File(AID_FILE, "r");
        spoofId = f.read().trim();
        f.close();
        console.log("[device-spoof] android_id: " + spoofId);
    } catch (e) {
        console.log("[device-spoof] android_id не найден");
    }

    Java.perform(function () {
        try {
            var B = Java.use("android.os.Build");
            B.FINGERPRINT.value = "google/sunfish/sunfish:13/TQ3A.230805.001/10316531:user/release-keys";
            B.MODEL.value = "Pixel 4a";
            B.MANUFACTURER.value = "Google";
            B.BRAND.value = "google";
            B.DEVICE.value = "sunfish";
            B.PRODUCT.value = "sunfish";
            B.HARDWARE.value = "sunfish";
            console.log("[device-spoof] Build подменён");
        } catch (e) { console.log("[device-spoof] Build err: " + e); }

        if (spoofId) {
            try {
                var S = Java.use("android.provider.Settings$Secure");
                S.getString.overload("android.content.ContentResolver", "java.lang.String").implementation = function (cr, n) {
                    if (n === "android_id") return spoofId;
                    return this.getString(cr, n);
                };
                console.log("[device-spoof] android_id подменён");
            } catch (e) { console.log("[device-spoof] Settings err: " + e); }
        }

        try {
            var System = Java.use("java.lang.System");
            System.getProperty.overload("java.lang.String").implementation = function (key) {
                if (key === "ro.debuggable") return "0";
                if (key === "ro.secure") return "1";
                return this.getProperty(key);
            };
        } catch (e) {}
    });

    console.log("[device-spoof] активен");
})();
