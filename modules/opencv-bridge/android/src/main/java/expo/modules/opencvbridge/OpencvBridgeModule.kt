package expo.modules.opencvbridge

import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class OpencvBridgeModule : Module() {
  companion object {
    init {
      System.loadLibrary("aquapilot_photo")
    }
  }

  private external fun receivePhotoFile(path: String, width: Int, height: Int): Long

  override fun definition() = ModuleDefinition {
    Name("OpencvBridge")

    AsyncFunction("receivePhoto") { uri: String, width: Int, height: Int ->
      val fileUri = Uri.parse(uri)
      require(fileUri.scheme == "file") { "A local photo file URI is required." }
      val path = requireNotNull(fileUri.path) { "The photo file URI has no path." }
      val byteCount = receivePhotoFile(path, width, height)
      mapOf("byteCount" to byteCount, "width" to width, "height" to height)
    }
  }
}
