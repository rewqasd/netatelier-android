#!/bin/bash
set -euo pipefail
cleanup(){ docker rm -f netatelier-private-ci >/dev/null 2>&1 || true; docker volume rm netatelier-private-ci-data >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run -d --name netatelier-private-ci --network host --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges --mount type=volume,src=netatelier-private-ci-data,dst=/data -e TEAM_ORIGIN=http://127.0.0.1:4318 netatelier-private-ci >/dev/null
ready=0
for attempt in {1..20}; do
 if curl --fail --silent http://127.0.0.1:4318/api/health >/dev/null; then ready=1; break; fi
 sleep 1
done
[ "$ready" = 1 ]
docker restart netatelier-private-ci >/dev/null
for attempt in {1..20}; do
 if curl --fail --silent http://127.0.0.1:4318/api/health >/dev/null; then exit 0; fi
 sleep 1
done
exit 1
