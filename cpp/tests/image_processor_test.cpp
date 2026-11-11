#include "../image_processor.hpp"

#include <cassert>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <stdexcept>

template <typename F>
void expect_failure(F action) {
  bool failed = false;
  try {
    action();
  } catch (const std::exception&) {
    failed = true;
  }
  assert(failed);
}

int main(int argc, char** argv) {
  if (argc != 2) throw std::invalid_argument("Pass a temporary test directory.");
  const std::filesystem::path directory(argv[1]);
  const auto path = directory / "photo with spaces.jpg";
  // Encoded bytes can contain NULs: preserve every byte without treating the image as text.
  const std::vector<std::uint8_t> bytes{0xff, 0xd8, 0x00, 0x01, 0x80, 0xff, 0xd9};
  {
    std::ofstream output(path, std::ios::binary);
    output.write(reinterpret_cast<const char*>(bytes.data()), bytes.size());
  }

  const auto photo = aquapilot::receive_photo(path.string(), 1920, 1080);
  assert(photo.bytes == bytes);
  assert(photo.width == 1920 && photo.height == 1080);
  expect_failure([&] { aquapilot::receive_photo("", 1920, 1080); });
  expect_failure([&] { aquapilot::receive_photo(path.string(), 0, 1080); });
  expect_failure([&] { aquapilot::receive_photo(path.string(), 1920, -1); });
  expect_failure([&] { aquapilot::receive_photo((directory / "missing.jpg").string(), 1, 1); });

  { std::ofstream empty(path, std::ios::binary | std::ios::trunc); }
  expect_failure([&] { aquapilot::receive_photo(path.string(), 1, 1); });
  std::filesystem::resize_file(path, 64 * 1024 * 1024 + 1);
  expect_failure([&] { aquapilot::receive_photo(path.string(), 1, 1); });
  std::filesystem::remove(path);

  std::cout << "Photo receiver: byte integrity, dimensions, and invalid-file checks passed.\n";
}
