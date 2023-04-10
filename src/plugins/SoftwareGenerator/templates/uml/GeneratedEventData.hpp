#pragma once

namespace state_machine {
namespace {{{sanitizedName}}} {

{{#each eventNames}}
struct {{{.}}}EventData {
};
{{/each}}

}; // namespace {{{sanitizedName}}}
}; // namespace state_machine
