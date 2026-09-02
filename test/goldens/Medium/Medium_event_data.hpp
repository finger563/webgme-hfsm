#pragma once

#include <string>

// User Includes for the HFSM -- payload field types may need them
//::::/o::::Includes::::


namespace state_machine::Medium {

namespace detail {
namespace fallback {
using std::to_string;
// picked when to_string(v) is well-formed (std:: or ADL)
template <typename T>
auto field_str(const T &v, int) -> decltype(to_string(v)) {
  return to_string(v);
}
// fallback for field types with no to_string (containers, user
// types, ...): payloads still work, they just print a placeholder
template <typename T>
std::string field_str(const T &, long) {
  return "<?>";
}
} // namespace fallback
inline std::string field_to_string(bool v) { return v ? "true" : "false"; }
inline std::string field_to_string(const std::string &v) { return "\"" + v + "\""; }
template <typename T>
inline std::string field_to_string(const T &v) {
  return fallback::field_str(v, 0);
}
} // namespace detail

struct EVENT1EventData {
};
inline std::string event_data_to_string(const EVENT1EventData &) {
  return "";
}
struct EVENT2EventData {
};
inline std::string event_data_to_string(const EVENT2EventData &) {
  return "";
}
struct EVENT3EventData {
};
inline std::string event_data_to_string(const EVENT3EventData &) {
  return "";
}
struct EVENT4EventData {
};
inline std::string event_data_to_string(const EVENT4EventData &) {
  return "";
}

}; // namespace state_machine::Medium
