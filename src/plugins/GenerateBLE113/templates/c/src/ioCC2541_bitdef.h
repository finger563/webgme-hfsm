/******************************************************************************
    Filename: ioCC254x_bitdef.h

    This file contains the bit definitions of registers in CC254x.

    Note: The USB and Radio bit defintions are in seperate headers.

    Copyright 2012 Texas Instruments, Inc.
******************************************************************************/
#ifndef _IOCC254X_BITDEF_H
#define _IOCC254X_BITDEF_H

// BIT definitions.
#define BIT7        0x80
#define BIT6        0x40
#define BIT5        0x20
#define BIT4        0x10
#define BIT3        0x08
#define BIT2        0x04
#define BIT1        0x02
#define BIT0        0x01

#define chip 2541
/*******************************************************************************
 * Memory Control Registers
 */

// MPAGE (0x93) - Memory Page Select

// MEMCTR (0xC7) - Memory Arbiter Control
#define MEMCTR_XMAP                      0x08   // Maps SRAM into the CODE Memory Space, enables code execution from RAM.

// DPH0 (0x83) – Data Pointer-0 High Byte

// DPL0 (0x82) – Data Pointer-0 Low Byte

// DPH1 (0x85) – Data Pointer-1 High Byte

// DPL1 (0x84) – Data Pointer-1 Low Byte

// DPS (0x92) – Data-Pointer Select
#define DPS_DPS                           0x01    // Data pointer selection, DPTR1 when set, DPTR0 when cleared.

// PSW (0xD0) – Program Status Word

// ACC (0xE0) – Accumulator

// B (0xF0) – B Register

// SP (0x81) – Stack Pointer



/*******************************************************************************
 * Interrupt Control Registers
 */

// IEN0 (0xA8) - Interrupt Enable 0 Register - bit accessible SFR register

// IEN1 (0xB8) - Interrupt Enable 1 Register - bit accessible SFR register
#define IEN1_P0IE                         0x20        // Port 0 interrupt enable
#define IEN1_T4IE                         0x10        // Timer 4 interrupt enable
#define IEN1_T3IE                         0x08        // Timer 3 interrupt enable
#define IEN1_T2IE                         0x04        // Timer 2 interrupt enable
#define IEN1_T1IE                         0x02        // Timer 1 interrupt enable
#define IEN1_DMAIE                        0x01        // DMA transfer interrupt enable

// IEN2 (0x9A) - Interrupt Enable 2 Register
#define IEN2_WDTIE                        0x20
#define IEN2_P1IE                         0x10
#if (chip == 2541)              
  #define IEN2_UTX1IE                        0x08     // USART 1 TX interrupt enable
#elif (chip == 2543 || chip == 2545)                  // The chip is defined in the project options. 
  #define IEN2_I2CIE                        0x08      // (not applicable on CC2544)
#endif
#define IEN2_UTX0IE                       0x04
#define IEN2_P2IE                         0x02
#define IEN2_USBIE                        0x02
#define IEN2_RFIE                         0x01

// TCON (0x88) - CPU Interrupt Flag 1 - bit accessible SFR register

// S0CON (0x98) - CPU Interrupt Flag 2 - bit accessible SFR register

// S1CON (0x9B) - CPU Interrupt Flag 3
#define S1CON_RFIF_1                      0x02
#define S1CON_RFIF_0                      0x01

// IRCON (0xC0) - CPU Interrupt Flag 4 - bit accessible SFR register

// IRCON2 (0xE8) - CPU Interrupt Flag 5 - bit accessible SFR register

// IP1 (0xB9) - Interrupt Priority 1
#define IP1_IPG5                          0x20
#define IP1_IPG4                          0x10
#define IP1_IPG3                          0x08
#define IP1_IPG2                          0x04
#define IP1_IPG1                          0x02
#define IP1_IPG0                          0x01

// IP0 (0xA9) - Interrupt Priority 0
#define IP0_IPG5                          0x20
#define IP0_IPG4                          0x10
#define IP0_IPG3                          0x08
#define IP0_IPG2                          0x04
#define IP0_IPG1                          0x02
#define IP0_IPG0                          0x01


/*******************************************************************************
 * Power Management and Clocks
 */

// SRCRC (0x6262) – Sleep Reset CRC (not available on the CC2544)
#define SRCRC_FORCE_RESET                 0x20          // Force watchdog reset
#define SRCRC_CRC_RESULT                  (0x03 << 2)   // CRC value, bit mask
  #define SRCRC_CRC_RESULT_PASS             (0x00 << 2)   // CRC of retained registers passed
  #define SRCRC_CRC_RESULT_LOW              (0x01 << 2)   // Low CRC value failed
  #define SRCRC_CRC_RESULT_HIGH             (0x02 << 2)   // High CRC value failed
  #define SRCRC_CRC_RESULT_BOTH             (0x03 << 2)   // Both CRC values failed
#define SRCRC_CRC_RESET_EN                0x01          // CRC != 00 reset enable, after wakeup from PM2/PM3.

// PCON (0x87) - Power Mode Control
#define PCON_IDLE                         0x01

// SLEEPCMD (0xBE) - Sleep Mode Control
#define OSC32K_CALDIS                     0x80
#define SLEEPCMD_MODE                     (0x03)      // Power mode bit mask
  #define SLEEPCMD_MODE_IDLE                (0x00)
  #define SLEEPCMD_MODE_PM1                 (0x01)  
  #if (chip == 2541 || chip == 2543 || chip == 2545)  // (not applicable on CC2544)
    #define SLEEPCMD_MODE_PM2                 (0x02)  
    #define SLEEPCMD_MODE_PM3                 (0x03)
  #endif

// SLEEPSTA (0x9D) – Sleep-Mode Control Status
#define SLEEPSTA_CLK32K_CALDIS            0x80          // Calibration disable status
#define SLEEPSTA_RST                      (0x03 << 3)   // Cause of last reset, bit mask
  #define SLEEPSTA_RST_POR_BOD              (0x00 << 3)   // Power-on reset, or brownout detection
  #define SLEEPSTA_RST_EXT                  (0x01 << 3)   // External reset
  #define SLEEPSTA_RST_WDT                  (0x02 << 3)   // Watchdog Timer reset
  #define SLEEPSTA_RST_CLK_LOSS             (0x03 << 3)   // Clock loss reset
#define SLEEPSTA_CLK32K                   0x01          // 32 kHz clock signal

// STLOAD (0xAD) – Sleep Timer Load Status
#define STLOAD_LDRDY                      0x01

// CLKCONCMD (0xC6) – Clock Control Command
// and CLKCONSTA (0x9E) – Clock Control Status
#define CLKCON_OSC32K                     0x80          // 32 kHz clock source select/status
#define CLKCON_OSC                        0x40          // system clock source select/status
#define CLKCON_TICKSPD                    (0x07 << 3)   // bit mask, global timer tick speed divider
  #define CLKCON_TICKSPD_32M                (0x00 << 3)
  #define CLKCON_TICKSPD_16M                (0x01 << 3)
  #define CLKCON_TICKSPD_8M                 (0x02 << 3)
  #define CLKCON_TICKSPD_4M                 (0x03 << 3)
  #define CLKCON_TICKSPD_2M                 (0x04 << 3)
  #define CLKCON_TICKSPD_1M                 (0x05 << 3)
  #define CLKCON_TICKSPD_500K               (0x06 << 3)
  #define CLKCON_TICKSPD_250K               (0x07 << 3)
#define CLKCON_CLKSPD                     (0x07)        // bit mask for the clock speed division
  #define CLKCON_CLKSPD_32M                 (0x00)
  #define CLKCON_CLKSPD_16M                 (0x01)
  #define CLKCON_CLKSPD_8M                  (0x02)
  #define CLKCON_CLKSPD_4M                  (0x03)
  #define CLKCON_CLKSPD_2M                  (0x04)
  #define CLKCON_CLKSPD_1M                  (0x05)
  #define CLKCON_CLKSPD_500K                (0x06)
  #define CLKCON_CLKSPD_250K                (0x07)

// CLD (0x6290) – Clock-Loss Detection
#define CLD_EN                            0x01          // Clock-loss detector enable


/*******************************************************************************
 *  Flash Controller
 */

// FCTL (0x6270) - Flash Control
#define FCTL_BUSY                         0x80
#define FCTL_FULL                         0x40
#define FCTL_ABORT                        0x20
#define FCTL_CM                           (0x03 << 2)   // cache mode bit mask
  #define FCTL_CM_DIS                       (0x00 << 2)   // cache mode disabled
  #define FCTL_CM_EN                        (0x01 << 2)   // cache mode enabled
  #define FCTL_CM_PREFETCH                  (0x02 << 2)   // cache mode enabled, prefetch mode
  #define FCTL_CM_REALTIME                  (0x03 << 2)   // cache mode enabled, real-time mode
#define FCTL_WRITE                        0x02
#define FCTL_ERASE                        0x01


// FWDATA (0xAF) - Flash Write Data

// FADDRH (0xAD) - Flash Address High Byte

// FADDRL (0xAC) - Flash Address Low Byte


/*******************************************************************************
 * I/O Ports
 */
// *************************** CC2541 ********************************
#if (chip == 2541)

  // P0 (0x80) - Port 0 - bit accessible SFR register

  // P1 (0x90) - Port 1 - bit accessible SFR register 

  // P2 (0xA0) - Port 2 - bit accessible SFR register

  // PERCFG (0xF1) - Peripheral Control
  #define PERCFG_T1CFG                  0x40               // Timer 1 I/O location
  #define PERCFG_T3CFG                  0x20               // Timer 3 I/O location
  #define PERCFG_T4CFG                  0x10               // Timer 4 I/O location
  #define PERCFG_U1CFG                  0x02               // USART 1 I/O location
  #define PERCFG_U0CFG                  0x01               // USART 0 I/O location
    #define PERCFG_U0CFG_ALT1                 0x00          // Alternative 1 location
    #define PERCFG_U0CFG_ALT2                 0x01          // Alternative 2 location

  // APCFG (0xF2) - Analog Peripheral I/O Configuration
  #define APCFG_APCFG7                      0x80        // When set, analog I/O on P0_7 is enabled
  #define APCFG_APCFG6                      0x40
  #define APCFG_APCFG5                      0x20
  #define APCFG_APCFG4                      0x10
  #define APCFG_APCFG3                      0x08
  #define APCFG_APCFG2                      0x04
  #define APCFG_APCFG1                      0x02
  #define APCFG_APCFG0                      0x01

  // P0SEL (0xF3) – P0 Function Select
  #define P0SEL_SELP0_7                     0x80        // Pin function as peripheral I/O when set
  #define P0SEL_SELP0_6                     0x40
  #define P0SEL_SELP0_5                     0x20
  #define P0SEL_SELP0_4                     0x10
  #define P0SEL_SELP0_3                     0x08
  #define P0SEL_SELP0_2                     0x04
  #define P0SEL_SELP0_1                     0x02
  #define P0SEL_SELP0_0                     0x01

  // P1SEL (0xF4) – P1 Function Select
  #define P1SEL_SELP1_7                     0x80        // Pin function as peripheral I/O when set
  #define P1SEL_SELP1_6                     0x40
  #define P1SEL_SELP1_5                     0x20
  #define P1SEL_SELP1_4                     0x10
  #define P1SEL_SELP1_3                     0x08
  #define P1SEL_SELP1_2                     0x04
  #define P1SEL_SELP1_1                     0x02
  #define P1SEL_SELP1_0                     0x01

  // P2SEL (0xF5) – Port 2 Function Select and Port 1 Peripheral Priority Control
  #define P2SEL_PRI3P1                      0x40        //  When set USART 1 has priotity over USART 0.
  #define P2SEL_PRI2P1                      0x20        //  When set Timer 3 has priotity over USART 1.
  #define P2SEL_PRI1P1                      0x10        //  When set Timer 4 has priotity over Timer 1.
  #define P2SEL_PRI0P1                      0x08        //  When set Timer 1 has priotity over USART 0.
  #define P2SEL_SELP2_4                     0x04        //  P2.4 function select
  #define P2SEL_SELP2_3                     0x02        //  P2.3 function select
  #define P2SEL_SELP2_0                     0x01        //  P2.0 function select

  // P1INP (0xF6) – Port 1 Input Mode
  #define P1INP_MDP1                        0xFC      // P1.7 to P1.2 I/O input mode bit mask
  #define P1INP_MDP1_P1_7                   0x80      // When set P1.7 is 3-state, when not set pullup or pulldown (set in P2INP)
  #define P1INP_MDP1_P1_6                   0x40      // When set P1.6 is 3-state, when not set pullup or pulldown (set in P2INP)
  #define P1INP_MDP1_P1_5                   0x20      // When set P1.5 is 3-state, when not set pullup or pulldown (set in P2INP)
  #define P1INP_MDP1_P1_4                   0x10      // When set P1.4 is 3-state, when not set pullup or pulldown (set in P2INP)
  #define P1INP_MDP1_P1_3                   0x08      // When set P1.3 is 3-state, when not set pullup or pulldown (set in P2INP)
  #define P1INP_MDP1_P1_2                   0x04      // When set P1.2 is 3-state, when not set pullup or pulldown (set in P2INP)

  // P2INP (0xF7) – Port 1 Input Mode
  #define P2INP_PDUP2                       0x80      // Port 2 pullup/pulldown select.  1 - pulldown, 0- pullup. 
  #define P2INP_PDUP1                       0x40      // Port 1 pullup/pulldown select.  1 - pulldown, 0- pullup.
  #define P2INP_PDUP0                       0x20      // Port 0 pullup/pulldown select.  1 - pulldown, 0- pullup.
  #define P2INP_MDP2                        0x1F      //  P2.4 to P2.0 I/O input mode bit mask.
  #define P2INP_MDP2_P2_4                   0x10      //  P2.4 pullup/pulldown select.  1 - pulldown, 0- pullup. 
  #define P2INP_MDP2_P2_3                   0x10      //  P2.3 pullup/pulldown select.  1 - pulldown, 0- pullup. 
  #define P2INP_MDP2_P2_2                   0x10      //  P2.2 pullup/pulldown select.  1 - pulldown, 0- pullup. 
  #define P2INP_MDP2_P2_1                   0x10      //  P2.1 pullup/pulldown select.  1 - pulldown, 0- pullup. 
  #define P2INP_MDP2_P2_0                   0x10      //  P2.0 pullup/pulldown select.  1 - pulldown, 0- pullup. 


  // P0IFG (0x89) – Port 0 Interrupt Status Flag

  // P1IFG (0x8A) – Port 1 Interrupt Status Flag

  // P0DIR (0xFD) – Port 0 Direction Control ( P0.7 to P0.0 ).

  // P1DIR (0xFE) – Port 1 Direction Control ( P1.7 to P1.0 ).

  // P2DIR (0xFF) – Port 2 Direction and Port 0 Peripheral Priority Control
  #define P2DIR_PRIP0                       0xC0          // Port 0 peripheral priority control.
    #define P2DIR_PRIP0_USART0                (0x00 << 6) // USART 0 has priority, then USART 1, then Timer 1
    #define P2DIR_PRIP0_USART1                (0x01 << 6) // USART 1 has priority, then USART 0, then Timer 1
    #define P2DIR_PRIP0_T1_0_1                (0x02 << 6) // Timer 1 channels 0-1 has priority, then USART 1, then USART 0, then Timer 1 channels 2-3
    #define P2DIR_PRIP0_T1_2_3                (0x03 << 6) // Timer 1 channels 2-3 has priority, then USART 0, then USART 1, then Timer 1 channels 0-1
  #define P2DIR_DIRP2                       0x1F          // P2.4 to P2.0 I/O direction

  // P0INP (0x8F) – Port 0 Input Mode

  // P2INP (0xF7) – Port 2 Input Mode
  #define P2INP_PDUP2                       0x80        //  Port 2 pullup/pulldown select. When set high -> Pullup.
  #define P2INP_PDUP1                       0x40        //  Port 1 pullup/pulldown select. When set high -> Pullup.
  #define P2INP_PDUP0                       0x20        //  Port 0 pullup/pulldown select. When set high -> Pullup.
  #define P2INP_MDP2                        0x1F        //  P2.4 to P2.0 I/O input mode. When set high -> 3-state.

  // P0IFG (0x89) – Port 0 Interrupt Status Flag

  // P1IFG (0x8A) – Port 1 Interrupt Status Flag
  
  // P2IFG (0x8B) – Port 2 Interrupt Status Flag

  // PICTL (0x8C) - Port Interrupt Control
  #define PICTL_PADSC                       0x80          // Drive strength control for I/O pins in output mode.
  #define PICTL_P2ICON                      0x08          // Port 2, inputs 4 to 0 interrupt configuration. Interrupt on falling edge when set, rising edge when cleared.
  #define PICTL_P1ICONH                     0x04          // Port 1, inputs 7 to 4 interrupt configuration. Interrupt configuration. Interrupt on falling edge when set, rising edge when cleared.
  #define PICTL_P1ICONL                     0x02          // Port 1, inputs 3 to 0 interrupt configuration. Interrupt on falling edge when set, rising edge when cleared.
  #define PICTL_P0ICON                      0x01          // Port 0, inputs 7 to 0 interrupt configuration. Interrupt on falling edge when set, rising edge when cleared.

  // P0IEN (0xAB) – Port 0 Interrupt Mask

  // P1IEN (0x8D) – Port 1 Interrupt Mask

  // P2IEN (0xAC) – Port 2 Interrupt Mask

  // PMUX (0xAE) – Power-Down Signal Mux
  #define PMUX_CKOEN                        0x80            // Clock out enable, the 32 kHz clock.
  #define PMUX_CKOPIN                       (0x07 << 4)     // Selects which pin on Port 0, bit mask.
  #define PMUX_DREGSTA                      0x04            // Digital Regulator Status output enable.
  #define PMUX_DREGSTAPIN                   (0x07)          // Selects which pin on Port 1, bit mask.

  // OBSSEL0 (0x6243) – Observation output control register 0

  // OBSSEL1 (0x6244) – Observation output control register 1

  // OBSSEL2 (0x6245) – Observation output control register 2

  // OBSSEL3 (0x6246) – Observation output control register 3

  // OBSSEL4 (0x6247) – Observation output control register 4

  // OBSSEL5 (0x6248) – Observation output control register 5


// *************************** CC2543 ********************************
#elif (chip == 2543)

  // P0 (0x80) - Port 0 - bit accessible SFR register

  // P1 (0x90) - Port 1 - bit accessible SFR register 

  // P2 (0xA0) - Port 2 - bit accessible SFR register

  // PERCFG (0xF1) - Peripheral Control
  #define PERCFG_PRI0P2                     (0x03 << 6)   // Port 2 peripheral priority control bit mask
    #define PERCFG_PRI0P2_USART0              (0x00 << 6)   // USART0 has priority, then Timer 1, then Timer 4
    #define PERCFG_PRI0P2_T1                  (0x01 << 6)   // Timer 1 has priority, then Timer 4, then USART0
    #define PERCFG_PRI0P2_T4                  (0x02 << 6)   // Timer 4 has priority, then Timer 1, then USART0
  #define PERCFG_T1CFG                      0x20
  #define PERCFG_T3CFG                      0x10
  #define PERCFG_T4CFG                      0x08
  #define PERCFG_I2CCFG                     0x04
  #define PERCFG_U0CFG                      (0x03)        // USART0 I/O location bit mask
    #define PERCFG_U0CFG_ALT1                 (0x00)        // Alternative 1 location
    #define PERCFG_U0CFG_ALT2                 (0x01)        // Alternative 2 location
    #define PERCFG_U0CFG_ALT3                 (0x02)        // Alternative 3 location
  
  // APCFG (0xF2) - Analog Peripheral I/O Configuration
  #define APCFG_APCFG7                      0x80        // When set, analog I/O on P0_7 is enabled
  #define APCFG_APCFG6                      0x40
  #define APCFG_APCFG5                      0x20
  #define APCFG_APCFG4                      0x10
  #define APCFG_APCFG3                      0x08
  #define APCFG_APCFG2                      0x04
  #define APCFG_APCFG1                      0x02
  #define APCFG_APCFG0                      0x01

  // P0SEL (0xF3) – P0 Function Select
  #define P0SEL_SELP0_7                     0x80        // Pin function as peripheral I/O when set
  #define P0SEL_SELP0_6                     0x40
  #define P0SEL_SELP0_5                     0x20
  #define P0SEL_SELP0_4                     0x10
  #define P0SEL_SELP0_3                     0x08
  #define P0SEL_SELP0_2                     0x04
  #define P0SEL_SELP0_1                     0x02
  #define P0SEL_SELP0_0                     0x01

  // P1SEL (0xF4) – P1 Function Select
  #define P1SEL_SELP1_4                     0x10        // Pin function as peripheral I/O when set
  #define P1SEL_SELP1_3                     0x08
  #define P1SEL_SELP1_2                     0x04
  #define P1SEL_SELP1_1                     0x02
  #define P1SEL_SELP1_0                     0x01

  // P2SEL (0xF5) – P2 Function Select
  #define P2SEL_SELP2_2                     0x04        // Pin function as peripheral I/O when set
  #define P2SEL_SELP2_1                     0x02
  #define P2SEL_SELP2_0                     0x01
  
  // PPRI (0xFB) - Peripheral Priority Setup
  #define PPRI_PRI_P1_2                     0x80          // Port 1 pin 2. When set Timer 3 has priotity over Timer 1 
  #define PPRI_PRI_P1_1                     (0x03 << 5)   // Port 1 pin 1. Peripheral priority bit mask 
    #define PPRI_PRI_P1_1_T1                  (0x00 << 5)   // Timer 1 has priority, then Timer 3, then Timer 4
    #define PPRI_PRI_P1_1_T3                  (0x01 << 5)   // Timer 3 has priority, then Timer 1, then Timer 4
    #define PPRI_PRI_P1_1_T4                  (0x02 << 5)   // Timer 4 has priority, then Timer 1, then Timer 3
  #define PPRI_PRI_P1_0                     (0x03 << 3)   // Port 1 pin 0. Peripheral priority bit mask
    #define PPRI_PRI_P1_0_T1                  (0x00 << 3)   // Timer 1 has priority, then Timer 3, then Timer 4
    #define PPRI_PRI_P1_0_T3                  (0x01 << 3)   // Timer 3 has priority, then Timer 1, then Timer 4
    #define PPRI_PRI_P1_0_T4                  (0x02 << 3)   // Timer 4 has priority, then Timer 1, then Timer 3
  #define PPRI_PRI0P1                       0x04          // Port 1. When set Timer 1 has priority over USART0
  #define PPRI_PRI1P0                       0x02          // Port 0. When set Timer 1 has priority over I2C
  #define PPRI_PRI0P0                       0x01          // Port 0. When set Timer 1 has priority over USART0

  // P0DIR (0xFD) – Port 0 Direction Control

  // P1DIR (0xFE) – Port 1 Direction Control

  // P2DIR (0xFF) – Port 2 Direction Control

  // P0INP (0x8F) – Port 0 Input Mode

  // P1INP (0xF6) – Port 1 Input Mode

  // P2INP (0xF7) – Port 2 Input Mode

  // PPULL (0xF8) – Port Pullup/Pulldown Control
  #define PPULL_PDUP2L                      0x10          // P2_[2:0] pull direction, when set pulls down
  #define PPULL_PDUP1H                      0x08          // P1_4 pull direction
  #define PPULL_PDUP1L                      0x04          // P1_[3:0] pull direction
  #define PPULL_PDUP0H                      0x02          // P0_[7:4] pull direction
  #define PPULL_PDUP0L                      0x01          // P0_[3:0] pull direction

  // P0IFG (0x89) – Port 0 Interrupt Status Flag

  // P1IFG (0x8A) – Port 1 Interrupt Status Flag
  
  // P2IFG (0x8B) – Port 2 Interrupt Status Flag

  // PICTL (0x8C) - Port Interrupt Control
  #define PICTL_PADSC                       0x40          // Drive strength
  #define PICTL_P2ICONL                     0x10          // P2_[2:0] interrupt on falling edge when set, rising edge when cleared.
  #define PICTL_P1ICONH                     0x08          // P1_4    
  #define PICTL_P1ICONL                     0x04          // P1_[3:0]
  #define PICTL_P0ICONH                     0x02          // P0_[7:4]
  #define PICTL_P0ICONL                     0x01          // P0_[3:0]

  // P0IEN (0xAB) – Port 0 Interrupt Mask

  // P1IEN (0x8D) – Port 1 Interrupt Mask

  // P2IEN (0xAC) – Port 2 Interrupt Mask

  // PMUX (0xAE) – Power-Down Signal Mux
  #define PMUX_CKOEN                        0x80            // Clock out enable, the 32 kHz clock
  #define PMUX_CKOPIN                       (0x07 << 4)     // Selects which pin on Port 0, bit mask
  #define PMUX_DREGSTA                      0x04            // Digital Regulator Status output enable
  #define PMUX_DREGSTAPIN                   (0x07)          // Selects which pin on Port 1, bit mask

  // OBSSEL0 (0x6243) – Observation output control register 0

  // OBSSEL1 (0x6244) – Observation output control register 1

  // OBSSEL2 (0x6245) – Observation output control register 2

  // OBSSEL3 (0x6246) – Observation output control register 3

  // OBSSEL4 (0x6247) – Observation output control register 4

  // OBSSEL5 (0x6248) – Observation output control register 5  


// *************************** CC2544 ********************************
#elif (chip == 2544)  

  // P0 (0x80) – Port 0

  // P1 (0x90) – Port 1

  // P0SEL0 (0xF3) – P0 Function Select
  #define P0SEL0_SELP0_1                  0xF0 
  #define P0SEL0_SELP0_0                  0x0F 

  // P0SEL1 (0xF4) – P0 Function Select
  #define P0SEL1_SELP0_3                  0xF0 
  #define P0SEL1_SELP0_2                  0x0F 

  // P1SEL0 (0xF5) – P1 Function Select
  #define P1SEL0_SELP1_1                  0xF0 
  #define P1SEL0_SELP1_0                  0x0F 

  // P1SEL1 (0xF6) – P1 Function Select
  #define P1SEL1_SELP1_3                  0xF0 
  #define P1SEL1_SELP1_2                  0x0F 

  // PDIR (0xFD) – Port Direction Control
  #define PDIR_DIRP1_3                  0x80 
  #define PDIR_DIRP1_2                  0x40 
  #define PDIR_DIRP1_1                  0x20 
  #define PDIR_DIRP1_0                  0x10 
  #define PDIR_DIRP0_3                  0x08 
  #define PDIR_DIRP0_2                  0x04 
  #define PDIR_DIRP0_1                  0x02 
  #define PDIR_DIRP0_0                  0x01 

  // PINP (0x8F) – Port Input Mode
  #define PINP_MDP1_3                   0x80
  #define PINP_MDP1_2                   0x40
  #define PINP_MDP0_3                   0x08
  #define PINP_MDP0_2                   0x04
  #define PINP_MDP0_1                   0x02
  #define PINP_MDP0_0                   0x01

  // PPULL (0xF7) – Port Pullup/Pulldown Control
  #define PPULL_PDUP1_3                     0x80
  #define PPULL_PDUP1_2                     0x40
  #define PPULL_PADSC                       0x20
  #define PPULL_PDUP0_3                     0x08
  #define PPULL_PDUP0_2                     0x04
  #define PPULL_PDUP0_1                     0x02
  #define PPULL_PDUP0_0                     0x01

  // P0IFG (0x89) – Port 0 Interrupt Status Flag
  
  // P1IFG (0x8A) – Port 1 Interrupt Status Flag

  // P2IFG (0x8B) – USB D+ Interrupt Status Flag

  // PICTL (0x8C) - Port Interrupt Control
  #define PICTL_P1ICON_3                    0x80
  #define PICTL_P1ICON_2                    0x40
  #define PICTL_P1ICON_1                    0x20
  #define PICTL_P1ICON_0                    0x10
  #define PICTL_P0ICON_3                    0x08
  #define PICTL_P0ICON_2                    0x04
  #define PICTL_P0ICON_1                    0x02
  #define PICTL_P0ICON_0                    0x01

  // P0IEN (0xAB) – Port 0 Interrupt mask

  // P1IEN (0x8D) – Port 1 Interrupt mask

  // P2IEN (0xAC) – USB D+ Interrupt mask

  // OBSSEL0 (0x6243) – Observation output control register

  // OBSSEL1 (0x6244) – Observation output control register 1

  // OBSSEL2 (0x6245) – Observation output control register 2

  // OBSSEL3 (0x6246) – Observation output control register

  // OBSSEL4 (0x6247) – Observation output control register

  // OBSSEL5 (0x6248) – Observation output control register 5


// *************************** CC2545 ********************************
#elif (chip == 2545)     

  // P0 (0x80) - Port 0 - bit accessible SFR register

  // P1 (0x90) - Port 1 - bit accessible SFR register 

  // P2 (0xA0) - Port 2 - bit accessible SFR register

  // P3 (0xB0) – Port 3 - bit accessible SFR register

  // PERCFG (0xF1) - Peripheral Control
  #define PERCFG_T1CFG                      0x20
  #define PERCFG_T3CFG                      0x10
  #define PERCFG_T4CFG                      0x08
  #define PERCFG_I2CCFG                     0x04
  #define PERCFG_U0CFG                      (0x03)        // USART0 I/O location bit mask
    #define PERCFG_U0CFG_ALT1                 (0x00)        // Alternative 1 location
    #define PERCFG_U0CFG_ALT2                 (0x01)        // Alternative 2 location
    #define PERCFG_U0CFG_ALT3                 (0x02)        // Alternative 3 location
  
  // APCFG (0xF2) - Analog Peripheral I/O Configuration
  #define APCFG_APCFG7                      0x80        // When set, analog I/O on P0_7 is enabled
  #define APCFG_APCFG6                      0x40
  #define APCFG_APCFG5                      0x20
  #define APCFG_APCFG4                      0x10
  #define APCFG_APCFG3                      0x08
  #define APCFG_APCFG2                      0x04
  #define APCFG_APCFG1                      0x02
  #define APCFG_APCFG0                      0x01

  // P0SEL (0xF3) – P0 Function Select
  #define P0SEL_SELP0_7                     0x80        // Pin function as peripheral I/O when set
  #define P0SEL_SELP0_6                     0x40
  #define P0SEL_SELP0_5                     0x20
  #define P0SEL_SELP0_4                     0x10
  #define P0SEL_SELP0_3                     0x08
  #define P0SEL_SELP0_2                     0x04
  #define P0SEL_SELP0_1                     0x02
  #define P0SEL_SELP0_0                     0x01

  // P1SEL (0xF4) – P1 Function Select
  #define P1SEL_SELP1_6                     0x40        // Pin function as peripheral I/O when set
  #define P1SEL_SELP1_5                     0x20
  #define P1SEL_SELP1_4                     0x10
  #define P1SEL_SELP1_3                     0x08
  #define P1SEL_SELP1_2                     0x04
  #define P1SEL_SELP1_1                     0x02
  #define P1SEL_SELP1_0                     0x01

  // P2SEL (0xF3) – P0 Function Select
  #define P2SEL_SELP2_7                     0x80        // Pin function as peripheral I/O when set
  #define P2SEL_SELP2_6                     0x40
  #define P2SEL_SELP2_5                     0x20
  #define P2SEL_SELP2_4                     0x10
  #define P2SEL_SELP2_3                     0x08
  #define P2SEL_SELP2_2                     0x04
  #define P2SEL_SELP2_1                     0x02
  #define P2SEL_SELP2_0                     0x01
  
  // PPRI (0xFB) - Peripheral Priority Setup
  #define PPRI_OBSLOC                     0x40          // When set OBSSEL at P3[5:0] has priority OBSSEL at P1[5:0]. 
  #define PPRI_PRI0P2                     0x20          // Port 2 peripheral priority control. When set Timer4 has priority over Timer1. 
  #define PPRI_PRI1P1                     0x18          // Port 1 peripheral priority control.
    #define PPRI_PRI1P1_USART               (0x00 << 3)   // USART0 has priority, then Timer3, then I2C.
    #define PPRI_PRI1P1_T3                  (0x01 << 3)   // Timer3 has priority, then USART0, then I2C.
    #define PPRI_PRI1P1_I2C                 (0x10 << 3)   // I2C has priority, then USART0, then Timer3.
  #define PPRI_PRI0P1                     0x04          // Port 1 peripheral priority control. When set Timer4 has priority over Timer1. 
  #define PPRI_PRI0P0                     0x01          // Port 0. When set Timer 1 has priority over USART0

  // P0DIR (0xFD) – Port 0 Direction Control

  // P1DIR (0xFE) – Port 1 Direction Control

  // P2DIR (0xFF) – Port 2 Direction Control

  // P3DIR (0xF9) – Port 3 Direction Control

  // P0INP (0x8F) – Port 0 Input Mode

  // P1INP (0xF6) – Port 1 Input Mode

  // P2INP (0xF7) – Port 2 Input Mode

  // P3INP (0xFA) – Port 3 Input Mode

  // PPULL (0xF8) – Port Pullup/Pulldown Control
  #define PPULL_PDUP3H                      0x80
  #define PPULL_PDUP3L                      0x40
  #define PPULL_PDUP2H                      0x20          
  #define PPULL_PDUP2L                      0x10          
  #define PPULL_PDUP1H                      0x08          
  #define PPULL_PDUP1L                      0x04          
  #define PPULL_PDUP0H                      0x02          // P0_[7:4] pull direction
  #define PPULL_PDUP0L                      0x01          // P0_[3:0] pull direction

  // P0IFG (0x89) – Port 0 Interrupt Status Flag

  // P1IFG (0x8A) – Port 1 Interrupt Status Flag
  
  // P2IFG (0x8B) – Port 2 Interrupt Status Flag

  // PICTL (0x8C) - Port Interrupt Control
  #define PICTL_PADSC                       0x40          // Drive strength
  #define PICTL_P2ICONH                     0x20
  #define PICTL_P2ICONL                     0x10          // interrupt on falling edge when set, rising edge when cleared.
  #define PICTL_P1ICONH                     0x08             
  #define PICTL_P1ICONL                     0x04         
  #define PICTL_P0ICONH                     0x02          // P0_[7:4]
  #define PICTL_P0ICONL                     0x01          // P0_[3:0]

  // P0IEN (0xAB) – Port 0 Interrupt Mask

  // P1IEN (0x8D) – Port 1 Interrupt Mask

  // P2IEN (0xAC) – Port 2 Interrupt Mask

  // PMUX (0xAE) – Power-Down Signal Mux
  #define PMUX_CKOEN                        0x80            // Clock out enable, the 32 kHz clock
  #define PMUX_CKOPIN                       (0x07 << 4)     // Selects which pin on Port 0, bit mask
  #define PMUX_DREGSTA                      0x04            // Digital Regulator Status output enable
  #define PMUX_DREGSTAPIN                   (0x07)          // Selects which pin on Port 1, bit mask

  // OBSSEL0 (0x6243) – Observation output control register 0

  // OBSSEL1 (0x6244) – Observation output control register 1

  // OBSSEL2 (0x6245) – Observation output control register 2

  // OBSSEL3 (0x6246) – Observation output control register 3

  // OBSSEL4 (0x6247) – Observation output control register 4

  // OBSSEL5 (0x6248) – Observation output control register 5

#endif 


/*******************************************************************************
 * DMA Controller
 */

// DMAARM (0xD6) - DMA Channel Arm
#define DMAARM_ABORT                      0x80
#define DMAARM_DMAARM1                    0x02
#define DMAARM_DMAARM0                    0x01

// DMAREQ (0xD7) - DMA Channel Start Request and Status
#define DMAREQ_DMAREQ1                    0x02
#define DMAREQ_DMAREQ0                    0x01

// DMA0CFGH (0xD5) - DMA Channel 0 Configuration Address High Byte

// DMA0CFGL (0xD4) - DMA Channel 0 Configuration Address Low Byte

// DMA1CFGH (0xD3) - DMA Channel 1 - 4 Configuration Address High Byte

// DMA1CFGL (0xD2) - DMA Channel 1 - 4 Configuration Address Low Byte

// DMAIRQ (0xD1) - DMA Interrupt Flag
#define DMAIRQ_DMAIF1                     0x02
#define DMAIRQ_DMAIF0                     0x01


/*******************************************************************************
 * Timers
 */

// ************************* TIMER 1 *************************

// T1CNTH (0xE3) – Timer 1 Counter High

// T1CNTL (0xE2) – Timer 1 Counter Low

// T1CTL (0xE4) - Timer 1 Control and Status
#define T1CTL_DIV                         (0x0C)        // Bit mask, Timer 1 tick speed divider 
  #define T1CTL_DIV_1                       (0x00 << 2)   // Divide tick frequency by 1
  #define T1CTL_DIV_8                       (0x01 << 2)   // Divide tick frequency by 8
  #define T1CTL_DIV_32                      (0x02 << 2)   // Divide tick frequency by 32
  #define T1CTL_DIV_128                     (0x03 << 2)   // Divide tick frequency by 128
#define T1CTL_MODE                        (0x03)        // Timer 1 mode select. The timer operating mode is selected as follows:
  #define T1CTL_MODE_SUSPEND                (0x00)        // Operation is suspended.
  #define T1CTL_MODE_FREERUN                (0x01)        // Free-running, repeatedly count from 0x0000 to 0xFFFF.
  #define T1CTL_MODE_MODULO                 (0x02)        // Modulo, repeatedly count from 0x0000 to T1CC0.
  #define T1CTL_MODE_UPDOWN                 (0x03)        // Up/down, repeatedly count from 0x0000 to T1CC0 and from T1CC0 down to 0x0000.

// T1STAT (0xAF) - Timer 1 Status
#define T1STAT_OVFIF                      0x20    // Overflow interrupt flag
#define T1STAT_CH4IF                      0x10    // Overflow interrupt flag
#define T1STAT_CH3IF                      0x08    // Overflow interrupt flag
#define T1STAT_CH2IF                      0x04    // Overflow interrupt flag
#define T1STAT_CH1IF                      0x02    // Overflow interrupt flag
#define T1STAT_CH0IF                      0x01    // Overflow interrupt flag

// T1CCTL0 (0xE5) - Timer 1 Channel n Capture/Compare Control
#define T1CCTLn_RFIRQ                     0x80            // When set, use RF interrupt for capture instead of regular capture input.
#define T1CCTLn_IM                        0x40            // Interrupt mask. Enables interrupt request when set.
#define T1CCTLn_CMP                       (0x07 << 3)     // Compare-mode bit mask.
  #define T1CCTLn_CMP_SET_ON_CMP            (0x00 << 3)     // Set output on compare.
  #define T1CCTLn_CMP_CLR_ON_CMP            (0x01 << 3)     // Clear output on compare.
  #define T1CCTLn_CMP_TOG_ON_CMP            (0x02 << 3)     // Toggle output on compare.
  #define T1CCTLn_CMP_SET_CMP_UP_CLR_0      (0x03 << 3)     // Set output on compare-up, clear on 0.
  #define T1CCTLn_CMP_CLR_CMP_UP_SET_0      (0x04 << 3)     // Clear output on compare-up, set on 0.
  #define T1CCTLn_CMP_CLR_T1CC0_SET_T1CC1   (0x05 << 3)     // Clear when equal T1CC0, set when equal T1CC1. Not applicable for ch0.
  #define T1CCTLn_CMP_SET_T1CC0_CLR_T1CC1   (0x06 << 3)     // Set when equal T1CC0, clear when equal T1CC1. Not applicable for ch0.
  #define T1CCTLn_CMP_INIT_PIN              (0x07 << 3)     // Initialize output pin, CMP mode is not changed.
#define T1CCTLn_MODE                      0x04          // Compare mode when set, capture mode when cleared
#define T1CCTLn_CAP                       (0x03)        // Capture mode bit mask
  #define T1CCTLn_CAP_NO_CAP                (0x00)        // No capture
  #define T1CCTLn_CAP_RISE_EDGE             (0x01)        // Capture on rising edge
  #define T1CCTLn_CAP_FALL_EDGE             (0x02)        // Capture on falling edge
  #define T1CCTLn_CAP_BOTH_EDGE             (0x03)        // Capture on both edges

// T1CC0H (0xDB) – Timer 1 Channel 0 Capture/Compare Value, High

// T1CC0L (0xDA) – Timer 1 Channel 0 Capture/Compare Value, Low

// T1CCTL1 (0xE6) - Timer 1 Channel 1 Capture/Compare Control
// See T1CCTL0

// T1CC1H (0xDD) – Timer 1 Channel 1 Capture/Compare Value, High

// T1CC1L (0xDC) – Timer 1 Channel 1 Capture/Compare Value, Low

// T1CCTL2 (0xE7) - Timer 1 Channel 2 Capture/Compare Control
// See T1CCTL0

// T1CC2H (0xDF) – Timer 1 Channel 2 Capture/Compare Value, High

// T1CC2L (0xDE) – Timer 1 Channel 2 Capture/Compare Value, Low

// T1CCTL3 (0x62A3) - Timer 1 Channel 3 Capture/Compare Control
// See T1CCTL0

// T1CC3H (0x62AD) – Timer 1 Channel 3 Capture/Compare Value, High

// T1CC3L (0x62AC) – Timer 1 Channel 3 Capture/Compare Value, Low

// T1CCTL4 (0x62A4) - Timer 1 Channel 4 Capture/Compare Control
// See T1CCTL0

// T1CC4H (0x62AF) – Timer 1 Channel 4 Capture/Compare Value, High

// T1CC4L (0x62AE) – Timer 1 Channel 4 Capture/Compare Value, Low

// IRCTL (0x6281) – Timer 1 IR Generation Control
#define IRCTL_IRGEN                       0x01    // Used in conjuction with Timer 3 to generate modulated IR codes, see the User's Guide.


// ************************* TIMER 2 *************************

// T2MSEL (0xC3) – Timer 2 Multiplex Select

// T2M0 (0xA2) – Timer 2 Multiplexed Register 0

// T2M1 (0xA3) – Timer 2 Multiplexed Register 1

// T2MOVF0 (0xA4) – Timer 2 Multiplexed Overflow Register 0

// T2MOVF1 (0xA5 – Timer 2 Multiplexed Overflow Register 2

// T2MOVF2 (0xA6) – Timer 2 Multiplexed Overflow Register 2

// T2IRQF (0xA1) – Timer 2 Interrupt Flags
#define T2IRQF_LONG_COMPARE2F             0x80
#define T2IRQF_LONG_COMPARE1F             0x40
#define T2IRQF_OVF_COMPARE2F              0x20
#define T2IRQF_OVF_COMPARE1F              0x10
#define T2IRQF_OVF_PERF                   0x08
#define T2IRQF_COMPARE2F                  0x04
#define T2IRQF_COMPARE1F                  0x02
#define T2IRQF_PERF                       0x01

// T2IRQM (0xA7) – Timer 2 Interrupt Mask
#define T2IRQM_LONG_COMARE2M              0x80
#define T2IRQM_LONG_COMARE1M              0x40
#define T2IRQM_OVF_COMPARE2M              0x20
#define T2IRQM_OVF_COMPARE1M              0x10
#define T2IRQM_OVF_PERM                   0x08
#define T2IRQM_COMPARE2M                  0x04
#define T2IRQM_COMPARE1M                  0x02
#define T2IRQM_PERM                       0x01

// T2CTRL (0x94) – Timer 2 Control Register
#define T2CTRL_LATCH_MODE                 0x08    
#define T2CTRL_STATE                      0x04    // State of Timer 2
#if (chip == 2545)
  #define T2CTRL_SYNC                       0x02    // Syncronized start/stop with LS RCOSC when set.
#endif
#define T2CTRL_RUN                        0x01    // Start/stop timer, starts when set, stops when cleared.

// T2EVTCFG (0x9C) – Timer 2 Event Configuration


// ************************* TIMER 3 *************************

// T3CNT (0xCA) - Timer 3 Counter

// T3CTL (0xCB) - Timer 3 Control
#define T3CTL_DIV                         (0xE0)
  #define T3CTL_DIV_1                       (0x00 << 5)
  #define T3CTL_DIV_2                       (0x01 << 5)
  #define T3CTL_DIV_4                       (0x02 << 5)
  #define T3CTL_DIV_8                       (0x03 << 5)
  #define T3CTL_DIV_16                      (0x04 << 5)
  #define T3CTL_DIV_32                      (0x05 << 5)
  #define T3CTL_DIV_64                      (0x06 << 5)
  #define T3CTL_DIV_128                     (0x07 << 5)
#define T3CTL_START                       0x10
#define T3CTL_OVFIM                       0x08
#define T3CTL_CLR                         0x04
#define T3CTL_MODE                        (0x03)
  #define T3CTL_MODE_FREERUN                (0x00)
  #define T3CTL_MODE_DOWN                   (0x01)
  #define T3CTL_MODE_MODULO                 (0x02)
  #define T3CTL_MODE_UPDOWN                 (0x03)

// T3CCTL0 (0xCC) - Timer 3 Channel 0 Compare Control
#define T3CCTLn_IM                        0x40
#define T3CCTLn_CMP                       (0x07 << 3)     // Compare mode bit mask.
  #define T3CCTLn_CMP_SET_ON_CMP            (0x00 << 3)     // Set output on compare.
  #define T3CCTLn_CMP_CLR_ON_CMP            (0x01 << 3)     // Clear output on compare.
  #define T3CCTLn_CMP_TOG_ON_CMP            (0x02 << 3)     // Toggle output on compare.
  #define T3CCTLn_CMP_SET_CMP_UP_CLR_0      (0x03 << 3)     // Set output on compare-up, clear on 0.
  #define T3CCTLn_CMP_CLR_CMP_UP_SET_0      (0x04 << 3)     // Clear output on compare-up, set on 0.
  #define T3CCTLn_CMP_SET_CMP_CLR_0xFF      (0x05 << 3)     // Set output on compare, clear on 0xFF
  #define T3CCTLn_CMP_CLR_CMP_SET_0x00      (0x06 << 3)     // Clear output on compare, set on 0x00
  #define T3CCTLn_CMP_INIT_PIN              (0x07 << 3)     // Initialize output pin, CMP mode is not changed.
#define T3CCTLn_MODE                      0x04
#define T3CCTLn_CAP                       (0x03)        // Capture mode bit mask
  #define T3CCTLn_CAP_NO_CAP                (0x00)        // No capture
  #define T3CCTLn_CAP_RISE_EDGE             (0x01)        // Capture on rising edge
  #define T3CCTLn_CAP_FALL_EDGE             (0x02)        // Capture on falling edge
  #define T3CCTLn_CAP_BOTH_EDGE             (0x03)        // Capture on both edges

// T3CC0 (0xCD) - Timer 3 Channel 0 Capture/Compare Value

// T3CCTL1 (0xCE) - Timer 3 Channel 1 Compare Control
// See T3CCTL0

// T3CC1 (0xCF) - Timer 3 Channel 1 Capture/Compare Value


// ************************* TIMER 4 *************************

// T4CNT (0xEA) - Timer 4 Counter

// T4CTL (0xEB) - Timer 4 Control
#define T4CTL_DIV                         (0xE0)
  #define T4CTL_DIV_1                       (0x00 << 5)
  #define T4CTL_DIV_2                       (0x01 << 5)
  #define T4CTL_DIV_4                       (0x02 << 5)
  #define T4CTL_DIV_8                       (0x03 << 5)
  #define T4CTL_DIV_16                      (0x04 << 5)
  #define T4CTL_DIV_32                      (0x05 << 5)
  #define T4CTL_DIV_64                      (0x06 << 5)
  #define T4CTL_DIV_128                     (0x07 << 5)
#define T4CTL_START                       0x10
#define T4CTL_OVFIM                       0x08
#define T4CTL_CLR                         0x04
#define T4CTL_MODE                        (0x03)
  #define T4CTL_MODE_FREERUN                (0x00)
  #define T4CTL_MODE_DOWN                   (0x01)
  #define T4CTL_MODE_MODULO                 (0x02)
  #define T4CTL_MODE_UPDOWN                 (0x03)

// T4CCTL0 (0xEC) - Timer 4 Channel 0 Compare Control
#define T4CCTLn_IM                        0x40
#define T4CCTLn_CMP                       (0x07 << 3)     // Compare mode bit mask.
  #define T4CCTLn_CMP_SET_ON_CMP            (0x00 << 3)     // Set output on compare.
  #define T4CCTLn_CMP_CLR_ON_CMP            (0x01 << 3)     // Clear output on compare.
  #define T4CCTLn_CMP_TOG_ON_CMP            (0x02 << 3)     // Toggle output on compare.
  #define T4CCTLn_CMP_SET_CMP_UP_CLR_0      (0x03 << 3)     // Set output on compare-up, clear on 0.
  #define T4CCTLn_CMP_CLR_CMP_UP_SET_0      (0x04 << 3)     // Clear output on compare-up, set on 0.
  #define T4CCTLn_CMP_SET_CMP_CLR_0xFF      (0x05 << 3)     // Set output on compare, clear on 0xFF
  #define T4CCTLn_CMP_CLR_CMP_SET_0x00      (0x06 << 3)     // Clear output on compare, set on 0x00
  #define T4CCTLn_CMP_INIT_PIN              (0x07 << 3)     // Initialize output pin, CMP mode is not changed.
#define T4CCTLn_MODE                      0x04
#define T4CCTLn_CAP                       (0x03)        // Capture mode bit mask
  #define T4CCTLn_CAP_NO_CAP                (0x00)        // No capture
  #define T4CCTLn_CAP_RISE_EDGE             (0x01)        // Capture on rising edge
  #define T4CCTLn_CAP_FALL_EDGE             (0x02)        // Capture on falling edge
  #define T4CCTLn_CAP_BOTH_EDGE             (0x03)        // Capture on both edges

// T4CC0 (0xED) - Timer 4 Channel 0 Capture/Compare Value

// T4CCTL1 (0xEE) - Timer 4 Channel 1 Compare Control
// See T4CCTL0

// T4CC1 (0xEF) - Timer 4 Channel 1 Capture/Compare Value

// TIMIF (0xD8) - Timers 1/3/4 Interrupt Mask/Flag - bit accessible SFR register


/*******************************************************************************
 * ADC
 */

#if (chip == 2541 || chip == 2543 || chip == 2545)          // (not applicable on CC2544)

  // ADCL (0xBA) - ADC Data Low (only bit 7-4 used)
  
  // ADCH (0xBB) - ADC Data High
  
  // ADCCON1 (0xB4) - ADC Control 1
  #define ADCCON1_EOC                       0x80
  #define ADCCON1_ST                        0x40
  #define ADCCON1_STSEL                     (0x03 << 4)   // bit mask, ADC start select
    #define ADCCON1_STSEL_P2_0                (0x00 << 4)   // External trigger on P2.0
    #define ADCCON1_STSEL_FULL_SPEED          (0x01 << 4)   // Do not wait for triggers
    #define ADCCON1_STSEL_T1C0_CMP_EVT        (0x02 << 4)   // Timer 1 ch0 compare event
    #define ADCCON1_STSEL_ST                  (0x03 << 4)   // ADCCON1.ST = 1

  // ADCCON2 (0xB5) - ADC Control 2
  #define ADCCON2_SREF                      (0x03 << 6)   // bit mask, select reference voltage
    #define ADCCON2_SREF_1_15V                (0x00 << 6)   // Internal reference 1.15 V
    #define ADCCON2_SREF_P0_7                 (0x01 << 6)   // External reference on AIN7 pin
    #define ADCCON2_SREF_AVDD                 (0x02 << 6)   // AVDD5 pin
    #define ADCCON2_SREF_P0_6_P0_7            (0x03 << 6)   // External reference on AIN6-AIN7 differential input
  #define ADCCON2_SDIV                      (0x03 << 4)   // bit mask, decimation rate
    #define ADCCON2_SDIV_64                   (0x00 << 4)   // 7 bits ENOB
    #define ADCCON2_SDIV_128                  (0x01 << 4)   // 9 bits ENOB
    #define ADCCON2_SDIV_256                  (0x02 << 4)   // 10 bits ENOB
    #define ADCCON2_SDIV_512                  (0x03 << 4)   // 12 bits ENOB
  #define ADCCON2_SCH                       (0x0F)        // bit mask, sequence channel select  
    #define ADCCON2_SCH_AIN0                  (0x00)        // selects the end of a single input sequence (starts at AIN0) 
    #define ADCCON2_SCH_AIN1                  (0x01)
    #define ADCCON2_SCH_AIN2                  (0x02)
    #define ADCCON2_SCH_AIN3                  (0x03)
    #define ADCCON2_SCH_AIN4                  (0x04)
    #define ADCCON2_SCH_AIN5                  (0x05)
    #define ADCCON2_SCH_AIN6                  (0x06)
    #define ADCCON2_SCH_AIN7                  (0x07)        
    #define ADCCON2_SCH_AIN0_1                (0x08)        // selects the end of a differential input sequence (starts at AIN0-AIN1)
    #define ADCCON2_SCH_AIN2_3                (0x09)
    #define ADCCON2_SCH_AIN4_5                (0x0A)
    #define ADCCON2_SCH_AIN6_7                (0x0B)        
    #define ADCCON2_SCH_GND                   (0x0C)        // only one conversion is performed
    #define ADCCON2_SCH_TEMPR                 (0x0E)        // only one conversion is performed
    #define ADCCON2_SCH_VDD_3                 (0x0F)        // only one conversion is performed
    
  // ADCCON3 (0xB6) - ADC Control 3
  #define ADCCON3_EREF                      0xC0
    #define ADCCON3_EREF_1_25V                (0x00 << 6)
    #define ADCCON3_EREF_P0_7                 (0x01 << 6)
    #define ADCCON3_EREF_AVDD                 (0x02 << 6)
    #define ADCCON3_EREF_P0_6_P0_7            (0x03 << 6)
  #define ADCCON3_EDIV                      0x30
    #define ADCCON3_EDIV_64                   (0x00 << 4)
    #define ADCCON3_EDIV_128                  (0x01 << 4)
    #define ADCCON3_EDIV_256                  (0x02 << 4)
    #define ADCCON3_EDIV_512                  (0x03 << 4)
  #define ADCCON3_ECH                       0x0F
    #define ADCCON3_ECH_AIN0                  (0x00)
    #define ADCCON3_ECH_AIN1                  (0x01)
    #define ADCCON3_ECH_AIN2                  (0x02)
    #define ADCCON3_ECH_AIN3                  (0x03)
    #define ADCCON3_ECH_AIN4                  (0x04)
    #define ADCCON3_ECH_AIN5                  (0x05)
    #define ADCCON3_ECH_AIN6                  (0x06)
    #define ADCCON3_ECH_AIN7                  (0x07)
    #define ADCCON3_ECH_AIN0_1                (0x08)
    #define ADCCON3_ECH_AIN2_3                (0x09)
    #define ADCCON3_ECH_AIN4_5                (0x0A)
    #define ADCCON3_ECH_AIN6_7                (0x0B)
    #define ADCCON3_ECH_GND                   (0x0C)
    #define ADCCON3_ECH_TEMPR                 (0x0E)
    #define ADCCON3_ECH_VDD_3                 (0x0F)

  // TR0 (0x624B) – Test Register 0
  #define TR0_ADCTM                         0x01    // Enable temperatur sensor, see datasheet.


  // *********************** Analog Comparator *************************

  // CMPCTL (0x62D0) – Analog Comparator Control and Status
  #define CMPCTL_EN                         0x02    // Comparator enable
  #define CMPCTL_OUTPUT                     0x01    // The comparator output

#endif


// ADCCON1 (0xB4) - ADC Control 1, also applicable on the CC2544
#define ADCCON1_RCTRL                     (0x03 << 2)   // Random-number generator control, bit mask
  #define ADCCON1_RCTRL_COMPLETE            (0x00 << 2)   // Normal operation (13x unrolling)
  #define ADCCON1_RCTRL_LFSR13              (0x01 << 2)   // Clock the LFSR once (13x unrolling)
  #define ADCCON1_RCTRL_STOP                (0x03 << 2)   // Random-number generator turned off

// RNDL (0xBC) – Random-Number-Generator Data, Low Byte

// RNDH (0xBD) – Random-Number-Generator Data, High Byte


/*******************************************************************************
 * Watchdog Timer
 */

// WDCTL (0xC9) - Watchdog Timer Control
#define WDCTL_CLR                         0xF0
  #define WDCTL_CLR0                        0x10
  #define WDCTL_CLR1                        0x20
  #define WDCTL_CLR2                        0x40
  #define WDCTL_CLR3                        0x80
#define WDCTL_MODE                        (0x03 << 2)   // Selects mode, bit mask
  #define WDCTL_MODE_IDLE                   (0x00 << 2)   // Idle, when in Timer mode
  #define WDCTL_MODE_WD                     (0x02 << 2)   // Watchdog mode (when in watchdog mode writing to these bits have no effect.)
  #define WDCTL_MODE_TIMER                  (0x03 << 2)   // Timer mode
#define WDCTL_INT                         (0x03)        // Interval select
  #define WDCTL_INT_1_SEC                   (0x00)
  #define WDCTL_INT_250_MSEC                (0x01)
  #define WDCTL_INT_15_MSEC                 (0x02)
  #define WDCTL_INT_2_MSEC                  (0x03)


/*******************************************************************************
 * USART
 */

// U0CSR (0x86) - USART 0 Control and Status
#define U0CSR_MODE                        0x80
#define U0CSR_RE                          0x40
#define U0CSR_SLAVE                       0x20
#define U0CSR_FE                          0x10
#define U0CSR_ERR                         0x08
#define U0CSR_RX_BYTE                     0x04
#define U0CSR_TX_BYTE                     0x02
#define U0CSR_ACTIVE                      0x01

// U0UCR (0xC4) - USART 0 UART Control
#define U0UCR_FLUSH                       0x80
#define U0UCR_FLOW                        0x40
#define U0UCR_D9                          0x20
#define U0UCR_BIT9                        0x10
#define U0UCR_PARITY                      0x08
#define U0UCR_SPB                         0x04
#define U0UCR_STOP                        0x02
#define U0UCR_START                       0x01

// U0GCR (0xC5) - USART 0 Generic Control
#define U0GCR_CPOL                        0x80
#define U0GCR_CPHA                        0x40
#define U0GCR_ORDER                       0x20
#define U0GCR_BAUD_E                      0x1F
  #define U0GCR_BAUD_E0                     0x01
  #define U0GCR_BAUD_E1                     0x02
  #define U0GCR_BAUD_E2                     0x04
  #define U0GCR_BAUD_E3                     0x08
  #define U0GCR_BAUD_E4                     0x10

// U0DBUF (0xC1) - USART 0 Receive/Transmit Data Buffer

// U0BAUD (0xC2) - USART 0 Baud Rate Control


/*******************************************************************************
 * I2C
 */

#if (chip == 2541 || chip == 2543 || chip == 2545)       // (not applicable on CC2544)

  // I2CCFG (0x6230) – I2C Control
  #define I2CCFG_CR2                        0x80    // Clock rate bit 2
  #define I2CCFG_ENS1                       0x40    // Enable I2C
  #define I2CCFG_STA                        0x20    // Start condition flag
  #define I2CCFG_STO                        0x10    // Stop flag
  #define I2CCFG_SI                         0x08    // Interrupt flag
  #define I2CCFG_AA                         0x04    // Assert acknowledge flag
  #define I2CCFG_CR1                        0x02    // Clock rate bit 1
  #define I2CCFG_CR0                        0x01    // Clock rate bit 0
  #define I2CCFG_CR                         (0x83)  // Clock rate bit mask
    #define I2CCFG_CR_DIV_256                 (0x00)  // 123 kHz at 32MHz system clock
    #define I2CCFG_CR_DIV_244                 (0x01)  // 144 kHz at 32MHz system clock
    #define I2CCFG_CR_DIV_192                 (0x02)  // 165 kHz at 32MHz system clock
    #define I2CCFG_CR_DIV_160                 (0x03)  // 197 kHz at 32MHz system clock
    #define I2CCFG_CR_DIV_960                 (0x80)  //  33 kHz at 32MHz system clock
    #define I2CCFG_CR_DIV_120                 (0x81)  // 267 kHz at 32MHz system clock
    #define I2CCFG_CR_DIV_60                  (0x82)  // 533 kHz at 32MHz system clock
  
  // I2CSTAT (0x6231) – I2C Status
  
  // I2CDATA (0x6232) – I2C Data
  
  // I2CADDR (0x6233) – I2C Own Slave Address
  #define I2CADDR_GC                        0x01    // General-call address acknowledge

#endif


/***********************************************************************/
#endif



/***********************************************************************************
  Copyright 2012 Texas Instruments Incorporated. All rights reserved.

  IMPORTANT: Your use of this Software is limited to those specific rights
  granted under the terms of a software license agreement between the user
  who downloaded the software, his/her employer (which must be your employer)
  and Texas Instruments Incorporated (the "License").  You may not use this
  Software unless you agree to abide by the terms of the License. The License
  limits your use, and you acknowledge, that the Software may not be modified,
  copied or distributed unless embedded on a Texas Instruments microcontroller
  or used solely and exclusively in conjunction with a Texas Instruments radio
  frequency transceiver, which is integrated into your product.  Other than for
  the foregoing purpose, you may not use, reproduce, copy, prepare derivative
  works of, modify, distribute, perform, display or sell this Software and/or
  its documentation for any purpose.

  YOU FURTHER ACKNOWLEDGE AND AGREE THAT THE SOFTWARE AND DOCUMENTATION ARE
  PROVIDED “AS IS” WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED,
  INCLUDING WITHOUT LIMITATION, ANY WARRANTY OF MERCHANTABILITY, TITLE,
  NON-INFRINGEMENT AND FITNESS FOR A PARTICULAR PURPOSE. IN NO EVENT SHALL
  TEXAS INSTRUMENTS OR ITS LICENSORS BE LIABLE OR OBLIGATED UNDER CONTRACT,
  NEGLIGENCE, STRICT LIABILITY, CONTRIBUTION, BREACH OF WARRANTY, OR OTHER
  LEGAL EQUITABLE THEORY ANY DIRECT OR INDIRECT DAMAGES OR EXPENSES
  INCLUDING BUT NOT LIMITED TO ANY INCIDENTAL, SPECIAL, INDIRECT, PUNITIVE
  OR CONSEQUENTIAL DAMAGES, LOST PROFITS OR LOST DATA, COST OF PROCUREMENT
  OF SUBSTITUTE GOODS, TECHNOLOGY, SERVICES, OR ANY CLAIMS BY THIRD PARTIES
  (INCLUDING BUT NOT LIMITED TO ANY DEFENSE THEREOF), OR OTHER SIMILAR COSTS.

  Should you have any questions regarding your right to use this Software,
  contact Texas Instruments Incorporated at www.TI.com.
***********************************************************************************/