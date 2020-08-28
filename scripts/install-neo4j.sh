#!/usr/bin/env bash

set -xe

if [ ! -d "neo4j/data/databases/graph.db" ]; then
    mkdir -p neo4j
    wget dist.neo4j.org/neo4j-$NEO4J_DIST-$NEO4J_VERSION-unix.tar.gz
    tar -xzf neo4j-$NEO4J_DIST-$NEO4J_VERSION-unix.tar.gz -C neo4j --strip-components 1
    neo4j/bin/neo4j-admin set-initial-password letmein
    curl -L https://github.com/neo4j-contrib/neo4j-apoc-procedures/releases/download/$APOC_VERSION/apoc-$APOC_VERSION-all.jar > ./neo4j/plugins/apoc-$APOC_VERSION-all.jar
    wget https://datastores.s3.amazonaws.com/recommendations/v$DATASTORE_VERSION/recommendations.db.zip
    sudo apt-get install unzip
    unzip recommendations.db.zip
    mv recommendations.db neo4j/data/databases/graph.db
else
    echo "Database is already installed, skipping"
fi
