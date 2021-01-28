#!/bin/bash

load_env_vars() {
    if [ ! -f ../.env ]; then
        export $(cat .env | xargs)
    fi
}
