################################################################################
################################################################################
################################################################################
#
# MAKEFILE
# PROJECT: Complex
#
################################################################################
PROJECT_NAME   = Complex

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
CPPSRC += Complex_GeneratedStates.cpp
CPPSRC += Complex_test.cpp

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
test:      Complex_test
debug:     Complex_test_DEBUG
run:       run_Complex_test
run_debug: run_Complex_test_DEBUG

gccversion : 
	@$(CC) --version

begin: gccversion
	@echo
	@echo Building HFSMs within Project: Complex

end:
	@echo Finished compiling HFSMs
	@echo

clean:
	@echo
	@echo Cleaning Project: Complex
	$(REMOVE) Complex_test
	$(REMOVE) Complex_test_DEBUG
	$(REMOVE) $(CPPSRC:.cpp=.s) 
	$(REMOVE) $(CPPSRC:.cpp=.d)
	$(REMOVE) $(LST)
	$(REMOVE) .dep


.PRECIOUS : $(CPPOBJ)

$(CPPOBJ) : %.o : %.cpp
	@echo
	@echo Compiling CPP Source: $<
	g++ $(ALL_CFLAGS $< -o $@

Complex_test:
	@echo Compiling Complex_test
	g++ -o Complex_test Complex_test.cpp Complex_GeneratedStates.cpp $(ALL_CFLAGS)
Complex_test_DEBUG:
	@echo Compiling Complex_test_DEBUG
	g++ -o Complex_test_DEBUG Complex_test.cpp Complex_GeneratedStates.cpp $(ALL_CFLAGS) $(DEBUG_DEFS)
run_Complex_test: Complex_test
	@echo
	@echo Running Complex_test
	@echo
	./Complex_test
	@echo
	@echo Finished
run_Complex_test_DEBUG: Complex_test_DEBUG
	@echo
	@echo Running Complex_test_DEBUG
	@echo
	./Complex_test_DEBUG
	@echo
	@echo Finished

-include $(shell mkdir .dep 2>/dev/null) $(wildcard .dep/*)
.PHONY : all begin finish end sizebefore sizeafter gccversion \
build elf hex bin lss sym clean clean_list program
