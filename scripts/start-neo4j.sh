#!/bin/bash

source=${BASH_SOURCE[0]}
. $(dirname $source)/helpers/get_source_dir.sh

start-neo4j() {
    local this_directory=$(get_source_dir $source)

    . $this_directory/helpers/get_local_host.sh
    localhost=$(get_local_host)
    dash $this_directory/helpers/execute_start.sh $this_directory $localhost
}
start-neo4j
