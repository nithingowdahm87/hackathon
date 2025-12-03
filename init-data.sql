-- Urban Operations Control Center - Database Initialization
-- Using PLAIN TEXT passwords for simplicity as per requirements

-- Create tables if they don't exist (to avoid startup errors)

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS incidents (
    id BIGSERIAL PRIMARY KEY,
    description VARCHAR(255),
    location VARCHAR(255),
    severity VARCHAR(255),
    status VARCHAR(255),
    user_id BIGINT
);

CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255),
    message VARCHAR(255),
    priority VARCHAR(255),
    timestamp TIMESTAMP,
    user_id BIGINT
);

CREATE TABLE IF NOT EXISTS sensors (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(255),
    value DOUBLE PRECISION,
    status VARCHAR(255),
    last_updated TIMESTAMP,
    user_id BIGINT
);

CREATE TABLE IF NOT EXISTS cameras (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    location VARCHAR(255),
    status VARCHAR(255),
    stream_url VARCHAR(255),
    last_updated TIMESTAMP,
    user_id BIGINT
);

-- Clean up existing data (optional, safe now that tables exist)
TRUNCATE TABLE incidents, alerts, sensors, cameras, user_roles, users RESTART IDENTITY CASCADE;

-- Insert Users
INSERT INTO users (username, password, email) VALUES 
('admin', 'password123', 'admin@urbanops.local'),
('operator1', 'password123', 'operator1@urbanops.local'),
('operator2', 'password123', 'operator2@urbanops.local'),
('manager', 'password123', 'manager@urbanops.local'),
('viewer', 'password123', 'viewer@urbanops.local');

-- Insert Roles
INSERT INTO user_roles (user_id, role) VALUES 
(1, 'ROLE_ADMIN'),
(1, 'ROLE_USER'),
(2, 'ROLE_OPERATOR'),
(2, 'ROLE_USER'),
(3, 'ROLE_OPERATOR'),
(3, 'ROLE_USER'),
(4, 'ROLE_MANAGER'),
(4, 'ROLE_USER'),
(5, 'ROLE_VIEWER'),
(5, 'ROLE_USER');

-- Insert Incidents
-- Admin sees everything (but for now assigning some specifically)
INSERT INTO incidents (description, location, status, severity, user_id) VALUES
('Traffic Accident on MG Road', 'MG Road, Bengaluru', 'ACTIVE', 'HIGH', 1),
('Signal Failure in Koramangala', 'Koramangala 5th Block, Bengaluru', 'ACTIVE', 'CRITICAL', 1),
('Illegal Parking Crackdown', 'Indiranagar, Bengaluru', 'ACTIVE', 'LOW', 2),
('Pothole Reported', 'Whitefield Main Road, Bengaluru', 'PENDING', 'LOW', 2),
('Vehicle Breakdown', 'Outer Ring Road, Bengaluru', 'ACTIVE', 'MEDIUM', 3),
('Road Construction', 'Hosur Road, Bengaluru', 'PLANNED', 'MEDIUM', 4),
('VIP Convoy Escort', 'Airport Road, Bengaluru', 'SCHEDULED', 'HIGH', 5);

-- Insert Alerts
INSERT INTO alerts (title, message, priority, timestamp, user_id) VALUES
('Congestion in Whitefield', 'Traffic flow below 20km/h in Whitefield', 'HIGH', NOW() - INTERVAL '00:45:00', 1),
('System Maintenance', 'Scheduled maintenance at midnight', 'LOW', NOW() - INTERVAL '02:30:00', 1),
('Unauthorized Entry', 'Unauthorized vehicle in Electronic City', 'HIGH', NOW() - INTERVAL '01:15:00', 2),
('Weather Advisory', 'Heavy rain expected this evening', 'MEDIUM', NOW() - INTERVAL '03:20:00', 4),
('Power Surge', 'Substation voltage exceeded 110% in Hebbal', 'CRITICAL', NOW() - INTERVAL '00:25:00', 5);

-- Insert Sensors
INSERT INTO sensors (type, value, status, last_updated, user_id) VALUES
('traffic', 91.4, 'ONLINE', NOW() - INTERVAL '00:10:00', 1),
('environmental', 37.8, 'ONLINE', NOW() - INTERVAL '00:05:00', 1),
('traffic', 56.3, 'ONLINE', NOW() - INTERVAL '00:45:00', 2),
('environmental', 18.9, 'OFFLINE', NOW() - INTERVAL '01:10:00', 2),
('traffic', 73.2, 'ONLINE', NOW() - INTERVAL '00:20:00', 3),
('environmental', 9.4, 'WARNING', NOW() - INTERVAL '02:05:00', 3),
('traffic', 65.7, 'ONLINE', NOW() - INTERVAL '00:55:00', 4),
('environmental', 22.6, 'ONLINE', NOW() - INTERVAL '00:35:00', 4),
('traffic', 81.5, 'ONLINE', NOW() - INTERVAL '00:15:00', 5);

-- Insert Cameras
INSERT INTO cameras (name, location, status, stream_url, last_updated, user_id) VALUES
('Cam-01', 'MG Road Junction, Bengaluru', 'ONLINE', 'rtsp://cam1', NOW(), 1),
('Cam-02', 'Koramangala, Bengaluru', 'ONLINE', 'rtsp://cam2', NOW(), 2),
('Cam-03', 'Outer Ring Road, Bengaluru', 'OFFLINE', 'rtsp://cam3', NOW(), 3),
('Cam-04', 'Whitefield, Bengaluru', 'ONLINE', 'rtsp://cam4', NOW(), 4);
