#import "PhotoReceiver.h"
#include "../../../cpp/image_processor.hpp"
#include <limits>
#include <stdexcept>

@implementation PhotoReceiver
+ (NSDictionary<NSString *, NSNumber *> *)receivePhotoAtPath:(NSString *)path
                                                     width:(NSInteger)width
                                                    height:(NSInteger)height
                                                     error:(NSError **)error {
  try {
    if (width <= 0 || height <= 0 || width > std::numeric_limits<int>::max() ||
        height > std::numeric_limits<int>::max()) {
      throw std::invalid_argument("Photo dimensions are invalid.");
    }
    const auto photo = aquapilot::receive_photo(path.fileSystemRepresentation,
                                               static_cast<int>(width), static_cast<int>(height));
    return @{@"byteCount": @(photo.bytes.size()), @"width": @(photo.width), @"height": @(photo.height)};
  } catch (const std::exception& exception) {
    if (error != nullptr) {
      *error = [NSError errorWithDomain:@"OpencvBridge" code:2 userInfo:@{
        NSLocalizedDescriptionKey: [NSString stringWithUTF8String:exception.what()]
      }];
    }
    return nil;
  }
}
@end
