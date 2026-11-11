#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace aquapilot {

struct Photo {
  // Encoded image bytes (JPEG from the camera), not decoded pixels.
  std::vector<std::uint8_t> bytes;
  int width;
  int height;
};

// Receives a decoded local filesystem path, not a file:// URI.
// Throws std::exception on invalid metadata, an unreadable file, or an empty file.
Photo receive_photo(const std::string& path, int width, int height);

}  // namespace aquapilot
