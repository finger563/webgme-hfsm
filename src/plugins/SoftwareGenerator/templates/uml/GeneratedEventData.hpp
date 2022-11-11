#pragma once

namespace StateMachine {
namespace {{{sanitizedName}}} {

{{#each eventNames}}
struct {{{.}}}EventData {
};
{{/each}}

}; // namespace {{{sanitizedName}}}
}; // namespace StateMachine
