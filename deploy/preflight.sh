#!/bin/sh
# READ ONLY. Run only through an explicitly user-confirmed authenticated session.
set -eu
uname -sr
if [ -r /etc/os-release ]; then cat /etc/os-release; fi
id
uptime
df -h /
if command -v free >/dev/null 2>&1; then free -m; fi
if command -v ss >/dev/null 2>&1; then ss -lnt; fi
if command -v docker >/dev/null 2>&1; then docker version --format '{{.Server.Version}}'; docker ps --format '{{.Names}} {{.Ports}}'; fi
if command -v node >/dev/null 2>&1; then node --version; fi
# Do not print environment, SSH configuration, credentials, project data or logs.
