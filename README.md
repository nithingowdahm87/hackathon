# AI Urban Ops Platform

AI Urban Ops is a microservices-based smart city operations platform that provides real-time monitoring dashboards, incident tracking, alerting, sensor supervision, CCTV feeds, and predictive analytics. The system is composed of a React frontend, multiple Spring Boot services behind a Spring Cloud Gateway, a Python prediction service, and a PostgreSQL database. Containerized services run locally via Docker Compose and can be deployed to Kubernetes using the manifests in `k8s/`.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Service Responsibilities](#service-responsibilities)
3. [Local Development](#local-development)
4. [Docker Compose Environment](#docker-compose-environment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Kubernetes Utilities](#kubernetes-utilities)
7. [Troubleshooting & Observability](#troubleshooting--observability)
8. [Authentication Flow](#authentication-flow)
9. [Environment Variables](#environment-variables)
10. [Useful Commands](#useful-commands)

---

## Architecture Overview
- **Frontend**: React application served by Nginx, communicates with the backend through the gateway using `/api` prefix.
- **Gateway Service**: Spring Cloud Gateway responsible for routing, JWT validation, and propagating `Authorization` and `X-Username` headers to downstream services.
- **Auth Service**: Handles user registration, login, JWT issuance, and user metadata lookups.
- **Traffic Service**: Manages incidents and integrates with the auth service to scope data per user.
- **Alert Service, Power Service, CCTV Service**: Domain-specific microservices exposing REST APIs routed through the gateway.
- **Python Service**: Provides ML-driven traffic predictions and external API integrations.
- **PostgreSQL**: Primary data store shared by the Spring services.
- **Observability Stack (optional)**: Elasticsearch, Fluentd, Kibana manifests included for centralized logging.

Services communicate over internal Kubernetes services (or Docker networks) and rely on JWT-based authentication enforced in the gateway.

## Service Responsibilities
| Service | Port | Description |
|---------|------|-------------|
| frontend | 80 | React UI for operators |
| gateway-service | 8081 | API entry point with JWT filter |
| auth-service | 8090 | Authentication, JWT generation, user lookup |
| traffic-service | 8092 | Incident CRUD scoped per user |
| power-service | 8093 | Power infrastructure status |
| alert-service | 8091 | Alert management |
| cctv-service | 8094 | CCTV camera metadata |
| python-service | 8000 | Prediction API (FastAPI) |
| postgres | 5432 | Database |

## Local Development
1. **Requirements**
   - Node.js 18+
   - Java 21 + Maven 3.9
   - Python 3.11
   - Docker Desktop (for containerized workflows)

2. **Frontend**
   ```bash
   cd frontend_reactjs
   npm install
   npm run dev
   ```

3. **Spring Services**
   ```bash
   cd backend_java
   mvn clean package
   # run individual services
target commands (e.g., mvn spring-boot:run -pl gateway_service)
   ```

4. **Python Service**
   ```bash
   cd python
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

## Docker Compose Environment
Run the entire stack locally:
```bash
wsl docker compose up --build
```
Key containers:
- `gateway-service`, `auth-service`, `traffic-service`, `power-service`, `alert-service`, `cctv-service`, `python-service`, `frontend`, `postgres`.

## Kubernetes Deployment
All manifests live under `k8s/`.
- `app.yml`: Core namespace (`urbanops`), Postgres secret, deployments and services for all workloads, and frontend config map.
- `ingress.yml`: Routes `/api` traffic to the gateway and all other traffic to the frontend via the NGINX ingress controller.
- `frontend-config.yml`: Standalone ConfigMap for overriding API URL if needed.
- `nginx-ingress.yaml`: Service definition to expose the ingress controller (`LoadBalancer`).
- `elasticsearch/`, `fluentd/`, `kibana/`: Optional EFK stack manifests for centralized logging.

### Namespaces & Secrets
- Creates namespaces `urbanops` and `ingress-nginx`.
- Postgres credentials stored in `postgres-secret` (namespace `urbanops`).
- All Spring services consume DB credentials via `secretKeyRef`.

### Deployment Pipeline
1. `kubectl apply -f k8s/app.yml`
2. `kubectl apply -f k8s/frontend-config.yml`
3. `kubectl apply -f k8s/ingress.yml`
4. (Optional) Deploy EFK stack via `k8s/elasticsearch/`, `k8s/fluentd/`, `k8s/kibana/` manifests.

Ingress exposes frontend on `/` and API on `/api`. Update DNS or access via the ingress controller service IP.

## Kubernetes Utilities
A helper script `scripts/deploy.sh` (to be created) automates applying manifests and launching port forwards for:
- Frontend (80 -> 8080)
- Gateway (8081 -> 8081)
- Auth service (8090)
- Traffic, power, alert, CCTV services (respective ports)
- Python service (8000)
- PostgreSQL (5432)
- Kibana (5601) and Elasticsearch (9200) when deployed

Each port-forward will bind to `0.0.0.0` and run in background with process management instructions in the script.

## Troubleshooting & Observability
- Inspect service logs: `kubectl logs deployment/<name> -n urbanops`
- Get pod status: `kubectl get pods -n urbanops`
- Check ingress: `kubectl describe ingress urbanops-ingress -n urbanops`
- Port-forward postgres for SQL access: `kubectl port-forward svc/postgres 5432:5432 -n urbanops`
- Optional EFK stack captures logs via Fluentd and exposes Kibana at `http://localhost:5601` once port-forwarded.

## Authentication Flow
1. Frontend calls `POST /api/auth/login` through gateway.
2. Gateway bypasses JWT validation for `/api/auth/**` and forwards to auth-service.
3. Auth-service validates credentials, issues JWT, and returns `token`, `username`, `roles`.
4. Frontend stores `urbanopsUser` in `localStorage`.
5. Subsequent requests include `Authorization: Bearer <token>` and `X-Username` headers; gateway validates JWT and injects headers before routing.
6. Downstream services fetch user profile details from auth-service when needed.

## Environment Variables
Key configuration values:
- `SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/urbanops`
- `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` from `postgres-secret`
- `JWT_SECRET=UrbanOpsSecretKey1234567890!@#$%^&*`
- `PYTHON_SERVICE` environment references database connection and backend API URL.
- Frontend config map sets `API_URL` (default `/api`).

## Useful Commands
```bash
# Build all Java services
docker compose build gateway-service auth-service traffic-service power-service alert-service cctv-service

# Apply entire Kubernetes stack
kubectl apply -f k8s/app.yml
kubectl apply -f k8s/frontend-config.yml
kubectl apply -f k8s/ingress.yml

# Delete stack
kubectl delete -f k8s/ingress.yml
kubectl delete -f k8s/frontend-config.yml
kubectl delete -f k8s/app.yml

# Troubleshoot pods
kubectl describe pod <pod> -n urbanops
kubectl exec -it deployment/gateway-service -n urbanops -- sh
```

---

## Contributing
1. Fork the repository / create feature branch.
2. Run locally and ensure lint/tests pass.
3. Open PR with detailed description and screenshots/logs as appropriate.

## License
MIT (add appropriate license text if required).
