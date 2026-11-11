import ExpoModulesCore
import Foundation

public class OpencvBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("OpencvBridge")

    AsyncFunction("receivePhoto") { (uri: String, width: Int, height: Int) -> [String: NSNumber] in
      guard let url = URL(string: uri), url.isFileURL else {
        throw NSError(domain: "OpencvBridge", code: 1, userInfo: [
          NSLocalizedDescriptionKey: "A local photo file URI is required."
        ])
      }
      return try PhotoReceiver.receivePhoto(atPath: url.path, width: width, height: height)
    }
  }
}
