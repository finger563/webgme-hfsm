#pragma once

#include <string>

// User Includes for the HFSM -- payload field types may need them
//::::/p/m::::Includes::::
#include <cstdio>

namespace state_machine::Features {

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

struct BACKEventData {
};
inline std::string event_data_to_string(const BACKEventData &) {
  return "";
}
struct CHOOSEEventData {
};
inline std::string event_data_to_string(const CHOOSEEventData &) {
  return "";
}
struct FINISHEventData {
};
inline std::string event_data_to_string(const FINISHEventData &) {
  return "";
}
struct GO_DEEPEventData {
};
inline std::string event_data_to_string(const GO_DEEPEventData &) {
  return "";
}
struct GO_HISTEventData {
};
inline std::string event_data_to_string(const GO_HISTEventData &) {
  return "";
}
struct LOCAL_GOEventData {
};
inline std::string event_data_to_string(const LOCAL_GOEventData &) {
  return "";
}
struct NEXTEventData {
};
inline std::string event_data_to_string(const NEXTEventData &) {
  return "";
}
struct TOGGLEEventData {
};
inline std::string event_data_to_string(const TOGGLEEventData &) {
  return "";
}

}; // namespace state_machine::Features
