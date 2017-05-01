#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_system.h"

// include the task components
<%
if (model['Task_list']) {
  model['Task_list'].map(function(task) {
-%>
#include "<%- task.sanitizedName %>.hpp"
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
  xTaskCreate(&<%- task.sanitizedName %>::taskFunction, // function the task runs
	      "taskFunction_<%- taskCounter %>", // name of the task (should be short)
	      <%- task['Stack Size'] %>, // stack size for the task
	      NULL, // parameters to task
	      <%- task.Priority %>, // priority of the task (higher -> higher priority)
	      NULL // returned task object (don't care about storing it)
	      );
<%
    taskCounter++;
  });
}
-%>
}

