#!/bin/bash

get_latest_download() {
  local cache="$1" # Save first argument in a variable
  local filename_glob="$2"
  cd $cache
  { # try
    latest_download="$(ls -r $filename_glob | head -1)"
    #save your output
  } 2>/dev/null || {
    # catch
    # save log for exception
    latest_download=()
  }
  cd ..
}

check_if_there_is_need_to_download() {
  local cache="$1"    # Save first argument in a variable
  local file_URL="$2" # Save first argument in a variable
  local filename="$3" # Save first argument in a variable
  get_latest_download $cache $filename*

  file_to_download=()
  if [ ! "$latest_download" ]; then
    file_to_download=($file_URL/$filename)
  fi
}
get_list_of_files_to_download() {
  # $1 cache folder
  # $2..n files to check if available in cache
  local cache="$1"        # Save first argument in a variable
  shift                   # Shift all arguments to the left (original $1 gets lost)
  local files_info=("$@") # Rebuild the array with rest of arguments
  local pattern='(.*):+(.*)'

  files_to_download=()

  for file_info in "${files_info[@]}"; do
    [[ $file_info =~ $pattern ]]
    check_if_there_is_need_to_download $cache ${BASH_REMATCH[1]} ${BASH_REMATCH[2]}
    files_to_download+=($file_to_download)
  done
}
