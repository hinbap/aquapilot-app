cmake_minimum_required(VERSION 3.22.1)
project(aquapilot_photo LANGUAGES CXX)

add_library(aquapilot_photo SHARED
  src/main/cpp/photo_receiver.cpp
  ../../../cpp/image_processor.cpp
)
target_include_directories(aquapilot_photo PRIVATE ../../../cpp)
target_compile_features(aquapilot_photo PRIVATE cxx_std_17)
target_link_options(aquapilot_photo PRIVATE "-Wl,-z,max-page-size=16384")
