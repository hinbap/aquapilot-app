#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface PhotoReceiver : NSObject
+ (nullable NSDictionary<NSString *, NSNumber *> *)receivePhotoAtPath:(NSString *)path
                                                              width:(NSInteger)width
                                                             height:(NSInteger)height
                                                              error:(NSError * _Nullable * _Nullable)error;
@end

NS_ASSUME_NONNULL_END
