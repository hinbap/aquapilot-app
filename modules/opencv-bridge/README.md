# Photo receiver

Photo review calls `receivePhoto(fileUri, width, height)` only after the user
selects **Use photo**, for both camera captures and single photos selected from
the native library picker. The async Expo module resolves the local file URI and calls
`aquapilot::receive_photo` in `cpp/image_processor.cpp` on a native worker queue.
Both iOS (Swift/Objective-C++) and Android (Kotlin/JNI) compile that same C++ file.

The C++ receiver loads the encoded photo bytes and dimensions and returns them to
the bridge. The bridge returns `{ byteCount, width, height }` to JavaScript. It
does not decode, process, upload, or permanently save the image. The received
buffer is released after the acknowledgement; add processing at the marked point
in `cpp/image_processor.cpp`. Camera files remain in Expo's temporary cache.

This requires a new development build containing `expo-camera` and this module:

```sh
npx eas-cli build --profile development --platform ios
npx eas-cli build --profile development --platform android
```

The native receiver is unavailable on web and in Expo Go. The screen reports that
limitation on confirmation and retains the preview. Camera capture must be tested
on a physical device. Verify permission grant/denial, returning from Settings,
capture, retake, successful confirmation, background/foreground, and leaving the
screen during capture.

Run the portable C++ receiver checks from the app root:

```sh
photo_test_dir=$(mktemp -d)
c++ -std=c++17 -Wall -Wextra -Werror cpp/image_processor.cpp cpp/tests/image_processor_test.cpp -o "$photo_test_dir/receiver-test"
"$photo_test_dir/receiver-test" "$photo_test_dir"
```
