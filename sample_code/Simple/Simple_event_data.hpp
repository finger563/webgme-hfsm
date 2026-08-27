#pragma once

#include <string>

// User Includes for the HFSM -- payload field types may need them
//::::/9::::Includes::::
#include <vector>

namespace espp::state_machine::Simple {

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

struct INPUTEVENTEventData {
  int button_id{ 12 };
  int press_time_ms{ 100 };
};
inline std::string event_data_to_string(const INPUTEVENTEventData &data) {
  return std::string("{ ") +
    "button_id=" + detail::field_to_string(data.button_id) + ", " +
    "press_time_ms=" + detail::field_to_string(data.press_time_ms) +
    " }";
}
struct TestEventData {
  std::vector<int> val{};
};
inline std::string event_data_to_string(const TestEventData &data) {
  return std::string("{ ") +
    "val=" + detail::field_to_string(data.val) +
    " }";
}

}; // namespace espp::state_machine::Simple
