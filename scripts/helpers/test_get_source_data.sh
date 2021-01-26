#!/bin/bash

source=${BASH_SOURCE[0]}
. $(dirname $source)/get_source_dir.sh
this_directory=$(get_source_dir $source)
echo $this_directory
