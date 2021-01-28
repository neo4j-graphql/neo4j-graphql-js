#!/bin/bash

# sudo apt-get install fdupes

delete_duplicates() {
  local folder_to_look_for_duplicates="$1"
  fdupes -rdN $folder_to_look_for_duplicates
}
