-keepclassmembers class ru.swarka.admin.BuildConfig {
    public static <fields>;
}

-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class ru.swarka.admin.AdminWebActivity$AndroidBridge { *; }

-dontwarn javax.annotation.**
