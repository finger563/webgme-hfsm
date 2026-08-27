#pragma once

#include <string>

// User Includes for the HFSM -- payload field types may need them
//::::{{{path}}}::::Includes::::
{{{ Includes }}}

namespace {{{namespace}}}::{{{sanitizedName}}} {

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

{{#each events}}
struct {{{name}}}EventData {
{{#each fields}}
{{#if description}}
  // {{{description}}}
{{/if}}
{{#if default}}
  {{{type}}} {{{name}}}{ {{{default}}} };
{{else}}
  {{{type}}} {{{name}}}{};
{{/if}}
{{/each}}
};
{{#if hasData}}
inline std::string event_data_to_string(const {{{name}}}EventData &data) {
  return std::string("{ ") +
{{#each fields}}
    "{{{name}}}=" + detail::field_to_string(data.{{{name}}}) +{{#unless @last}} ", " +{{/unless}}
{{/each}}
    " }";
}
{{else}}
inline std::string event_data_to_string(const {{{name}}}EventData &) {
  return "";
}
{{/if}}
{{/each}}

}; // namespace {{{namespace}}}::{{{sanitizedName}}}
