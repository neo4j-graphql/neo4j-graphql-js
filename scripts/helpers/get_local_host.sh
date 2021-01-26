#!/bin/bash
source=${BASH_SOURCE[0]}
. $(dirname $source)/get_source_dir.sh

get_local_host() {
    local this_directory=$(get_source_dir $source)
    local localhost=$(perl $this_directory/regex.pl "$(cat /etc/resolv.conf)")
    echo $localhost
}
# echo "$(get_local_host)"
