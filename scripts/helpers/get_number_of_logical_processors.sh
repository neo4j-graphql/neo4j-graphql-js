#!/bin/bash

get_number_of_logical_processors() {
    logical_cpus=$([ $(uname) = 'Darwin' ] &&
        sysctl -n hw.logicalcpu_max ||
        lscpu -p | egrep -v '^#' | wc -l)
}
