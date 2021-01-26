#!/bin/bash

source=${BASH_SOURCE[0]}
. $(dirname $source)/helpers/get_source_dir.sh

wait-for-graphql() {
    local this_directory=$(get_source_dir $source)

    . $this_directory/helpers/get_local_host.sh
    localhost=$(get_local_host)
    dash $this_directory/helpers/execute_wait.sh $this_directory $localhost
}
wait-for-graphql
