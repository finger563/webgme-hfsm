/* ==========================================================================
 * Bluegiga BLE C SDK project file - BLE project callback stubs
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

#include <blestack/blestack.h>
#include <blestack/gap.h>
#include <blestack/hw.h>
#include <blestack/dma.h>
#include "ble.h"



void gatt_user_read_request_callback(uint8 connection, uint16 handle,uint16 offset,uint8 maxlen)
{

}

void gatt_read_multiple_callback(uint8 connection, uint8*data,uint8 len)
{

}

void gatt_indication_callback(uint8 connection, uint8 ind)
{

}







void smp_passkey_request_callback(uint8 connection)
{

}

void smp_passkey_display_callback(uint8 connection, uint32 passkey)
{

}

void smp_bonding_success(uint8 connection, uint8 bond_handle)
{

}

void smp_bonding_timeout(uint8 connection)
{

}


void gatt_timeout_callback(uint8 connection)
{

}



void connection_version_callback(uint8 conn, uint8 versnr,uint16 compid,uint16 subversnro)
{

}

void connection_features_callback(uint8 conn, uint8 * features)
{

}





void connection_update_callback(uint8 conn)
{

}

// implemented in main.c
/*
void connection_disconnect_callback(uint8 conn,uint8 reason)
{

}
*/



void connection_evt_status_change(uint8 conn,uint8 evt_flags)
{

}

void gatt_attribute_status_changed(uint16 handle, uint8 flags)
{

}

uint8 sleep_can_sleep_callback()
{
    // always allow sleep
    return 1;
}
