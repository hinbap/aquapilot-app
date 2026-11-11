#include "image_processor.hpp"

#include <fstream>
#include <stdexcept>

namespace aquapilot {

Photo receive_photo(const std::string& path, int width, int height) {
  if (path.empty() || width <= 0 || height <= 0) {
    throw std::invalid_argument("A photo path and positive dimensions are required.");
  }

  std::ifstream input(path, std::ios::binary | std::ios::ate);
  if (!input) {
    throw std::runtime_error("The photo file could not be opened.");
  }

  const auto size = input.tellg();
  constexpr std::streamoff max_photo_bytes = 64 * 1024 * 1024;
  if (size <= 0 || size > max_photo_bytes) {
    throw std::runtime_error("The photo file is empty or exceeds 64 MB.");
  }

  Photo photo{std::vector<std::uint8_t>(static_cast<std::size_t>(size)), width, height};
  input.seekg(0);
  if (!input.read(reinterpret_cast<char*>(photo.bytes.data()), static_cast<std::streamsize>(size))) {
    throw std::runtime_error("The photo file could not be read completely.");
  }

  // The photo has reached C++. Add image processing here when it is implemented.
  // For now, return the received bytes and dimensions to the native bridge.
  return photo;
}

}  // namespace aquapilot
