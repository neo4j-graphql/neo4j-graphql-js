#!/bin/bash

source=${BASH_SOURCE[0]}
. $(dirname $source)/helpers/get_source_dir.sh

install-neo4j() {
  local this_directory=$(get_source_dir $source)

  yes | sudo apt-get install fdupes unzip

  cache=.download_cache
  helpers_path=$this_directory/helpers
  . $helpers_path/load_env_vars.sh
  load_env_vars

  # set -xe

  graph_db_path="neo4j/data/databases/graph.db"
  if [ ! -d $graph_db_path ]; then
    if [ ! -L neo4j ]; then
      mkdir -p -- neo4j
      mkdir -p -- $cache
    fi
    neo4j_URL=dist.neo4j.org
    apoc_URL=https://github.com/neo4j-contrib/neo4j-apoc-procedures/releases/download/$APOC_VERSION
    recommendations_URL=https://datastores.s3.amazonaws.com/recommendations/v$DATASTORE_VERSION
    neo4j=neo4j-$NEO4J_DIST-$NEO4J_VERSION-unix.tar.gz
    apoc=apoc-$APOC_VERSION-all.jar
    recommendations=recommendations.db.zip

    download_info=("$neo4j_URL:$neo4j" "$apoc_URL:$apoc" "$recommendations_URL:$recommendations")

    . $helpers_path/cached_download.sh
    cached_download $cache ${download_info[@]}

    tar -xzf ${cached_downloads[0]} -C neo4j --strip-components 1
    cp ${cached_downloads[1]} neo4j/plugins/$apoc
    unzip -o ${cached_downloads[2]}

    mv recommendations.db $graph_db_path
    rm __MACOSX* -r

    neo4j/bin/neo4j-admin set-default-admin $NEO4J_USER
    neo4j/bin/neo4j-admin set-initial-password $NEO4J_PASSWORD
  else
    echo "Database is already installed, skipping"
  fi
}
install-neo4j
