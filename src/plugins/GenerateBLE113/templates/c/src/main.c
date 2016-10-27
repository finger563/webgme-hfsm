/* ==========================================================================
 * Bluegiga BLE C SDK project file - BLE project main template
 * http://www.bluegiga.com/support
 * ==========================================================================
 * This is free software distributed under the terms of the MIT license
 * reproduced below.
 *
 * Copyright (c) 2014 Bluegiga Technologies
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * ========================================================================== */
#define CC2541
#include <blestack/blestack.h>
#include <blestack/gap.h>
#include <blestack/hw.h>
#include <blestack/dma.h>

#include <intrinsics.h>
#include <string.h>
#include <stdio.h>

// Import user libraries here (if any)
<%
if (model.Library_list) {
  model.Library_list.map(function(library) {
-%>
#include "<%- library.name %>.h"
<%
  });
}
-%>

uint32 changeState = 0;
uint32 stateDelay = 0;
<%
for (var i=0; i<model.numHeirarchyLevels; i++) {
-%>
uint8 stateLevel_<%- i %>;
<%
}
-%>

<%
states.map(function(state) {
-%>
const uint8 <%- state.stateName %> = <%- state.stateID %>;
<%
});
-%>
   
void timer_update(uint8 context, uint8 event)
{
<%- model.timerFunc %>
}

void main(void)
{
    ////////////////////////////////////////////////////////////////
    // TODO: MAKE SURE YOU UPDATE THE CONTENT OF THE <address> TAG
    // AND THE <license> TAG FOUND IN THE "/config/license.xml" FILE
    // THAT COMES WITH THIS TEMPLATE.
    //
    // Use the Bluegiga BLE SW Update application and the "Info"
    // button to get the target module's current MAC address and
    // 64-character license key, and copy them into the two tags in
    // this file prior to flashing any firmware built with IAR onto
    // the module; otherwise, you may erase the license key and
    // render the BLE radio inoperable until you obtain a new
    // replacement from Bluegiga support.
    //
    // The project will generate a Pre-build action compiler error
    // if you have not supplied a valid license.
    //
    // Also, if you switch out the target module during development
    // and use a new module, ensure that you update the MAC address
    // and license key at the same time. Each module requires its
    // own MAC address and license key.
    ////////////////////////////////////////////////////////////////
   // CLKCONCMD = (CLKCONCMD & ~(CLKCON_OSC | CLKCON_CLKSPD)) | CLKCON_CLKSPD_32M;
    // Wait until clock source has changed
   // while (CLKCONSTA & CLKCON_OSC);
    // setup configuration, clock, DMA controller, etc.
    blestack_config_init();

    // initialize BLE stack
    blestack_init();
    

    // generated initialization code for the state machine:
    changeState = 0;
    // STATE::<%- model.initState.name %>
<%- model.initStateCode %>
    // execute the init transition for the chart (including user initialization code)
<%- model.initFunc %>  
    // Start the state timer
    task_send_timed(task_id_first_user, 0, 1, <%- parseInt(parseFloat(model.initState.timerPeriod) * 32768.0) %>);
    
    // start advertisement mode for discoverable/connectable
    // gap_set_mode(gap_general_discoverable, gap_undirected_connectable);

    // start main stack loop
    blestack_loop();
}


