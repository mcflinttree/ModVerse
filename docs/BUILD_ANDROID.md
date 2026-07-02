# Building the Android APK (Capacitor)

ModVerse's client is a standard PWA (`public/`), which Capacitor wraps in a native Android shell
(a WebView) so it can be distributed as a normal APK/AAB, access native APIs (filesystem, push
notifications), and auto-load mods from device storage.

## Prerequisites

- Android Studio (latest stable) with the Android SDK + a device/emulator running API 26+
- JDK 17
- Node.js 18+ (already required for the server)

## 1. Install Capacitor Android platform packages

Already listed in `package.json` devDependencies. If needed:

```bash
npm install
```

## 2. Add the Filesystem plugin (required for mod auto-loading)

```bash
npm install @capacitor/filesystem
```

`ModLoader.js` dynamically imports `@capacitor/filesystem` only when running on a native platform,
so this is safe to add without affecting the browser/PWA build.

## 3. Add the Android platform

```bash
npx cap add android
```

This generates the `android/` folder (a full Android Studio project) using `capacitor.config.json`,
which points `webDir` at `public/`.

## 4. Request storage permissions

Mods are auto-loaded from `/storage/emulated/0/ModVerse/`, which requires storage permission on
Android. Open `android/app/src/main/AndroidManifest.xml` and ensure these are present inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

On Android 13+ (API 33+), scoped storage means broad external-storage access is restricted. For a
sandboxed game distributing user-installed mods, the two common approaches are:

1. **Simplest (recommended for this project)**: request `MANAGE_EXTERNAL_STORAGE` (the "All files
   access" special permission) so `/storage/emulated/0/ModVerse/` remains directly browsable/writable
   by the user via any file manager. Add:
   ```xml
   <uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />
   ```
   and prompt the user to grant it via `Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION`
   on first launch (add a small native permission-check activity, or use a Capacitor community
   plugin such as `capacitor-plugin-manage-external-storage`).
2. **Play Store-friendly alternative**: use the Storage Access Framework (user picks the ModVerse
   folder once via a folder picker) and persist the returned URI permission. This avoids the
   restricted `MANAGE_EXTERNAL_STORAGE` permission but requires the user to grant folder access
   once per install; wire this up with `@capacitor/filesystem`'s upcoming SAF support or a
   dedicated community plugin.

Document whichever you choose for your users in your mod-installation instructions.

## 5. Sync web assets into the native project

Every time you change anything under `public/`, run:

```bash
npm run cap:sync
```

(equivalent to `npx cap copy android && npx cap update android`)

## 6. Open in Android Studio and build

```bash
npm run cap:open
```

From Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**. The debug APK will be at
`android/app/build/outputs/apk/debug/app-debug.apk`. For a signed release build, configure a
signing key under **Build → Generate Signed Bundle / APK**.

## 7. Push notifications (optional)

`@capacitor/push-notifications` is already in `package.json`. After `npx cap sync android`, follow
Capacitor's Firebase Cloud Messaging setup (add `google-services.json` to `android/app/`) to enable
push delivery; the client-side notification handler is already implemented in `public/sw.js`.

## 8. Testing mods on-device

1. Connect your phone/emulator, install the APK.
2. Copy a mod folder (containing `manifest.json` + its script) to
   `/storage/emulated/0/ModVerse/<your-mod-folder>/` using any file manager or `adb push`:
   ```bash
   adb push mods/example-vehicle-mod /storage/emulated/0/ModVerse/example-vehicle-mod
   ```
3. Launch ModVerse, or run the `reloadmods` command in the in-game dev console.

## Troubleshooting

- **WebGL2 not available**: ensure the WebView is up to date (Android System WebView / Chrome);
  Capacitor uses the system WebView by default.
- **Mods not found**: confirm storage permission was granted and the path is exactly
  `/storage/emulated/0/ModVerse/<mod-folder>/manifest.json`.
- **White screen on launch**: check `adb logcat` for JS errors; most commonly a missing
  `cap:sync` after editing `public/`.
