-keepclassmembers class ru.swarka.admin.BuildConfig {
    public static <fields>;
}

-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class ru.swarka.admin.AdminWebActivity$AndroidBridge { *; }

-keep class ru.swarka.admin.update.** { *; }
-keep class ru.swarka.admin.notifications.** { *; }
-keep class com.google.firebase.** { *; }
-dontwarn me.leolin.shortcutbadger.**

-dontwarn javax.annotation.**
