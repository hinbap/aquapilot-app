#include <jni.h>
#include <exception>
#include <string>
#include "image_processor.hpp"

extern "C" JNIEXPORT jlong JNICALL
Java_expo_modules_opencvbridge_OpencvBridgeModule_receivePhotoFile(
    JNIEnv* env, jobject, jstring path, jint width, jint height) {
  const char* chars = env->GetStringUTFChars(path, nullptr);
  if (chars == nullptr) return 0;  // JNI has already raised an allocation exception.

  // Release the Java string even when the receiver throws.
  struct StringRelease {
    JNIEnv* env;
    jstring value;
    const char* chars;
    ~StringRelease() { env->ReleaseStringUTFChars(value, chars); }
  } release{env, path, chars};

  try {
    const auto photo = aquapilot::receive_photo(chars, width, height);
    return static_cast<jlong>(photo.bytes.size());
  } catch (const std::exception& exception) {
    const auto error = env->FindClass("java/lang/IllegalArgumentException");
    if (error != nullptr) env->ThrowNew(error, exception.what());
    return 0;
  }
}
