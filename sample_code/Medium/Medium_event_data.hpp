#pragma once

#include <string>

namespace espp::state_machine::Medium {

namespace detail {
inline std::string field_to_string(bool v) { return v ? "true" : "false"; }
inline std::string field_to_string(const std::string &v) { return "\"" + v + "\""; }
template <typename T>
inline std::string field_to_string(const T &v) {
  using std::to_string;
  return to_string(v);
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

}; // namespace espp::state_machine::Medium
