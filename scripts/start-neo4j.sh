#!/usr/bin/env bash

if [ ! -d "neo4j/data/databases/graph.db" ]; then
    echo "Neo4j not installed correctly, run ./scripts/install_neo4j"
    exit 1
else
    ./neo4j/bin/neo4j start
    sleep 60
fi
