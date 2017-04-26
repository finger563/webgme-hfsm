#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_system.h"

// include library components
<%
if (model['Library Component_list']) {
  model['Library Component_list'].map(function(comp) {
    comp.Includes.split('\n').map(function(inclFileName) {
-%>
#include "<%- inclFileName %>"
<%
    });
  });
}
-%>

// include source components
<%
if (model['Source Component_list']) {
  model['Source Component_list'].map(function(comp) {
-%>
<%
    if (comp.needsExtern) {
-%>
extern "C" {
<%
    }
-%>
#include "<%- comp.includeName %>"
<%
    if (comp.needsExtern) {
-%>
}
<%
    }
-%>
<%
  });
}
-%>

// include the task components
<%
if (model['Task_list']) {
  model['Task_list'].map(function(task) {
-%>
#include "<%- task.taskName %>.hpp"
<%
  });
}
-%>

// now start the tasks that have been defined
extern "C" void app_main(void)
{
<%
if (model['Task_list']) {
  var taskCounter = 0;
  model['Task_list'].map(function(task) {
-%>
  xTaskCreate(&<%- task.taskName %>::taskFunction, "taskFunction_<%- taskCounter %>", 2048, NULL, 5, NULL);
<%
    taskCounter++;
  });
}
-%>
}

