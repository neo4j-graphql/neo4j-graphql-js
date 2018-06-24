#!/usr/bin/env bash

HTTP_PORT=3000

echo "Waiting up to 2 minutes for graphql http port ($HTTP_PORT)"

for i in {1..120};
    do
        nc -z localhost $HTTP_PORT
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