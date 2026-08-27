#pragma once

#include <string>

namespace espp::state_machine::Complex {

namespace detail {
inline std::string field_to_string(bool v) { return v ? "true" : "false"; }
inline std::string field_to_string(const std::string &v) { return "\"" + v + "\""; }
template <typename T>
inline std::string field_to_string(const T &v) {
  using std::to_string;
  return to_string(v);
}
} // namespace detail

struct ENDEVENTEventData {
};
inline std::string event_data_to_string(const ENDEVENTEventData &) {
  return "";
}
struct EVENT1EventData {
  int last_time{ 0 };
};
inline std::string event_data_to_string(const EVENT1EventData &data) {
  return std::string("{ ") +
    "last_time=" + detail::field_to_string(data.last_time) +
    " }";
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

}; // namespace espp::state_machine::Complex
