################################################################################
################################################################################
################################################################################
#
# MAKEFILE
# PROJECT: Basic
#
################################################################################
PROJECT_NAME   = Basic

#-------------------------------------------------------------------------------
#
# ENVIRONMENT CONFIGURATION
#
#-------------------------------------------------------------------------------
SHELL          = sh
REMOVE         = rm -rf
COPY           = cp

#-------------------------------------------------------------------------------
#
# SOURCE FILES
#
#-------------------------------------------------------------------------------
CPPSRC =
CPPSRC += Basic_generated_states.cpp
CPPSRC += Basic_test.cpp

#-------------------------------------------------------------------------------
#
# COMPILER CONFIGURATION
#
#-------------------------------------------------------------------------------
CSTANDARD   = -std=c17
CPPSTANDARD = -std=c++17
OPTIMIZATION= 3

CDEFS =

CPPDEFS =

DEBUG_DEFS =
DEBUG_DEFS += -DDEBUG_OUTPUT

CFLAGS =
CFLAGS += $(CDEFS)

CPPFLAGS = 
CPPFLAGS += -O$(OPTIMIZATION)
CPPFLAGS += $(CPPSTANDARD)
CPPFLAGS += -pthread

#-------------------------------------------------------------------------------
#
# GENERAL PURPOSE COMPILATION
#
#-------------------------------------------------------------------------------
# Define all object files.
COBJ      = $(CSRC:.c=.o) 
AOBJ      = $(ASRC:.S=.o)
COBJARM   = $(CSRCARM:.c=.o)
AOBJARM   = $(ASRCARM:.S=.o)
CPPOBJ    = $(CPPSRC:.cpp=.o) 
CPPOBJARM = $(CPPSRCARM:.cpp=.o)
# Listing files.
LST =
LST += $(CSRC:.c=.lst)
LST += $(CPPSRC:.cpp=.lst)
# Dependency files.
GENDEPFLAGS = -MD -MP -MF .dep/$(@F).d
# Combine all necessary flags and optional flags.
# Add target processor to flags.
ALL_CFLAGS  = $(CFLAGS) $(CPPFLAGS) $(GENDEPFLAGS)

#-------------------------------------------------------------------------------
#
# TARGETS
#
#-------------------------------------------------------------------------------
all:       begin test debug end
test:      Basic_test
debug:     Basic_test_DEBUG
run:       run_Basic_test
run_debug: run_Basic_test_DEBUG

gccversion : 
	@$(CC) --version

begin: gccversion
	@echo
	@echo Building HFSMs within Project: Basic

end:
	@echo Finished compiling HFSMs
	@echo

clean:
	@echo
	@echo Cleaning Project: Basic
	$(REMOVE) Basic_test
	$(REMOVE) Basic_test_DEBUG
	$(REMOVE) $(CPPSRC:.cpp=.s) 
	$(REMOVE) $(CPPSRC:.cpp=.d)
	$(REMOVE) $(LST)
	$(REMOVE) .dep


.PRECIOUS : $(CPPOBJ)

HEADERS = $(wildcard *.hpp)

$(CPPOBJ) : %.o : %.cpp $(HEADERS)
	@echo
	@echo Compiling CPP Source: $<
	g++ -c $(ALL_CFLAGS) $< -o $@

Basic_test: $(CPPSRC) $(HEADERS)
	@echo Compiling Basic_test
	g++ -o Basic_test Basic_test.cpp Basic_generated_states.cpp $(ALL_CFLAGS)
Basic_test_DEBUG: $(CPPSRC) $(HEADERS)
	@echo Compiling Basic_test_DEBUG
	g++ -o Basic_test_DEBUG Basic_test.cpp Basic_generated_states.cpp $(ALL_CFLAGS) $(DEBUG_DEFS)
run_Basic_test: Basic_test
	@echo
	@echo Running Basic_test
	@echo
	./Basic_test
	@echo
	@echo Finished
run_Basic_test_DEBUG: Basic_test_DEBUG
	@echo
	@echo Running Basic_test_DEBUG
	@echo
	./Basic_test_DEBUG
	@echo
	@echo Finished

-include $(shell mkdir .dep 2>/dev/null) $(wildcard .dep/*)
.PHONY : all begin finish end sizebefore sizeafter gccversion \
build elf hex bin lss sym clean clean_list program
