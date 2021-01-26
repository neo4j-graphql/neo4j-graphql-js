#!/bin/bash

source=${BASH_SOURCE[0]}
. $(dirname $source)/helpers/get_source_dir.sh

stop-and-clear-neo4j() {
    local this_directory=$(get_source_dir $source)

    . $this_directory/helpers/get_local_host.sh
    localhost=$(get_local_host)
    dash $this_directory/helpers/execute_stop.sh $this_directory $localhost
}
stop-and-clear-neo4j
