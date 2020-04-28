#!/usr/bin/env bash

BOLT_PORT=7687

./neo4j/bin/neo4j stop
rm -r neo4j/data/databases/graph.db
./neo4j/bin/neo4j start

echo "Waiting up to 2 minutes for neo4j bolt port ($BOLT_PORT)"

for i in {1..120};
    do
        nc -z 127.0.0.1 $BOLT_PORT
        is_up=$?
        if [ $is_up -eq 0 ]; then
            echo
            echo "Successfully started, neo4j bolt available on $BOLT_PORT"
            break
        fi
        sleep 1
        echo -n "."
done
echo
# Wait a further 5 seconds after the port is available
sleep 5