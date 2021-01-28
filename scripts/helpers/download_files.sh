#!/bin/bash

source=${BASH_SOURCE[0]}
. $(dirname $source)/get_source_dir.sh

download_files() {
    local this_directory=$(get_source_dir $source)
    local cache="$1"               # Save first argument in a variable
    shift                          # Shift all arguments to the left (original $1 gets lost)
    local files_to_download=("$@") # Rebuild the array with rest of arguments
    local number_of_files_to_download=${#files_to_download[@]}

    if [ $number_of_files_to_download -gt 0 ]; then
        . $this_directory/get_number_of_logical_processors.sh
        get_number_of_logical_processors
        echo ${files_to_download[@]} | xargs -n 1 -P $logical_cpus wget -q -P $cache --show-progress
    fi
}
