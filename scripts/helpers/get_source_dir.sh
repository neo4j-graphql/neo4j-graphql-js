#!/bin/bash
# Based on:
# https://stackoverflow.com/questions/59895/how-can-i-get-the-source-directory-of-a-bash-script-from-within-the-script-itsel

get_source_dir() {
    local this_source=$1
    while [ -h "$this_source" ]; do # resolve $this_source until the file is no longer a symlink
        local this_dir="$(cd -P "$(dirname "$this_source")" >/dev/null 2>&1 && pwd)"
        this_source="$(readlink "$this_source")"
        [[ $this_source != /* ]] && this_source="$this_dir/$this_source" # if $this_source was a relative symlink, we need to resolve it relative to the path where the symlink file was located
    done
    this_dir="$(cd -P "$(dirname "$this_source")" >/dev/null 2>&1 && pwd)"
    echo $this_dir
}
