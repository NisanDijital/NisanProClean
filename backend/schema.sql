CREATE TABLE IF NOT EXISTS referrals (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(12) NOT NULL UNIQUE,
    referral_code VARCHAR(16) NOT NULL UNIQUE,
    points INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(120) NOT NULL,
    phone VARCHAR(12) NOT NULL,
    customer_address VARCHAR(255) NOT NULL DEFAULT '',
    service_type VARCHAR(120) NOT NULL,
    lead_source VARCHAR(64) NOT NULL DEFAULT 'direct',
    utm_source VARCHAR(80) NOT NULL DEFAULT '',
    utm_medium VARCHAR(80) NOT NULL DEFAULT '',
    utm_campaign VARCHAR(120) NOT NULL DEFAULT '',
    pipeline_stage VARCHAR(32) NOT NULL DEFAULT 'appointment',
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    note TEXT NULL,
    admin_note TEXT NULL,
    follow_up_at DATETIME NULL,
    last_contact_at DATETIME NULL,
    review_requested TINYINT(1) NOT NULL DEFAULT 0,
    before_after_ready TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_appointments_dt (appointment_date, appointment_time),
    INDEX idx_appointments_status (status),
    INDEX idx_appointments_pipeline (pipeline_stage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ts DATETIME NOT NULL,
    action_name VARCHAR(64) NOT NULL,
    ok TINYINT(1) NOT NULL,
    ip VARCHAR(64) NOT NULL,
    ua VARCHAR(191) NOT NULL,
    meta_json TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_backups (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(128) NOT NULL,
    records_count INT NOT NULL,
    snapshot_json LONGTEXT NOT NULL,
    created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscriptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(120) NOT NULL,
    phone VARCHAR(12) NOT NULL,
    customer_address VARCHAR(255) NOT NULL DEFAULT '',
    plan_name VARCHAR(80) NOT NULL,
    plan_price INT NOT NULL DEFAULT 0,
    lead_source VARCHAR(64) NOT NULL DEFAULT 'direct',
    utm_source VARCHAR(80) NOT NULL DEFAULT '',
    utm_medium VARCHAR(80) NOT NULL DEFAULT '',
    utm_campaign VARCHAR(120) NOT NULL DEFAULT '',
    pipeline_stage VARCHAR(32) NOT NULL DEFAULT 'new',
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    admin_note TEXT NULL,
    follow_up_at DATETIME NULL,
    last_contact_at DATETIME NULL,
    review_requested TINYINT(1) NOT NULL DEFAULT 0,
    before_after_ready TINYINT(1) NOT NULL DEFAULT 0,
    payload_json TEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_subscriptions_status (status),
    INDEX idx_subscriptions_phone (phone),
    INDEX idx_subscriptions_pipeline (pipeline_stage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blog_posts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(160) NOT NULL UNIQUE,
    title VARCHAR(180) NOT NULL,
    category VARCHAR(80) NOT NULL DEFAULT 'Yerel Rehber',
    excerpt VARCHAR(500) NOT NULL DEFAULT '',
    content MEDIUMTEXT NOT NULL,
    image_url VARCHAR(500) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    published_at DATETIME NULL,
    meta_title VARCHAR(180) NOT NULL DEFAULT '',
    meta_description VARCHAR(320) NOT NULL DEFAULT '',
    author VARCHAR(120) NOT NULL DEFAULT 'NisanProClean',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_blog_status_published (status, published_at),
    INDEX idx_blog_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS referral_otps (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(12) NOT NULL,
    code_hash VARCHAR(128) NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 5,
    expires_at DATETIME NOT NULL,
    consumed TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    ip VARCHAR(64) NOT NULL DEFAULT '',
    INDEX idx_referral_otps_phone (phone),
    INDEX idx_referral_otps_expires (expires_at),
    INDEX idx_referral_otps_consumed (consumed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
