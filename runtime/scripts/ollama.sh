#!/usr/bin/env bash

function display_help {
  echo "cmd"
  echo
  echo "Usage:" >&2
  echo "  cmd COMMAND [options] [arguments]"
  echo
  echo "front Commands:"
  echo "  cmd up          Start the application"
  echo "  cmd shell       Enter in container"
  echo "  cmd shellr      Enter in container with root user"
  echo "  cmd clean.......Clean the application"
  echo
  exit 1
}

if [ $# -gt 0 ]; then
  if [ "$1" == "shell" ]; then
    docker compose exec -it ollama bash
  elif [ "$1" == "shellr" ]; then
    docker container exec -it --user root vm-ssl-tester-app1 /bin/sh
  elif [ "$1" == "clean" ]; then
    docker compose down --volumes --rmi all
  elif [ "$1" == "help" ] || [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    display_help
  else
    echo "App starting at \e[92mhttp://localhost:7000 \e[0m"
    docker compose up ollama --build -d
    docker compose logs -f ollama
  fi
else
  display_help
fi