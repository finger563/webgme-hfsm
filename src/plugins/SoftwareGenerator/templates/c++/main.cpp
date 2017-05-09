#include "sdkconfig.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/timers.h"
#include "esp_system.h"

#define MS_TO_TICKS( xTimeInMs ) (uint32_t)( ( ( TickType_t ) xTimeInMs * configTICK_RATE_HZ ) / ( TickType_t ) 1000 )

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
// include the timer components
<%
if (model['Timer_list']) {
  model['Timer_list'].map(function(timer) {
-%>
#include "<%- timer.sanitizedName %>.hpp"
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
-%>
  // create the tasks
<%
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
<%
if (model['Timer_list']) {
  var timerCounter = 0;
  var numTimers = model['Timer_list'].length;
-%>
  // variables to store timer handles
  TimerHandle_t xTimers [ <%- numTimers %> ];
<%
  model['Timer_list'].map(function(timer) {
-%>
  // create <%- timer.sanitizedName %>
  <%- timer.sanitizedName %>::timerInitialize();
  xTimers [ <%- timerCounter %> ] = xTimerCreate
    ("timerFunction_<%- timerCounter %>", // name of the timer (should be short)
     MS_TO_TICKS( <%- stateDelay(timer.initState['Timer Period']) %> ), // period of the timer in ticks
     pdTRUE, // auto-reload the timer function
     ( void * ) 0, // id of the timer (passed to the callback function)
     &<%- timer.sanitizedName %>::timerFunction // function the timer runs
     );
<%
    timerCounter++;
  });
-%>
  // start all the timers
  for (int i=0; i < <%- numTimers %>; i++)
    xTimerStart( xTimers[ i ], 0 );
<%
}
-%>
}

