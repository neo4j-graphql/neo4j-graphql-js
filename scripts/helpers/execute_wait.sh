#!/bin/dash

this_directory=$1
localhost=$2

. $this_directory/helpers/load_env_vars.sh
load_env_vars

echo "Waiting up to 2 minutes for graphql http port ($HTTP_PORT)"

. $this_directory/helpers/get_local_host.sh
for i in {1..120}; do
    nc -z $(get_local_host) $HTTP_PORT -w 2
    is_up=$?
    if [ $is_up -eq 0 ]; then
        echo
        echo "Successfully started, graphql http available on $HTTP_PORT"
        break
    fi
    sleep 1
    echo -n "."
done
echo
