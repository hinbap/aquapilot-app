Pod::Spec.new do |s|
  s.name           = 'OpencvBridge'
  s.version        = '1.0.0'
  s.summary        = 'AquaPilot photo bridge'
  s.description    = 'Passes camera photos to the shared C++ photo receiver.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4',
    :tvos => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
  s.public_header_files = 'PhotoReceiver.h'
end
