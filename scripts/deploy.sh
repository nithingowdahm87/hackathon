#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="urbanops"
K8S_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)/k8s"

apply_manifests() {
  kubectl apply -f "${K8S_DIR}/app.yml"
  kubectl apply -f "${K8S_DIR}/frontend-config.yml"
  kubectl apply -f "${K8S_DIR}/ingress.yml"
}

delete_manifests() {
  kubectl delete -f "${K8S_DIR}/ingress.yml" --ignore-not-found
  kubectl delete -f "${K8S_DIR}/frontend-config.yml" --ignore-not-found
  kubectl delete -f "${K8S_DIR}/app.yml" --ignore-not-found
}

start_port_forward() {
  local resource="$1" local_port="$2" remote_port="$3"
  echo "Port-forwarding ${resource}:${remote_port} to 0.0.0.0:${local_port}"
  kubectl port-forward "${resource}" "${local_port}:${remote_port}" -n "${NAMESPACE}" --address 0.0.0.0 >/tmp/pf-${resource//\//_}-${remote_port}.log 2>&1 &
}

stop_port_forward() {
  pkill -f "kubectl port-forward" || true
}

case "${1:-}" in
  apply)
    apply_manifests
    ;;
  delete)
    delete_manifests
    ;;
  port-forward)
    stop_port_forward
    start_port_forward svc/frontend 8080 80
    start_port_forward svc/gateway-service 8081 8081
    start_port_forward svc/auth-service 8090 8090
    start_port_forward svc/traffic-service 8092 8092
    start_port_forward svc/power-service 8093 8093
    start_port_forward svc/alert-service 8091 8091
    start_port_forward svc/cctv-service 8094 8094
    start_port_forward svc/python-service 8000 8000
    start_port_forward svc/postgres 5432 5432
    start_port_forward svc/kibana 5601 5601
    start_port_forward svc/elasticsearch 9200 9200
    echo "Active port-forward processes:"
    pgrep -af "kubectl port-forward"
    ;;
  cleanup-port-forward)
    stop_port_forward
    ;;
  *)
    echo "Usage: $0 {apply|delete|port-forward|cleanup-port-forward}" >&2
    exit 1
    ;;
esac
