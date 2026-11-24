
CREATE DATABASE IF NOT EXISTS bulan_water_watch
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE bulan_water_watch;

 CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullname VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Customer', 'Station Operator') NOT NULL DEFAULT 'Customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

 CREATE TABLE IF NOT EXISTS water_stations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    address VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    phone VARCHAR(30) DEFAULT NULL,
    hours VARCHAR(100) DEFAULT NULL,
    delivery VARCHAR(100) DEFAULT NULL,
    order_type VARCHAR(100) DEFAULT 'Pickup / Delivery',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

 CREATE TABLE IF NOT EXISTS created_groups (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL,
    station_id INT NOT NULL,
    order_type VARCHAR(50) NOT NULL,
    deadline DATETIME NOT NULL,
    minimum_gallons INT NOT NULL,
    max_participants INT NOT NULL,
    notes TEXT,
    participants INT NOT NULL DEFAULT 1,
    total_gallons INT NOT NULL DEFAULT 0,
    status ENUM('Open', 'Confirmation', 'Closed', 'Completed', 'Rejected')
        NOT NULL DEFAULT 'Open',
    admin_status ENUM('Pending', 'Confirmed', 'Rejected', 'Completed')
        NOT NULL DEFAULT 'Pending',
    date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    admin_last_updated DATETIME DEFAULT NULL,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (station_id) REFERENCES water_stations(id),

    INDEX idx_group_status (status, admin_status),
    INDEX idx_group_deadline (deadline),
    INDEX idx_group_user (user_id)
);

 CREATE TABLE IF NOT EXISTS joined_groups (
    id VARCHAR(70) PRIMARY KEY,
    group_id VARCHAR(50) NOT NULL,
    user_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    is_creator BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM('Joined', 'Cancelled') NOT NULL DEFAULT 'Joined',
    date_joined TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (group_id) REFERENCES created_groups(id),
    FOREIGN KEY (user_id) REFERENCES users(id),

    UNIQUE KEY unique_group_user (group_id, user_id),
    INDEX idx_participant_user (user_id)
);

 CREATE TABLE IF NOT EXISTS order_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id VARCHAR(50) NOT NULL,
    admin_id INT NOT NULL,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (group_id) REFERENCES created_groups(id),
    FOREIGN KEY (admin_id) REFERENCES users(id)
);

 INSERT IGNORE INTO water_stations
(name, address, price, phone, order_type)
VALUES
('Forest Water Refiling Station',
 'N. Vytiaco Street, Bulan, Sorsogon', 25, NULL, 'Pickup / Delivery'),

('Fairways Purified Water Station',
 'Imaculada Concepcion Street, Bulan, Sorsogon', 30, NULL, 'Pickup / Delivery'),

('Summer Water Refilling Station',
 '59 Sta. Remedios, Bulan, Sorsogon', 25, '09273413760', 'Pickup / Delivery'),

('Yhel Pure Purified Water',
 '118 T. De Castro Street, Bulan, Sorsogon', 30, NULL, 'Pickup / Delivery'),

('Uncle J Purified Water Station',
 'Padre Diaz Street, Bulan, Sorsogon', 25, NULL, 'Pickup / Delivery'),

('Viva Mari Water Station',
 'T. De Castro Street, Zone VIII Poblacion, Bulan, Sorsogon',
 30, '09665825981', 'Pickup / Delivery');
