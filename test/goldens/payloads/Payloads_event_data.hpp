#pragma once

#include <string>

// User Includes for the HFSM -- payload field types may need them
//::::/p/m::::Includes::::
#include <cstdio>

namespace state_machine::Payloads {

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

struct BUTTON_PRESSEventData {
  // which button was pressed
  int button_id{ 3 };
  bool long_press{ false };
};
inline std::string event_data_to_string(const BUTTON_PRESSEventData &data) {
  return std::string("{ ") +
    "button_id=" + detail::field_to_string(data.button_id) + ", " +
    "long_press=" + detail::field_to_string(data.long_press) +
    " }";
}
struct CALIBRATEEventData {
  float offset{ 1.5f };
};
inline std::string event_data_to_string(const CALIBRATEEventData &data) {
  return std::string("{ ") +
    "offset=" + detail::field_to_string(data.offset) +
    " }";
}
struct FINISHEventData {
};
inline std::string event_data_to_string(const FINISHEventData &) {
  return "";
}
struct SET_SPEEDEventData {
  float speed{ 2.5f };
};
inline std::string event_data_to_string(const SET_SPEEDEventData &data) {
  return std::string("{ ") +
    "speed=" + detail::field_to_string(data.speed) +
    " }";
}
struct STOPEventData {
};
inline std::string event_data_to_string(const STOPEventData &) {
  return "";
}

}; // namespace state_machine::Payloads
