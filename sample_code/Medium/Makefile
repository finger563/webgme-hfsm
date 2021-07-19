################################################################################
################################################################################
################################################################################
#
# MAKEFILE
# PROJECT: Medium
#
################################################################################
PROJECT_NAME   = Medium

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
CPPSRC += Medium_GeneratedStates.cpp
CPPSRC += Medium_test.cpp

#-------------------------------------------------------------------------------
#
# COMPILER CONFIGURATION
#
#-------------------------------------------------------------------------------
CSTANDARD   = -std=c14
CPPSTANDARD = -std=c++14
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
test:      Medium_test
debug:     Medium_test_DEBUG
run:       run_Medium_test
run_debug: run_Medium_test_DEBUG

gccversion : 
	@$(CC) --version

begin: gccversion
	@echo
	@echo Building HFSMs within Project: Medium

end:
	@echo Finished compiling HFSMs
	@echo

clean:
	@echo
	@echo Cleaning Project: Medium
	$(REMOVE) Medium_test
	$(REMOVE) Medium_test_DEBUG
	$(REMOVE) $(CPPSRC:.cpp=.s) 
	$(REMOVE) $(CPPSRC:.cpp=.d)
	$(REMOVE) $(LST)
	$(REMOVE) .dep


.PRECIOUS : $(CPPOBJ)

$(CPPOBJ) : %.o : %.cpp
	@echo
	@echo Compiling CPP Source: $<
	g++ $(ALL_CFLAGS $< -o $@

Medium_test:
	@echo Compiling Medium_test
	g++ -o Medium_test Medium_test.cpp Medium_GeneratedStates.cpp $(ALL_CFLAGS)
Medium_test_DEBUG:
	@echo Compiling Medium_test_DEBUG
	g++ -o Medium_test_DEBUG Medium_test.cpp Medium_GeneratedStates.cpp $(ALL_CFLAGS) $(DEBUG_DEFS)
run_Medium_test: Medium_test
	@echo
	@echo Running Medium_test
	@echo
	./Medium_test
	@echo
	@echo Finished
run_Medium_test_DEBUG: Medium_test_DEBUG
	@echo
	@echo Running Medium_test_DEBUG
	@echo
	./Medium_test_DEBUG
	@echo
	@echo Finished

-include $(shell mkdir .dep 2>/dev/null) $(wildcard .dep/*)
.PHONY : all begin finish end sizebefore sizeafter gccversion \
build elf hex bin lss sym clean clean_list program
