<?php
declare(strict_types=1);

session_start();

header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    exit();
}

const ADMIN_SESSION_KEY = 'npc_admin_auth';

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

function stringLength(string $value): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($value);
    }
    return strlen($value);
}

function normalizePhone(string $value): string
{
    $digits = preg_replace('/\D+/', '', $value) ?? '';

    if (str_starts_with($digits, '90') && strlen($digits) === 12) {
        return $digits;
    }

    if (str_starts_with($digits, '0') && strlen($digits) === 11) {
        return '90' . substr($digits, 1);
    }

    if (strlen($digits) === 10) {
        return '90' . $digits;
    }

    return $digits;
}

function loadAppConfig(): array
{
    $config = [
        'db_enabled' => false,
        'db_host' => 'localhost',
        'db_port' => 3306,
        'db_name' => '',
        'db_user' => '',
        'db_pass' => '',
        'db_charset' => 'utf8mb4',
        'admin_password' => 'CHANGE_ME',
        'cron_token' => 'CHANGE_ME',
        'slot_days' => 14,
        'slot_hours' => ['09:00', '13:00', '17:00'],
        'notify_enabled' => false,
        'notify_mode' => 'webhook',
        'notify_webhook_url' => '',
        'notify_webhook_token' => '',
        'wa_api_version' => 'v20.0',
        'wa_phone_number_id' => '',
        'wa_access_token' => '',
        'wa_to' => '',
        'otp_enabled' => true,
        'otp_secret' => 'CHANGE_ME_OTP_SECRET',
        'otp_ttl_seconds' => 300,
        'otp_max_attempts' => 5,
        'otp_cooldown_seconds' => 60,
        'otp_rate_limit_hour' => 5,
        'csrf_token_ttl_seconds' => 7200,
        'rate_limit_enabled' => true,
        'rate_limit_window_seconds' => 600,
        'rate_limit_max_public' => 20,
        'rate_limit_max_admin_login' => 8,
        'blog_api_token' => '',
    ];

    $configFile = __DIR__ . '/config.php';
    if (is_file($configFile)) {
        $fileConfig = include $configFile;
        if (is_array($fileConfig)) {
            $config = array_merge($config, $fileConfig);
        }
    }

    $envMap = [
        'REFERRAL_DB_ENABLED' => 'db_enabled',
        'REFERRAL_DB_HOST' => 'db_host',
        'REFERRAL_DB_PORT' => 'db_port',
        'REFERRAL_DB_NAME' => 'db_name',
        'REFERRAL_DB_USER' => 'db_user',
        'REFERRAL_DB_PASS' => 'db_pass',
        'REFERRAL_DB_CHARSET' => 'db_charset',
        'REFERRAL_ADMIN_PASSWORD' => 'admin_password',
        'REFERRAL_CRON_TOKEN' => 'cron_token',
        'REFERRAL_NOTIFY_ENABLED' => 'notify_enabled',
        'REFERRAL_NOTIFY_MODE' => 'notify_mode',
        'REFERRAL_NOTIFY_WEBHOOK_URL' => 'notify_webhook_url',
        'REFERRAL_NOTIFY_WEBHOOK_TOKEN' => 'notify_webhook_token',
        'REFERRAL_WA_API_VERSION' => 'wa_api_version',
        'REFERRAL_WA_PHONE_NUMBER_ID' => 'wa_phone_number_id',
        'REFERRAL_WA_ACCESS_TOKEN' => 'wa_access_token',
        'REFERRAL_WA_TO' => 'wa_to',
        'REFERRAL_OTP_ENABLED' => 'otp_enabled',
        'REFERRAL_OTP_SECRET' => 'otp_secret',
        'REFERRAL_OTP_TTL_SECONDS' => 'otp_ttl_seconds',
        'REFERRAL_OTP_MAX_ATTEMPTS' => 'otp_max_attempts',
        'REFERRAL_OTP_COOLDOWN_SECONDS' => 'otp_cooldown_seconds',
        'REFERRAL_OTP_RATE_LIMIT_HOUR' => 'otp_rate_limit_hour',
        'REFERRAL_CSRF_TOKEN_TTL_SECONDS' => 'csrf_token_ttl_seconds',
        'REFERRAL_RATE_LIMIT_ENABLED' => 'rate_limit_enabled',
        'REFERRAL_RATE_LIMIT_WINDOW_SECONDS' => 'rate_limit_window_seconds',
        'REFERRAL_RATE_LIMIT_MAX_PUBLIC' => 'rate_limit_max_public',
        'REFERRAL_RATE_LIMIT_MAX_ADMIN_LOGIN' => 'rate_limit_max_admin_login',
        'NPC_BLOG_API_TOKEN' => 'blog_api_token',
    ];

    foreach ($envMap as $env => $key) {
        $value = getenv($env);
        if ($value === false || $value === '') {
            continue;
        }

        if ($key === 'db_enabled' || $key === 'notify_enabled' || $key === 'otp_enabled' || $key === 'rate_limit_enabled') {
            $config[$key] = in_array(strtolower((string) $value), ['1', 'true', 'yes', 'on'], true);
            continue;
        }

        if (in_array($key, ['db_port', 'otp_ttl_seconds', 'otp_max_attempts', 'otp_cooldown_seconds', 'otp_rate_limit_hour', 'csrf_token_ttl_seconds', 'rate_limit_window_seconds', 'rate_limit_max_public', 'rate_limit_max_admin_login'], true)) {
            $config[$key] = (int) $value;
            continue;
        }

        $config[$key] = (string) $value;
    }

    return $config;
}

function appConfig(): array
{
    static $cfg = null;
    if ($cfg === null) {
        $cfg = loadAppConfig();
    }
    return $cfg;
}

function usingDb(): bool
{
    $cfg = appConfig();
    return (bool) ($cfg['db_enabled'] ?? false);
}

function dbConnection(): ?PDO
{
    static $pdo = null;
    static $attempted = false;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    if ($attempted) {
        return null;
    }
    $attempted = true;

    if (!usingDb()) {
        return null;
    }

    $cfg = appConfig();
    if (trim((string) $cfg['db_name']) === '' || trim((string) $cfg['db_user']) === '') {
        return null;
    }

    try {
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            (string) $cfg['db_host'],
            (int) $cfg['db_port'],
            (string) $cfg['db_name'],
            (string) $cfg['db_charset']
        );

        $pdo = new PDO(
            $dsn,
            (string) $cfg['db_user'],
            (string) $cfg['db_pass'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );

        return $pdo;
    } catch (Throwable $e) {
        return null;
    }
}

function initializeDbSchema(PDO $pdo): void
{
    $safeExec = static function (string $sql) use ($pdo): void {
        try {
            $pdo->exec($sql);
        } catch (Throwable $e) {
            // Ignore duplicate-column style migration errors.
        }
    };

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS referrals (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            phone VARCHAR(12) NOT NULL UNIQUE,
            referral_code VARCHAR(16) NOT NULL UNIQUE,
            points INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS appointments (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            customer_name VARCHAR(120) NOT NULL,
            phone VARCHAR(12) NOT NULL,
            customer_address VARCHAR(255) NOT NULL DEFAULT "",
            service_type VARCHAR(120) NOT NULL,
            lead_source VARCHAR(64) NOT NULL DEFAULT "direct",
            utm_source VARCHAR(80) NOT NULL DEFAULT "",
            utm_medium VARCHAR(80) NOT NULL DEFAULT "",
            utm_campaign VARCHAR(120) NOT NULL DEFAULT "",
            pipeline_stage VARCHAR(32) NOT NULL DEFAULT "appointment",
            appointment_date DATE NOT NULL,
            appointment_time TIME NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT "pending",
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS admin_logs (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            ts DATETIME NOT NULL,
            action_name VARCHAR(64) NOT NULL,
            ok TINYINT(1) NOT NULL,
            ip VARCHAR(64) NOT NULL,
            ua VARCHAR(191) NOT NULL,
            meta_json TEXT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS admin_backups (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            file_name VARCHAR(128) NOT NULL,
            records_count INT NOT NULL,
            snapshot_json LONGTEXT NOT NULL,
            created_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS subscriptions (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            customer_name VARCHAR(120) NOT NULL,
            phone VARCHAR(12) NOT NULL,
            customer_address VARCHAR(255) NOT NULL DEFAULT "",
            plan_name VARCHAR(80) NOT NULL,
            plan_price INT NOT NULL DEFAULT 0,
            lead_source VARCHAR(64) NOT NULL DEFAULT "direct",
            utm_source VARCHAR(80) NOT NULL DEFAULT "",
            utm_medium VARCHAR(80) NOT NULL DEFAULT "",
            utm_campaign VARCHAR(120) NOT NULL DEFAULT "",
            pipeline_stage VARCHAR(32) NOT NULL DEFAULT "new",
            status VARCHAR(20) NOT NULL DEFAULT "new",
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS blog_posts (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            slug VARCHAR(160) NOT NULL UNIQUE,
            title VARCHAR(180) NOT NULL,
            category VARCHAR(80) NOT NULL DEFAULT "Yerel Rehber",
            excerpt VARCHAR(500) NOT NULL DEFAULT "",
            content MEDIUMTEXT NOT NULL,
            image_url VARCHAR(500) NOT NULL DEFAULT "",
            status VARCHAR(20) NOT NULL DEFAULT "draft",
            published_at DATETIME NULL,
            meta_title VARCHAR(180) NOT NULL DEFAULT "",
            meta_description VARCHAR(320) NOT NULL DEFAULT "",
            author VARCHAR(120) NOT NULL DEFAULT "NisanProClean",
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            INDEX idx_blog_status_published (status, published_at),
            INDEX idx_blog_category (category)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    // Backward-compatible migrations for existing tables.
    $safeExec('ALTER TABLE appointments ADD COLUMN lead_source VARCHAR(64) NOT NULL DEFAULT "direct"');
    $safeExec('ALTER TABLE appointments ADD COLUMN utm_source VARCHAR(80) NOT NULL DEFAULT ""');
    $safeExec('ALTER TABLE appointments ADD COLUMN utm_medium VARCHAR(80) NOT NULL DEFAULT ""');
    $safeExec('ALTER TABLE appointments ADD COLUMN utm_campaign VARCHAR(120) NOT NULL DEFAULT ""');
    $safeExec('ALTER TABLE appointments ADD COLUMN pipeline_stage VARCHAR(32) NOT NULL DEFAULT "appointment"');
    $safeExec('ALTER TABLE appointments ADD COLUMN admin_note TEXT NULL');
    $safeExec('ALTER TABLE appointments ADD COLUMN follow_up_at DATETIME NULL');
    $safeExec('ALTER TABLE appointments ADD COLUMN last_contact_at DATETIME NULL');
    $safeExec('ALTER TABLE appointments ADD COLUMN review_requested TINYINT(1) NOT NULL DEFAULT 0');
    $safeExec('ALTER TABLE appointments ADD COLUMN before_after_ready TINYINT(1) NOT NULL DEFAULT 0');
    $safeExec('ALTER TABLE appointments ADD INDEX idx_appointments_pipeline (pipeline_stage)');

    $safeExec('ALTER TABLE subscriptions ADD COLUMN lead_source VARCHAR(64) NOT NULL DEFAULT "direct"');
    $safeExec('ALTER TABLE subscriptions ADD COLUMN utm_source VARCHAR(80) NOT NULL DEFAULT ""');
    $safeExec('ALTER TABLE subscriptions ADD COLUMN utm_medium VARCHAR(80) NOT NULL DEFAULT ""');
    $safeExec('ALTER TABLE subscriptions ADD COLUMN utm_campaign VARCHAR(120) NOT NULL DEFAULT ""');
    $safeExec('ALTER TABLE subscriptions ADD COLUMN pipeline_stage VARCHAR(32) NOT NULL DEFAULT "new"');
    $safeExec('ALTER TABLE subscriptions ADD COLUMN admin_note TEXT NULL');
    $safeExec('ALTER TABLE subscriptions ADD COLUMN follow_up_at DATETIME NULL');
    $safeExec('ALTER TABLE subscriptions ADD COLUMN last_contact_at DATETIME NULL');
    $safeExec('ALTER TABLE subscriptions ADD COLUMN review_requested TINYINT(1) NOT NULL DEFAULT 0');
    $safeExec('ALTER TABLE subscriptions ADD COLUMN before_after_ready TINYINT(1) NOT NULL DEFAULT 0');
    $safeExec('ALTER TABLE subscriptions ADD INDEX idx_subscriptions_pipeline (pipeline_stage)');

    $safeExec('ALTER TABLE blog_posts ADD COLUMN meta_title VARCHAR(180) NOT NULL DEFAULT ""');
    $safeExec('ALTER TABLE blog_posts ADD COLUMN meta_description VARCHAR(320) NOT NULL DEFAULT ""');
    $safeExec('ALTER TABLE blog_posts ADD COLUMN author VARCHAR(120) NOT NULL DEFAULT "NisanProClean"');
    $safeExec('ALTER TABLE blog_posts ADD INDEX idx_blog_status_published (status, published_at)');
    $safeExec('ALTER TABLE blog_posts ADD INDEX idx_blog_category (category)');

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS referral_otps (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            phone VARCHAR(12) NOT NULL,
            code_hash VARCHAR(128) NOT NULL,
            attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
            max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 5,
            expires_at DATETIME NOT NULL,
            consumed TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            ip VARCHAR(64) NOT NULL DEFAULT "",
            INDEX idx_referral_otps_phone (phone),
            INDEX idx_referral_otps_expires (expires_at),
            INDEX idx_referral_otps_consumed (consumed)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function storageDirectoryCandidates(): array
{
    $candidates = [];
    $envPath = getenv('REFERRAL_STORAGE_DIR');
    if (is_string($envPath) && trim($envPath) !== '') {
        $candidates[] = rtrim($envPath, DIRECTORY_SEPARATOR);
    }
    $candidates[] = __DIR__ . '/storage';
    $candidates[] = dirname(__DIR__) . '/referrals_storage';
    return array_values(array_unique($candidates));
}

function ensureDirectory(string $dir): bool
{
    if (is_dir($dir)) {
        return is_writable($dir);
    }
    return mkdir($dir, 0775, true) && is_writable($dir);
}

function storageDir(): string
{
    foreach (storageDirectoryCandidates() as $dir) {
        if (ensureDirectory($dir)) {
            return $dir;
        }
    }

    respond(500, ['success' => false, 'error' => 'Storage klasoru olusturulamadi.']);
}

function referralsPath(string $dir): string
{
    return $dir . '/referrals.json';
}

function logsPath(string $dir): string
{
    return $dir . '/admin_logs.jsonl';
}

function backupsDir(string $dir): string
{
    return $dir . '/backups';
}

function otpPath(string $dir): string
{
    return $dir . '/referral_otps.json';
}

function blogPostsPath(string $dir): string
{
    return $dir . '/blog_posts.json';
}

function readReferralsFromFile(string $path): array
{
    if (!file_exists($path)) {
        return [];
    }

    $content = file_get_contents($path);
    if ($content === false || trim($content) === '') {
        return [];
    }

    $decoded = json_decode($content, true);
    return is_array($decoded) ? $decoded : [];
}

function writeReferralsToFile(string $path, array $data): void
{
    $handle = fopen($path, 'c+');
    if ($handle === false) {
        respond(500, ['success' => false, 'error' => 'Storage dosyasi acilamadi.']);
    }

    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        respond(500, ['success' => false, 'error' => 'Storage kilidi alinamadi.']);
    }

    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
}

function readJsonArrayFile(string $path): array
{
    if (!file_exists($path)) {
        return [];
    }

    $content = file_get_contents($path);
    if ($content === false || trim($content) === '') {
        return [];
    }

    $decoded = json_decode($content, true);
    return is_array($decoded) ? $decoded : [];
}

function writeJsonArrayFile(string $path, array $data): void
{
    $handle = fopen($path, 'c+');
    if ($handle === false) {
        respond(500, ['success' => false, 'error' => 'Storage dosyasi acilamadi.']);
    }

    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        respond(500, ['success' => false, 'error' => 'Storage kilidi alinamadi.']);
    }

    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
}

function fetchAllReferrals(string $storageDir): array
{
    $pdo = dbConnection();
    if ($pdo instanceof PDO) {
        $stmt = $pdo->query('SELECT phone, referral_code, points, created_at, updated_at FROM referrals ORDER BY updated_at DESC');
        $rows = $stmt->fetchAll();
        return is_array($rows) ? $rows : [];
    }

    return readReferralsFromFile(referralsPath($storageDir));
}

function getReferralByPhone(string $storageDir, string $phone): ?array
{
    $pdo = dbConnection();
    if ($pdo instanceof PDO) {
        $stmt = $pdo->prepare('SELECT phone, referral_code, points, created_at, updated_at FROM referrals WHERE phone = :phone LIMIT 1');
        $stmt->execute(['phone' => $phone]);
        $row = $stmt->fetch();
        return is_array($row) ? $row : null;
    }

    $rows = readReferralsFromFile(referralsPath($storageDir));
    foreach ($rows as $row) {
        if ((string) ($row['phone'] ?? '') === $phone) {
            return $row;
        }
    }
    return null;
}

function createReferral(string $storageDir, string $phone): array
{
    $pdo = dbConnection();
    $now = gmdate('Y-m-d H:i:s');
    $isoNow = gmdate('c');

    if ($pdo instanceof PDO) {
        for ($i = 0; $i < 10; $i++) {
            $code = 'NPN' . strtoupper(bin2hex(random_bytes(2)));
            try {
                $stmt = $pdo->prepare(
                    'INSERT INTO referrals (phone, referral_code, points, created_at, updated_at)
                     VALUES (:phone, :code, 0, :created_at, :updated_at)'
                );
                $stmt->execute([
                    'phone' => $phone,
                    'code' => $code,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                return [
                    'phone' => $phone,
                    'referral_code' => $code,
                    'points' => 0,
                    'created_at' => $isoNow,
                    'updated_at' => $isoNow,
                ];
            } catch (Throwable $e) {
                continue;
            }
        }

        respond(500, ['success' => false, 'error' => 'Benzersiz kod olusturulamadi.']);
    }

    $path = referralsPath($storageDir);
    $records = readReferralsFromFile($path);
    $existingCodes = array_column($records, 'referral_code');

    $code = '';
    for ($i = 0; $i < 10; $i++) {
        $candidate = 'NPN' . strtoupper(bin2hex(random_bytes(2)));
        if (!in_array($candidate, $existingCodes, true)) {
            $code = $candidate;
            break;
        }
    }

    if ($code === '') {
        respond(500, ['success' => false, 'error' => 'Benzersiz kod olusturulamadi.']);
    }

    $newRecord = [
        'phone' => $phone,
        'referral_code' => $code,
        'points' => 0,
        'created_at' => $isoNow,
        'updated_at' => $isoNow,
    ];
    $records[] = $newRecord;
    writeReferralsToFile($path, $records);
    return $newRecord;
}

function updateReferralPoints(string $storageDir, string $code, string $phone, int $points): bool
{
    $pdo = dbConnection();
    if ($pdo instanceof PDO) {
        if ($code !== '') {
            $stmt = $pdo->prepare('UPDATE referrals SET points = :points, updated_at = :updated_at WHERE referral_code = :code');
            $stmt->execute(['points' => $points, 'updated_at' => gmdate('Y-m-d H:i:s'), 'code' => $code]);
            if ($stmt->rowCount() > 0) {
                return true;
            }
        }

        if ($phone !== '') {
            $stmt = $pdo->prepare('UPDATE referrals SET points = :points, updated_at = :updated_at WHERE phone = :phone');
            $stmt->execute(['points' => $points, 'updated_at' => gmdate('Y-m-d H:i:s'), 'phone' => $phone]);
            return $stmt->rowCount() > 0;
        }

        return false;
    }

    $path = referralsPath($storageDir);
    $rows = readReferralsFromFile($path);
    $updated = false;
    foreach ($rows as &$row) {
        $matchesCode = $code !== '' && strtoupper((string) ($row['referral_code'] ?? '')) === $code;
        $matchesPhone = $phone !== '' && (string) ($row['phone'] ?? '') === $phone;
        if (!$matchesCode && !$matchesPhone) {
            continue;
        }
        $row['points'] = $points;
        $row['updated_at'] = gmdate('c');
        $updated = true;
        break;
    }
    unset($row);

    if ($updated) {
        writeReferralsToFile($path, $rows);
    }

    return $updated;
}

function createBackupSnapshot(string $storageDir, array $records): array
{
    $filename = 'referrals-' . gmdate('Ymd-His') . '.json';
    $json = json_encode($records, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($json)) {
        respond(500, ['success' => false, 'error' => 'Backup olusturulamadi.']);
    }

    $pdo = dbConnection();
    if ($pdo instanceof PDO) {
        $stmt = $pdo->prepare(
            'INSERT INTO admin_backups (file_name, records_count, snapshot_json, created_at)
             VALUES (:file_name, :records_count, :snapshot_json, :created_at)'
        );
        $stmt->execute([
            'file_name' => $filename,
            'records_count' => count($records),
            'snapshot_json' => $json,
            'created_at' => gmdate('Y-m-d H:i:s'),
        ]);
    }

    $backupDir = backupsDir($storageDir);
    if (ensureDirectory($backupDir)) {
        file_put_contents($backupDir . '/' . $filename, $json, LOCK_EX);
    }

    return ['file' => $filename, 'count' => count($records)];
}

function logAdminAction(string $storageDir, string $action, bool $ok, array $meta = []): void
{
    $entry = [
        'ts' => gmdate('c'),
        'action' => $action,
        'ok' => $ok,
        'ip' => clientIp(),
        'ua' => substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 180),
        'meta' => $meta,
    ];

    $pdo = dbConnection();
    if ($pdo instanceof PDO) {
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO admin_logs (ts, action_name, ok, ip, ua, meta_json)
                 VALUES (:ts, :action_name, :ok, :ip, :ua, :meta_json)'
            );
            $stmt->execute([
                'ts' => gmdate('Y-m-d H:i:s'),
                'action_name' => $action,
                'ok' => $ok ? 1 : 0,
                'ip' => clientIp(),
                'ua' => substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 180),
                'meta_json' => json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);
            return;
        } catch (Throwable $e) {
            // fallback to file logging
        }
    }

    $payload = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (is_string($payload)) {
        file_put_contents(logsPath($storageDir), $payload . PHP_EOL, FILE_APPEND | LOCK_EX);
    }
}

function readAdminLogs(string $storageDir, int $max = 200): array
{
    $pdo = dbConnection();
    if ($pdo instanceof PDO) {
        $stmt = $pdo->prepare(
            'SELECT ts, action_name, ok, ip, ua, meta_json
             FROM admin_logs
             ORDER BY id DESC
             LIMIT :max_rows'
        );
        $stmt->bindValue('max_rows', $max, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();
        if (!is_array($rows)) {
            return [];
        }
        $result = [];
        foreach ($rows as $row) {
            $result[] = [
                'ts' => (string) ($row['ts'] ?? ''),
                'action' => (string) ($row['action_name'] ?? ''),
                'ok' => (bool) ($row['ok'] ?? false),
                'ip' => (string) ($row['ip'] ?? ''),
                'ua' => (string) ($row['ua'] ?? ''),
                'meta' => json_decode((string) ($row['meta_json'] ?? '{}'), true) ?: [],
            ];
        }
        return $result;
    }

    $path = logsPath($storageDir);
    if (!file_exists($path)) {
        return [];
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) {
        return [];
    }

    $lines = array_slice($lines, -1 * $max);
    $rows = [];
    foreach ($lines as $line) {
        $decoded = json_decode($line, true);
        if (is_array($decoded)) {
            $rows[] = $decoded;
        }
    }

    return array_reverse($rows);
}

function readJsonPayload(): array
{
    static $cachedPayload = null;
    if (is_array($cachedPayload)) {
        return $cachedPayload;
    }

    $payload = json_decode(file_get_contents('php://input') ?: '{}', true);
    if (!is_array($payload)) {
        respond(400, ['success' => false, 'error' => 'Gecersiz veri gonderildi.']);
    }
    $cachedPayload = $payload;
    return $cachedPayload;
}

function headerValue(string $name): string
{
    $serverKey = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
    $value = $_SERVER[$serverKey] ?? '';
    return is_string($value) ? trim($value) : '';
}

function clientIp(): string
{
    $direct = trim((string) ($_SERVER['REMOTE_ADDR'] ?? ''));
    return $direct !== '' ? $direct : 'unknown';
}

function rateLimitPath(string $dir): string
{
    return $dir . '/rate_limits.json';
}

function csrfTokenTtlSeconds(): int
{
    return max(600, min(86400, (int) (appConfig()['csrf_token_ttl_seconds'] ?? 7200)));
}

function csrfToken(): string
{
    $token = (string) ($_SESSION['csrf_token'] ?? '');
    $issuedAt = (int) ($_SESSION['csrf_token_issued_at'] ?? 0);
    $ttl = csrfTokenTtlSeconds();
    $now = time();

    if ($token !== '' && $issuedAt > 0 && ($now - $issuedAt) < $ttl) {
        return $token;
    }

    $token = bin2hex(random_bytes(32));
    $_SESSION['csrf_token'] = $token;
    $_SESSION['csrf_token_issued_at'] = $now;
    return $token;
}

function verifyCsrfToken(): bool
{
    $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');
    if ($sessionToken === '') {
        return false;
    }

    $headerToken = headerValue('X-CSRF-Token');
    if ($headerToken !== '' && hash_equals($sessionToken, $headerToken)) {
        return true;
    }

    $payload = readJsonPayload();
    $payloadToken = trim((string) ($payload['csrf_token'] ?? ''));
    if ($payloadToken !== '' && hash_equals($sessionToken, $payloadToken)) {
        return true;
    }

    return false;
}

function isRateLimitEnabled(): bool
{
    return (bool) (appConfig()['rate_limit_enabled'] ?? true);
}

function rateLimitWindowSeconds(): int
{
    return max(30, min(7200, (int) (appConfig()['rate_limit_window_seconds'] ?? 600)));
}

function rateLimitMaxPublic(): int
{
    return max(5, min(200, (int) (appConfig()['rate_limit_max_public'] ?? 20)));
}

function rateLimitMaxAdminLogin(): int
{
    return max(3, min(50, (int) (appConfig()['rate_limit_max_admin_login'] ?? 8)));
}

function consumeRateLimit(string $storageDir, string $key, int $maxAttempts, int $windowSeconds): array
{
    $path = rateLimitPath($storageDir);
    $state = readJsonArrayFile($path);
    $now = time();
    $windowStart = $now;
    $attempts = 0;

    $entry = $state[$key] ?? null;
    if (is_array($entry)) {
        $entryStart = (int) ($entry['window_start'] ?? 0);
        $entryAttempts = (int) ($entry['attempts'] ?? 0);
        if ($entryStart > 0 && ($now - $entryStart) < $windowSeconds) {
            $windowStart = $entryStart;
            $attempts = $entryAttempts;
        }
    }

    if ($attempts >= $maxAttempts) {
        $retryAfter = max(1, $windowSeconds - ($now - $windowStart));
        return ['ok' => false, 'retry_after' => $retryAfter];
    }

    $state[$key] = [
        'window_start' => $windowStart,
        'attempts' => $attempts + 1,
    ];

    foreach ($state as $stateKey => $stateEntry) {
        if (!is_array($stateEntry)) {
            unset($state[$stateKey]);
            continue;
        }
        $entryStart = (int) ($stateEntry['window_start'] ?? 0);
        if ($entryStart <= 0 || ($now - $entryStart) >= ($windowSeconds * 2)) {
            unset($state[$stateKey]);
        }
    }

    writeJsonArrayFile($path, $state);
    return ['ok' => true, 'retry_after' => 0];
}

function containsSpamPayloadValue(string $value): bool
{
    if ($value === '') {
        return false;
    }
    if (preg_match('/https?:\/\/|www\.|<script|<a\s|<\/\w+>/i', $value)) {
        return true;
    }
    return false;
}

function enforcePostSecurity(string $storageDir, string $action): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        return;
    }

    if (isBlogTokenAuthenticated($action)) {
        return;
    }

    if (!verifyCsrfToken()) {
        respond(419, ['success' => false, 'error' => 'Guvenlik dogrulamasi basarisiz. Sayfayi yenileyip tekrar deneyin.']);
    }

    if (!isRateLimitEnabled()) {
        return;
    }

    $window = rateLimitWindowSeconds();
    $ip = clientIp();

    if ($action === 'admin_login') {
        $result = consumeRateLimit($storageDir, 'admin_login:' . $ip, rateLimitMaxAdminLogin(), $window);
        if (!$result['ok']) {
            respond(429, ['success' => false, 'error' => 'Cok fazla giris denemesi. Lutfen biraz sonra tekrar deneyin.', 'retry_after' => $result['retry_after']]);
        }
        return;
    }

    $publicActions = ['generate', 'referral_otp_request', 'referral_otp_verify', 'appointment_book', 'subscription_create'];
    if (!in_array($action, $publicActions, true)) {
        return;
    }

    $payload = readJsonPayload();
    $honeypotFields = ['website', 'hp', 'company_website'];
    foreach ($honeypotFields as $field) {
        $value = trim((string) ($payload[$field] ?? ''));
        if ($value !== '') {
            respond(422, ['success' => false, 'error' => 'Gecersiz istek.']);
        }
    }

    foreach (['name', 'address', 'service', 'plan_name', 'note'] as $field) {
        $value = trim((string) ($payload[$field] ?? ''));
        if (containsSpamPayloadValue($value)) {
            respond(422, ['success' => false, 'error' => 'Icerikte gecersiz karakter veya link tespit edildi.']);
        }
    }

    $phone = normalizePhone((string) ($payload['phone'] ?? ''));
    $bucketKey = $action . ':' . $ip;
    if ($phone !== '') {
        $bucketKey .= ':' . $phone;
    }
    $result = consumeRateLimit($storageDir, $bucketKey, rateLimitMaxPublic(), $window);
    if (!$result['ok']) {
        respond(429, ['success' => false, 'error' => 'Cok fazla deneme yapildi. Lutfen biraz sonra tekrar deneyin.', 'retry_after' => $result['retry_after']]);
    }
}

function queryString(string $key, string $default = ''): string
{
    $value = $_GET[$key] ?? $default;
    return is_string($value) ? trim($value) : $default;
}

function queryInt(string $key, int $default): int
{
    $value = $_GET[$key] ?? $default;
    return is_numeric($value) ? (int) $value : $default;
}

function cleanAttribution(string $value, int $max = 120): string
{
    $v = strtolower(trim($value));
    $v = preg_replace('/[^a-z0-9_\-\.]+/i', '_', $v) ?? '';
    return substr($v, 0, $max);
}

function cleanPlainText(string $value, int $max): string
{
    $value = trim(strip_tags($value));
    $value = preg_replace('/\s+/u', ' ', $value) ?? $value;
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max);
    }
    return substr($value, 0, $max);
}

function cleanSlug(string $value): string
{
    $value = trim($value);
    if ($value === '') {
        return '';
    }
    $map = [
        'ç' => 'c', 'Ç' => 'c',
        'ğ' => 'g', 'Ğ' => 'g',
        'ı' => 'i', 'İ' => 'i',
        'ö' => 'o', 'Ö' => 'o',
        'ş' => 's', 'Ş' => 's',
        'ü' => 'u', 'Ü' => 'u',
    ];
    $value = strtr($value, $map);
    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
    $value = trim($value, '-');
    return substr($value, 0, 160);
}

function cleanBlogContent(string $value): string
{
    $allowed = '<p><br><strong><b><em><i><ul><ol><li><h2><h3><a>';
    $value = trim(strip_tags($value, $allowed));
    $value = preg_replace('/\son\w+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $value) ?? $value;
    $value = preg_replace('/(href)\s*=\s*([\'"])\s*javascript:[^\'"]*\2/i', 'href="#"', $value) ?? $value;
    $value = preg_replace('/<a\s+/i', '<a rel="nofollow noopener" target="_blank" ', $value) ?? $value;
    return $value;
}

function normalizeBlogStatus(string $value): string
{
    $status = strtolower(trim($value));
    return in_array($status, ['draft', 'published'], true) ? $status : 'draft';
}

function normalizeBlogPost(array $row): array
{
    return [
        'id' => (int) ($row['id'] ?? 0),
        'slug' => (string) ($row['slug'] ?? ''),
        'title' => (string) ($row['title'] ?? ''),
        'category' => (string) ($row['category'] ?? 'Yerel Rehber'),
        'excerpt' => (string) ($row['excerpt'] ?? ''),
        'content' => (string) ($row['content'] ?? ''),
        'image' => (string) ($row['image_url'] ?? ($row['image'] ?? '')),
        'status' => (string) ($row['status'] ?? 'draft'),
        'published_at' => (string) ($row['published_at'] ?? ''),
        'meta_title' => (string) ($row['meta_title'] ?? ''),
        'meta_description' => (string) ($row['meta_description'] ?? ''),
        'author' => (string) ($row['author'] ?? 'NisanProClean'),
        'created_at' => (string) ($row['created_at'] ?? ''),
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
}

function blogApiToken(): string
{
    $cfg = appConfig();
    return trim((string) ($cfg['blog_api_token'] ?? ''));
}

function isBlogTokenAuthenticated(string $action): bool
{
    if (!in_array($action, ['admin_blog_upsert', 'admin_blog_delete'], true)) {
        return false;
    }

    $expected = blogApiToken();
    if ($expected === '' || $expected === 'CHANGE_ME') {
        return false;
    }

    $authorization = headerValue('Authorization');
    $token = '';
    if (preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)) {
        $token = trim($matches[1]);
    }
    if ($token === '') {
        $token = headerValue('X-Blog-Api-Token');
    }

    return $token !== '' && hash_equals($expected, $token);
}

function leadAttributionFromPayload(array $payload): array
{
    $source = cleanAttribution((string) ($payload['source'] ?? ''), 64);
    if ($source === '') {
        $source = cleanAttribution((string) ($_GET['source'] ?? ''), 64);
    }
    if ($source === '') {
        $source = 'direct';
    }

    return [
        'source' => $source,
        'utm_source' => cleanAttribution((string) ($payload['utm_source'] ?? ($_GET['utm_source'] ?? '')), 80),
        'utm_medium' => cleanAttribution((string) ($payload['utm_medium'] ?? ($_GET['utm_medium'] ?? '')), 80),
        'utm_campaign' => cleanAttribution((string) ($payload['utm_campaign'] ?? ($_GET['utm_campaign'] ?? '')), 120),
    ];
}

function leadPipelineStages(): array
{
    return ['new', 'called', 'quoted', 'appointment', 'completed', 'review_requested'];
}

function normalizePipelineStage(string $value, string $default = 'new'): string
{
    $stage = strtolower(trim($value));
    return in_array($stage, leadPipelineStages(), true) ? $stage : $default;
}

function parseNullableDatetimeInput($value): ?string
{
    if (!is_string($value)) {
        return null;
    }

    $trimmed = trim($value);
    if ($trimmed === '') {
        return null;
    }

    $formats = ['Y-m-d\TH:i', 'Y-m-d H:i', DateTimeInterface::ATOM];
    foreach ($formats as $format) {
        $dt = DateTimeImmutable::createFromFormat($format, $trimmed);
        if ($dt instanceof DateTimeImmutable) {
            return $dt->format('Y-m-d H:i:s');
        }
    }

    return null;
}

function boolInt($value): int
{
    return in_array($value, [1, '1', true, 'true', 'on', 'yes'], true) ? 1 : 0;
}

function leadPriorityMeta(array $row): array
{
    $score = 0;
    $pipelineStage = (string) ($row['pipeline_stage'] ?? 'new');
    $leadSource = strtolower((string) ($row['lead_source'] ?? 'direct'));
    $status = (string) ($row['status'] ?? '');
    $followUpAt = (string) ($row['follow_up_at'] ?? '');
    $appointmentDate = (string) ($row['appointment_date'] ?? '');

    if ($pipelineStage === 'new') {
        $score += 30;
    } elseif ($pipelineStage === 'quoted') {
        $score += 24;
    } elseif ($pipelineStage === 'called') {
        $score += 18;
    } elseif ($pipelineStage === 'appointment') {
        $score += 14;
    } elseif ($pipelineStage === 'completed') {
        $score += 10;
    }

    if (in_array($leadSource, ['whatsapp', 'instagram'], true)) {
        $score += 10;
    }

    if ($followUpAt !== '') {
        $now = gmdate('Y-m-d H:i:s');
        if ($followUpAt <= $now) {
            $score += 35;
        } else {
            $tomorrow = (new DateTimeImmutable('+1 day'))->format('Y-m-d H:i:s');
            if ($followUpAt <= $tomorrow) {
                $score += 15;
            }
        }
    }

    if ($appointmentDate !== '' && in_array($status, ['pending', 'confirmed'], true)) {
        $today = gmdate('Y-m-d');
        $tomorrow = (new DateTimeImmutable('+1 day'))->format('Y-m-d');
        if ($appointmentDate === $today) {
            $score += 25;
        } elseif ($appointmentDate === $tomorrow) {
            $score += 15;
        }
    }

    $label = 'normal';
    if ($score >= 60) {
        $label = 'acil';
    } elseif ($score >= 35) {
        $label = 'sicak';
    }

    return ['score' => $score, 'label' => $label];
}

function leadSuggestedMessage(array $row): string
{
    $name = trim((string) ($row['customer_name'] ?? ''));
    $firstName = $name !== '' ? explode(' ', $name)[0] : 'Merhaba';
    $title = trim((string) ($row['lead_title'] ?? 'talebiniz'));
    $pipelineStage = (string) ($row['pipeline_stage'] ?? 'new');
    $appointmentDate = (string) ($row['appointment_date'] ?? '');
    $appointmentTime = substr((string) ($row['appointment_time'] ?? ''), 0, 5);
    $reviewRequested = boolInt($row['review_requested'] ?? 0) === 1;

    if ($reviewRequested || $pipelineStage === 'review_requested') {
        return $firstName . ", bugunku hizmetimiz sonrasi memnuniyetinizi merak ediyoruz. Memnun kaldiysaniz kisa bir Google yorumu birakmaniz bize cok destek olur.";
    }

    if ($pipelineStage === 'appointment' && $appointmentDate !== '') {
        return $firstName . ", randevunuz " . $appointmentDate . ' ' . $appointmentTime . " icin kayitli gorunuyor. Saat ve adres uygunsa bu mesaja kisaca donmeniz yeterli.";
    }

    if ($pipelineStage === 'quoted') {
        return $firstName . ", " . $title . " icin fiyat bilginiz hazir. Uygun gorurseniz size en yakin randevu saatini hemen ayiralim.";
    }

    if ($pipelineStage === 'called') {
        return $firstName . ", az onceki gorusmemize istinaden size en uygun slotu ayarlayabilirim. Uygunsaniz bugun icin planlama yapalim.";
    }

    if ($pipelineStage === 'completed') {
        return $firstName . ", hizmet tamamlandi gorunuyor. Kisa bir memnuniyet geri bildirimi paylasirsaniz sonraki takipleri buna gore duzenleyebilirim.";
    }

    return $firstName . ", NisanProClean'e biraktiginiz " . $title . " talebinizi aldim. Uygunluk ve net fiyat icin isterseniz hemen planlama yapabiliriz.";
}

function isAdminAuthed(): bool
{
    return isset($_SESSION[ADMIN_SESSION_KEY]) && $_SESSION[ADMIN_SESSION_KEY] === true;
}

function requireAdmin(string $storageDir): void
{
    if (isAdminAuthed()) {
        return;
    }

    logAdminAction($storageDir, 'admin_unauthorized', false);
    respond(401, ['success' => false, 'error' => 'Admin girisi gerekli.']);
}

function requireAdminOrBlogToken(string $storageDir, string $action): void
{
    if (isAdminAuthed() || isBlogTokenAuthenticated($action)) {
        return;
    }

    logAdminAction($storageDir, 'blog_api_unauthorized', false, ['action' => $action]);
    respond(401, ['success' => false, 'error' => 'Admin girisi veya blog API token gerekli.']);
}

function adminPassword(): string
{
    $cfg = appConfig();
    return (string) ($cfg['admin_password'] ?? 'CHANGE_ME');
}

function notificationsEnabled(): bool
{
    $cfg = appConfig();
    return (bool) ($cfg['notify_enabled'] ?? false);
}

function normalizeE164(string $value): string
{
    $digits = preg_replace('/\D+/', '', $value) ?? '';
    if ($digits === '') {
        return '';
    }
    if (str_starts_with($digits, '00')) {
        $digits = substr($digits, 2);
    }
    if ($digits[0] !== '9' && strlen($digits) === 10) {
        $digits = '90' . $digits;
    }
    if ($digits[0] === '0' && strlen($digits) === 11) {
        $digits = '90' . substr($digits, 1);
    }
    return '+' . $digits;
}

function postJson(string $url, array $payload, array $headers = [], int $timeout = 12): array
{
    if (!function_exists('curl_init')) {
        return ['ok' => false, 'error' => 'curl_extension_missing', 'status' => 0, 'body' => ''];
    }

    $ch = curl_init($url);
    if ($ch === false) {
        return ['ok' => false, 'error' => 'curl_init_failed', 'status' => 0, 'body' => ''];
    }

    $httpHeaders = ['Content-Type: application/json', 'Accept: application/json'];
    foreach ($headers as $header) {
        if (is_string($header) && trim($header) !== '') {
            $httpHeaders[] = $header;
        }
    }

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_HTTPHEADER => $httpHeaders,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => $timeout,
        CURLOPT_TIMEOUT => $timeout,
    ]);

    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if (!is_string($body)) {
        $body = '';
    }

    if ($curlError !== '') {
        return ['ok' => false, 'error' => $curlError, 'status' => $status, 'body' => $body];
    }

    return ['ok' => $status >= 200 && $status < 300, 'error' => '', 'status' => $status, 'body' => $body];
}

function sendNotificationEvent(string $eventName, array $eventPayload): array
{
    if (!notificationsEnabled()) {
        return ['ok' => false, 'error' => 'notify_disabled', 'status' => 0];
    }

    $cfg = appConfig();
    $mode = strtolower(trim((string) ($cfg['notify_mode'] ?? 'webhook')));

    if ($mode === 'whatsapp_cloud') {
        $to = normalizeE164((string) ($cfg['wa_to'] ?? ''));
        $phoneNumberId = trim((string) ($cfg['wa_phone_number_id'] ?? ''));
        $accessToken = trim((string) ($cfg['wa_access_token'] ?? ''));
        $apiVersion = trim((string) ($cfg['wa_api_version'] ?? 'v20.0'));

        if ($to === '' || $phoneNumberId === '' || $accessToken === '') {
            return ['ok' => false, 'error' => 'wa_config_missing', 'status' => 0];
        }

        $text = (string) ($eventPayload['message'] ?? '');
        if ($text === '') {
            return ['ok' => false, 'error' => 'wa_message_empty', 'status' => 0];
        }

        $url = 'https://graph.facebook.com/' . rawurlencode($apiVersion) . '/' . rawurlencode($phoneNumberId) . '/messages';
        $result = postJson($url, [
            'messaging_product' => 'whatsapp',
            'to' => ltrim($to, '+'),
            'type' => 'text',
            'text' => ['body' => $text],
        ], ['Authorization: Bearer ' . $accessToken], 15);

        return $result;
    }

    $webhookUrl = trim((string) ($cfg['notify_webhook_url'] ?? ''));
    if ($webhookUrl === '') {
        return ['ok' => false, 'error' => 'webhook_url_missing', 'status' => 0];
    }

    $headers = [];
    $webhookToken = trim((string) ($cfg['notify_webhook_token'] ?? ''));
    if ($webhookToken !== '') {
        $headers[] = 'Authorization: Bearer ' . $webhookToken;
    }

    $result = postJson($webhookUrl, [
        'event' => $eventName,
        'ts' => gmdate('c'),
        'payload' => $eventPayload,
    ], $headers, 15);

    return $result;
}

function notifyAppointmentBooked(string $storageDir, array $data): void
{
    $message =
        "Yeni randevu talebi\n" .
        'Musteri: ' . ($data['name'] ?? '-') . "\n" .
        'Telefon: ' . ($data['phone'] ?? '-') . "\n" .
        'Adres: ' . ($data['address'] ?? '-') . "\n" .
        'Hizmet: ' . ($data['service'] ?? '-') . "\n" .
        'Tarih/Saat: ' . ($data['date'] ?? '-') . ' ' . ($data['time'] ?? '-') . "\n" .
        'Not: ' . ($data['note'] ?? '-');

    $result = sendNotificationEvent('appointment_booked', [
        'name' => (string) ($data['name'] ?? ''),
        'phone' => (string) ($data['phone'] ?? ''),
        'address' => (string) ($data['address'] ?? ''),
        'service' => (string) ($data['service'] ?? ''),
        'date' => (string) ($data['date'] ?? ''),
        'time' => (string) ($data['time'] ?? ''),
        'note' => (string) ($data['note'] ?? ''),
        'message' => $message,
    ]);

    logAdminAction($storageDir, 'notify_appointment_booked', (bool) ($result['ok'] ?? false), [
        'status' => (int) ($result['status'] ?? 0),
        'error' => (string) ($result['error'] ?? ''),
    ]);
}

function notifySubscriptionCreated(string $storageDir, array $data): void
{
    $message =
        "Yeni uyelik basvurusu\n" .
        'Musteri: ' . ($data['name'] ?? '-') . "\n" .
        'Telefon: ' . ($data['phone'] ?? '-') . "\n" .
        'Adres: ' . ($data['address'] ?? '-') . "\n" .
        'Paket: ' . ($data['plan_name'] ?? '-') . "\n" .
        'Fiyat: ' . (string) ($data['plan_price'] ?? 0) . " TL/ay";

    $result = sendNotificationEvent('subscription_created', [
        'name' => (string) ($data['name'] ?? ''),
        'phone' => (string) ($data['phone'] ?? ''),
        'address' => (string) ($data['address'] ?? ''),
        'plan_name' => (string) ($data['plan_name'] ?? ''),
        'plan_price' => (int) ($data['plan_price'] ?? 0),
        'message' => $message,
    ]);

    logAdminAction($storageDir, 'notify_subscription_created', (bool) ($result['ok'] ?? false), [
        'status' => (int) ($result['status'] ?? 0),
        'error' => (string) ($result['error'] ?? ''),
    ]);
}

function otpEnabled(): bool
{
    return (bool) (appConfig()['otp_enabled'] ?? true);
}

function otpSecret(): string
{
    return (string) (appConfig()['otp_secret'] ?? 'CHANGE_ME_OTP_SECRET');
}

function otpTtlSeconds(): int
{
    return max(120, min(900, (int) (appConfig()['otp_ttl_seconds'] ?? 300)));
}

function otpMaxAttempts(): int
{
    return max(3, min(10, (int) (appConfig()['otp_max_attempts'] ?? 5)));
}

function otpCooldownSeconds(): int
{
    return max(30, min(180, (int) (appConfig()['otp_cooldown_seconds'] ?? 60)));
}

function otpRateLimitHour(): int
{
    return max(3, min(20, (int) (appConfig()['otp_rate_limit_hour'] ?? 5)));
}

function requestIp(): string
{
    return (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
}

function otpHashForPhone(string $phone, string $otp): string
{
    return hash_hmac('sha256', $phone . '|' . $otp, otpSecret());
}

function createReferralOtp(string $storageDir, string $phone, string $code): void
{
    $maxAttempts = otpMaxAttempts();
    $expiresAt = gmdate('Y-m-d H:i:s', time() + otpTtlSeconds());
    $now = gmdate('Y-m-d H:i:s');
    $codeHash = otpHashForPhone($phone, $code);

    $pdo = dbConnection();
    if ($pdo instanceof PDO) {
        $stmt = $pdo->prepare(
            'INSERT INTO referral_otps
            (phone, code_hash, attempts, max_attempts, expires_at, consumed, created_at, updated_at, ip)
            VALUES
            (:phone, :code_hash, 0, :max_attempts, :expires_at, 0, :created_at, :updated_at, :ip)'
        );
        $stmt->execute([
            'phone' => $phone,
            'code_hash' => $codeHash,
            'max_attempts' => $maxAttempts,
            'expires_at' => $expiresAt,
            'created_at' => $now,
            'updated_at' => $now,
            'ip' => requestIp(),
        ]);
        return;
    }

    $path = otpPath($storageDir);
    $rows = readJsonArrayFile($path);
    $rows[] = [
        'id' => count($rows) + 1,
        'phone' => $phone,
        'code_hash' => $codeHash,
        'attempts' => 0,
        'max_attempts' => $maxAttempts,
        'expires_at' => gmdate('c', time() + otpTtlSeconds()),
        'consumed' => false,
        'created_at' => gmdate('c'),
        'updated_at' => gmdate('c'),
        'ip' => requestIp(),
    ];
    writeJsonArrayFile($path, $rows);
}

function latestOtpRecord(string $storageDir, string $phone): ?array
{
    $pdo = dbConnection();
    if ($pdo instanceof PDO) {
        $stmt = $pdo->prepare(
            'SELECT id, phone, code_hash, attempts, max_attempts, expires_at, consumed, created_at, updated_at
             FROM referral_otps
             WHERE phone = :phone
             ORDER BY id DESC
             LIMIT 1'
        );
        $stmt->execute(['phone' => $phone]);
        $row = $stmt->fetch();
        return is_array($row) ? $row : null;
    }

    $rows = readJsonArrayFile(otpPath($storageDir));
    for ($i = count($rows) - 1; $i >= 0; $i--) {
        $row = $rows[$i];
        if ((string) ($row['phone'] ?? '') === $phone) {
            return $row;
        }
    }
    return null;
}

function otpRateLimitExceeded(string $storageDir, string $phone): bool
{
    $limit = otpRateLimitHour();
    $sinceTs = gmdate('Y-m-d H:i:s', time() - 3600);

    $pdo = dbConnection();
    if ($pdo instanceof PDO) {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM referral_otps
             WHERE phone = :phone
               AND created_at >= :since_ts'
        );
        $stmt->execute(['phone' => $phone, 'since_ts' => $sinceTs]);
        return ((int) $stmt->fetchColumn()) >= $limit;
    }

    $rows = readJsonArrayFile(otpPath($storageDir));
    $count = 0;
    $since = strtotime('-1 hour');
    foreach ($rows as $row) {
        if ((string) ($row['phone'] ?? '') !== $phone) {
            continue;
        }
        $createdAt = strtotime((string) ($row['created_at'] ?? ''));
        if ($createdAt !== false && $createdAt >= $since) {
            $count++;
        }
    }
    return $count >= $limit;
}

function otpCooldownRemaining(string $storageDir, string $phone): int
{
    $latest = latestOtpRecord($storageDir, $phone);
    if (!is_array($latest)) {
        return 0;
    }

    $createdAt = strtotime((string) ($latest['created_at'] ?? ''));
    if ($createdAt === false) {
        return 0;
    }

    $left = ($createdAt + otpCooldownSeconds()) - time();
    return max(0, $left);
}

function markOtpAttempt(string $storageDir, int $otpId, bool $consume): void
{
    $pdo = dbConnection();
    if ($pdo instanceof PDO) {
        if ($consume) {
            $stmt = $pdo->prepare(
                'UPDATE referral_otps
                 SET attempts = attempts + 1, consumed = 1, updated_at = :updated_at
                 WHERE id = :id'
            );
            $stmt->execute(['updated_at' => gmdate('Y-m-d H:i:s'), 'id' => $otpId]);
            return;
        }

        $stmt = $pdo->prepare(
            'UPDATE referral_otps
             SET attempts = attempts + 1, updated_at = :updated_at
             WHERE id = :id'
        );
        $stmt->execute(['updated_at' => gmdate('Y-m-d H:i:s'), 'id' => $otpId]);
        return;
    }

    $path = otpPath($storageDir);
    $rows = readJsonArrayFile($path);
    foreach ($rows as &$row) {
        if ((int) ($row['id'] ?? 0) !== $otpId) {
            continue;
        }
        $row['attempts'] = (int) ($row['attempts'] ?? 0) + 1;
        if ($consume) {
            $row['consumed'] = true;
        }
        $row['updated_at'] = gmdate('c');
        break;
    }
    unset($row);
    writeJsonArrayFile($path, $rows);
}

function handleReferralOtpRequest(string $storageDir): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        respond(405, ['success' => false, 'error' => 'Gecersiz istek.']);
    }
    if (!otpEnabled()) {
        respond(503, ['success' => false, 'error' => 'Dogrulama sistemi devre disi.']);
    }

    $payload = readJsonPayload();
    $phone = normalizePhone((string) ($payload['phone'] ?? ''));
    if (!preg_match('/^90[5][0-9]{9}$/', $phone)) {
        respond(422, ['success' => false, 'error' => 'Telefon numarasi gecersiz.']);
    }

    $cooldown = otpCooldownRemaining($storageDir, $phone);
    if ($cooldown > 0) {
        respond(429, ['success' => false, 'error' => 'Lutfen tekrar denemeden once bekleyin.', 'cooldown_seconds' => $cooldown]);
    }
    if (otpRateLimitExceeded($storageDir, $phone)) {
        respond(429, ['success' => false, 'error' => 'Cok fazla kod talebi. 1 saat sonra tekrar deneyin.']);
    }

    $otp = (string) random_int(100000, 999999);

    $result = sendNotificationEvent('referral_otp', [
        'phone' => $phone,
        'otp' => $otp,
        'message' => 'NisanProClean dogrulama kodunuz: ' . $otp . ' (5 dakika gecerli)',
    ]);

    if (!($result['ok'] ?? false)) {
        logAdminAction($storageDir, 'referral_otp_send', false, ['phone' => $phone, 'error' => (string) ($result['error'] ?? '')]);
        respond(503, ['success' => false, 'error' => 'Dogrulama kodu gonderilemedi. Bildirim servisini kontrol edin.']);
    }

    createReferralOtp($storageDir, $phone, $otp);
    logAdminAction($storageDir, 'referral_otp_send', true, ['phone' => $phone]);
    respond(200, [
        'success' => true,
        'ttl_seconds' => otpTtlSeconds(),
        'cooldown_seconds' => otpCooldownSeconds(),
    ]);
}

function handleReferralOtpVerify(string $storageDir): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        respond(405, ['success' => false, 'error' => 'Gecersiz istek.']);
    }
    if (!otpEnabled()) {
        respond(503, ['success' => false, 'error' => 'Dogrulama sistemi devre disi.']);
    }

    $payload = readJsonPayload();
    $phone = normalizePhone((string) ($payload['phone'] ?? ''));
    $otp = preg_replace('/\D+/', '', (string) ($payload['otp'] ?? '')) ?? '';
    if (!preg_match('/^90[5][0-9]{9}$/', $phone) || strlen($otp) !== 6) {
        respond(422, ['success' => false, 'error' => 'Telefon veya kod gecersiz.']);
    }

    $record = latestOtpRecord($storageDir, $phone);
    if (!is_array($record)) {
        respond(404, ['success' => false, 'error' => 'Aktif dogrulama kodu bulunamadi.']);
    }

    $expiresAtTs = strtotime((string) ($record['expires_at'] ?? ''));
    $attempts = (int) ($record['attempts'] ?? 0);
    $maxAttempts = max(1, (int) ($record['max_attempts'] ?? otpMaxAttempts()));
    $consumed = (bool) ($record['consumed'] ?? false);

    if ($consumed || $expiresAtTs === false || $expiresAtTs < time()) {
        respond(410, ['success' => false, 'error' => 'Kodun suresi dolmus. Lutfen yeni kod isteyin.']);
    }
    if ($attempts >= $maxAttempts) {
        respond(429, ['success' => false, 'error' => 'Maksimum deneme sayisina ulasildi.']);
    }

    $expectedHash = (string) ($record['code_hash'] ?? '');
    $providedHash = otpHashForPhone($phone, $otp);
    if (!hash_equals($expectedHash, $providedHash)) {
        markOtpAttempt($storageDir, (int) ($record['id'] ?? 0), false);
        $remaining = max(0, $maxAttempts - ($attempts + 1));
        respond(401, ['success' => false, 'error' => 'Kod hatali.', 'remaining_attempts' => $remaining]);
    }

    markOtpAttempt($storageDir, (int) ($record['id'] ?? 0), true);

    $existing = getReferralByPhone($storageDir, $phone);
    if (is_array($existing)) {
        respond(200, [
            'success' => true,
            'code' => (string) ($existing['referral_code'] ?? ''),
            'points' => (int) ($existing['points'] ?? 0),
            'existing' => true,
        ]);
    }

    $created = createReferral($storageDir, $phone);
    respond(201, [
        'success' => true,
        'code' => (string) ($created['referral_code'] ?? ''),
        'points' => 0,
        'existing' => false,
    ]);
}

function handleGenerate(string $storageDir): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        respond(405, ['success' => false, 'error' => 'Gecersiz istek.']);
    }

    $payload = readJsonPayload();
    $phone = normalizePhone((string) ($payload['phone'] ?? ''));
    if (!preg_match('/^90[5][0-9]{9}$/', $phone)) {
        respond(422, ['success' => false, 'error' => 'Telefon numarasi gecersiz.']);
    }

    $existing = getReferralByPhone($storageDir, $phone);
    if (is_array($existing)) {
        respond(200, [
            'success' => true,
            'code' => (string) ($existing['referral_code'] ?? ''),
            'points' => (int) ($existing['points'] ?? 0),
            'existing' => true,
        ]);
    }

    $created = createReferral($storageDir, $phone);
    respond(201, [
        'success' => true,
        'code' => (string) ($created['referral_code'] ?? ''),
        'points' => 0,
        'existing' => false,
    ]);
}

function handleAdminStatus(): void
{
    respond(200, ['success' => true, 'authed' => isAdminAuthed(), 'using_db' => dbConnection() instanceof PDO]);
}

function handleCsrfToken(): void
{
    respond(200, ['success' => true, 'token' => csrfToken(), 'ttl_seconds' => csrfTokenTtlSeconds()]);
}

function handleAdminLogin(string $storageDir): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        respond(405, ['success' => false, 'error' => 'Gecersiz istek.']);
    }

    $payload = readJsonPayload();
    $password = (string) ($payload['password'] ?? '');
    if (!hash_equals(adminPassword(), $password)) {
        logAdminAction($storageDir, 'admin_login', false);
        respond(401, ['success' => false, 'error' => 'Sifre hatali.']);
    }

    $_SESSION[ADMIN_SESSION_KEY] = true;
    logAdminAction($storageDir, 'admin_login', true);
    respond(200, ['success' => true, 'authed' => true]);
}

function handleAdminLogout(string $storageDir): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        respond(405, ['success' => false, 'error' => 'Gecersiz istek.']);
    }

    unset($_SESSION[ADMIN_SESSION_KEY]);
    logAdminAction($storageDir, 'admin_logout', true);
    respond(200, ['success' => true, 'authed' => false]);
}

function handleAdminList(string $storageDir): void
{
    requireAdmin($storageDir);

    $search = queryString('search', '');
    $minPoints = queryInt('min_points', 0);
    $maxPoints = queryInt('max_points', 100000);
    $page = max(1, queryInt('page', 1));
    $pageSize = max(5, min(100, queryInt('page_size', 20)));

    $rows = fetchAllReferrals($storageDir);
    $filtered = array_values(array_filter($rows, static function (array $row) use ($search, $minPoints, $maxPoints): bool {
        $points = (int) ($row['points'] ?? 0);
        if ($points < $minPoints || $points > $maxPoints) {
            return false;
        }

        if ($search === '') {
            return true;
        }

        $haystack = strtolower(
            (string) ($row['phone'] ?? '') . ' ' .
            (string) ($row['referral_code'] ?? '') . ' ' .
            (string) ($row['created_at'] ?? '') . ' ' .
            (string) ($row['updated_at'] ?? '')
        );
        return str_contains($haystack, strtolower($search));
    }));

    $total = count($filtered);
    $offset = ($page - 1) * $pageSize;
    $paged = array_slice($filtered, $offset, $pageSize);

    logAdminAction($storageDir, 'admin_list', true, ['total' => $total, 'page' => $page, 'page_size' => $pageSize]);
    respond(200, [
        'success' => true,
        'total' => $total,
        'page' => $page,
        'page_size' => $pageSize,
        'records' => $paged,
    ]);
}

function handleAdminUpdatePoints(string $storageDir): void
{
    requireAdmin($storageDir);
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        respond(405, ['success' => false, 'error' => 'Gecersiz istek.']);
    }

    $payload = readJsonPayload();
    $targetCode = strtoupper(trim((string) ($payload['code'] ?? '')));
    $targetPhone = normalizePhone((string) ($payload['phone'] ?? ''));
    $points = (int) ($payload['points'] ?? 0);

    if ($points < 0 || $points > 100000) {
        respond(422, ['success' => false, 'error' => 'Puan araligi gecersiz.']);
    }
    if ($targetCode === '' && $targetPhone === '') {
        respond(422, ['success' => false, 'error' => 'Kod veya telefon gerekli.']);
    }

    $updated = updateReferralPoints($storageDir, $targetCode, $targetPhone, $points);
    if (!$updated) {
        logAdminAction($storageDir, 'admin_update_points', false, ['code' => $targetCode, 'phone' => $targetPhone]);
        respond(404, ['success' => false, 'error' => 'Kayit bulunamadi.']);
    }

    logAdminAction($storageDir, 'admin_update_points', true, ['code' => $targetCode, 'phone' => $targetPhone, 'points' => $points]);
    respond(200, ['success' => true]);
}

function handleAdminBackup(string $storageDir): void
{
    requireAdmin($storageDir);
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        respond(405, ['success' => false, 'error' => 'Gecersiz istek.']);
    }

    $rows = fetchAllReferrals($storageDir);
    $backup = createBackupSnapshot($storageDir, $rows);
    logAdminAction($storageDir, 'admin_backup', true, $backup);
    respond(200, ['success' => true, 'file' => $backup['file'], 'count' => $backup['count']]);
}

function handleAdminLogs(string $storageDir): void
{
    requireAdmin($storageDir);
    $rows = readAdminLogs($storageDir, 250);
    respond(200, ['success' => true, 'total' => count($rows), 'logs' => $rows]);
}

function handleCronBackup(string $storageDir): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
        respond(405, ['success' => false, 'error' => 'Gecersiz istek.']);
    }

    $token = queryString('token', '');
    $expected = (string) (appConfig()['cron_token'] ?? '');
    if ($expected === '' || !hash_equals($expected, $token)) {
        respond(401, ['success' => false, 'error' => 'Token gecersiz.']);
    }

    $rows = fetchAllReferrals($storageDir);
    $backup = createBackupSnapshot($storageDir, $rows);
    logAdminAction($storageDir, 'cron_backup', true, $backup);
    respond(200, ['success' => true, 'file' => $backup['file'], 'count' => $backup['count']]);
}

function configuredSlotHours(): array
{
    $hours = appConfig()['slot_hours'] ?? [];
    if (!is_array($hours) || count($hours) === 0) {
        $hours = ['09:00', '13:00', '17:00'];
    }

    $clean = [];
    foreach ($hours as $hour) {
        $h = is_string($hour) ? trim($hour) : '';
        if (preg_match('/^\d{2}:\d{2}$/', $h)) {
            $clean[] = $h;
        }
    }
    return array_values(array_unique($clean));
}

function configuredSlotDays(): int
{
    $days = (int) (appConfig()['slot_days'] ?? 14);
    return max(1, min(30, $days));
}

function existingAppointmentMap(PDO $pdo, string $startDate, string $endDate): array
{
    $stmt = $pdo->prepare(
        'SELECT appointment_date, appointment_time
         FROM appointments
         WHERE appointment_date BETWEEN :start_date AND :end_date
           AND status IN ("pending", "confirmed")'
    );
    $stmt->execute(['start_date' => $startDate, 'end_date' => $endDate]);
    $rows = $stmt->fetchAll();
    if (!is_array($rows)) {
        return [];
    }

    $map = [];
    foreach ($rows as $row) {
        $date = (string) ($row['appointment_date'] ?? '');
        $time = substr((string) ($row['appointment_time'] ?? ''), 0, 5);
        if ($date === '' || $time === '') {
            continue;
        }
        $map[$date . ' ' . $time] = true;
    }
    return $map;
}

function handleAppointmentSlots(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
        respond(405, ['success' => false, 'error' => 'Gecersiz istek.']);
    }

    $pdo = dbConnection();
    if (!($pdo instanceof PDO)) {
        respond(503, ['success' => false, 'error' => 'Randevu sistemi su an aktif degil.']);
    }

    $days = configuredSlotDays();
    $hours = configuredSlotHours();
    $today = new DateTimeImmutable('today');
    $end = $today->modify('+' . ($days - 1) . ' days');
    $busyMap = existingAppointmentMap($pdo, $today->format('Y-m-d'), $end->format('Y-m-d'));

    $slots = [];
    for ($i = 0; $i < $days; $i++) {
        $date = $today->modify('+' . $i . ' days');
        if ((int) $date->format('N') === 7) {
            continue;
        }

        $dateStr = $date->format('Y-m-d');
        $items = [];
        foreach ($hours as $time) {
            $items[] = ['time' => $time, 'available' => !isset($busyMap[$dateStr . ' ' . $time])];
        }
        $slots[] = ['date' => $dateStr, 'label' => $date->format('d.m.Y'), 'items' => $items];
    }

    respond(200, ['success' => true, 'slots' => $slots]);
}

function handleAppointmentBook(string $storageDir): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        respond(405, ['success' => false, 'error' => 'Gecersiz istek.']);
    }

    $pdo = dbConnection();
    if (!($pdo instanceof PDO)) {
        respond(503, ['success' => false, 'error' => 'Randevu sistemi su an aktif degil.']);
    }

    $payload = readJsonPayload();
    $attribution = leadAttributionFromPayload($payload);
    $name = trim((string) ($payload['name'] ?? ''));
    $phone = normalizePhone((string) ($payload['phone'] ?? ''));
    $address = trim((string) ($payload['address'] ?? ''));
    $service = trim((string) ($payload['service'] ?? 'Koltuk Yikama'));
    $date = trim((string) ($payload['date'] ?? ''));
    $time = trim((string) ($payload['time'] ?? ''));
    $note = trim((string) ($payload['note'] ?? ''));

    if ($name === '' || stringLength($name) < 2) {
        respond(422, ['success' => false, 'error' => 'Isim gecersiz.']);
    }
    if (stringLength($name) > 120) {
        respond(422, ['success' => false, 'error' => 'Isim cok uzun.']);
    }
    if (!preg_match('/^90[5][0-9]{9}$/', $phone)) {
        respond(422, ['success' => false, 'error' => 'Telefon numarasi gecersiz.']);
    }
    if ($address === '' || stringLength($address) < 5) {
        respond(422, ['success' => false, 'error' => 'Adres bilgisi gecersiz.']);
    }
    if (stringLength($address) > 255) {
        respond(422, ['success' => false, 'error' => 'Adres cok uzun.']);
    }
    if ($service === '' || stringLength($service) > 120) {
        respond(422, ['success' => false, 'error' => 'Hizmet tipi gecersiz.']);
    }
    if (stringLength($note) > 500) {
        respond(422, ['success' => false, 'error' => 'Not alani cok uzun.']);
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || !preg_match('/^\d{2}:\d{2}$/', $time)) {
        respond(422, ['success' => false, 'error' => 'Tarih veya saat gecersiz.']);
    }
    if (!in_array($time, configuredSlotHours(), true)) {
        respond(422, ['success' => false, 'error' => 'Secilen saat desteklenmiyor.']);
    }

    $selected = DateTimeImmutable::createFromFormat('Y-m-d H:i', $date . ' ' . $time);
    if (!($selected instanceof DateTimeImmutable)) {
        respond(422, ['success' => false, 'error' => 'Tarih veya saat gecersiz.']);
    }
    if ((int) $selected->format('N') === 7) {
        respond(422, ['success' => false, 'error' => 'Pazar gunu randevu yok.']);
    }
    if ($selected < new DateTimeImmutable('+1 hour')) {
        respond(422, ['success' => false, 'error' => 'Gecmis veya cok yakin saat secilemez.']);
    }

    $check = $pdo->prepare(
        'SELECT id FROM appointments
         WHERE appointment_date = :appointment_date
           AND appointment_time = :appointment_time
           AND status IN ("pending", "confirmed")
         LIMIT 1'
    );
    $check->execute(['appointment_date' => $date, 'appointment_time' => $time . ':00']);
    if ($check->fetch()) {
        respond(409, ['success' => false, 'error' => 'Bu saat dolu, baska saat secin.']);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO appointments
         (customer_name, phone, customer_address, service_type, lead_source, utm_source, utm_medium, utm_campaign, pipeline_stage, appointment_date, appointment_time, status, note, created_at, updated_at)
         VALUES
         (:customer_name, :phone, :customer_address, :service_type, :lead_source, :utm_source, :utm_medium, :utm_campaign, "appointment", :appointment_date, :appointment_time, "pending", :note, :created_at, :updated_at)'
    );
    $now = gmdate('Y-m-d H:i:s');
    $stmt->execute([
        'customer_name' => $name,
        'phone' => $phone,
        'customer_address' => substr($address, 0, 255),
        'service_type' => $service,
        'lead_source' => $attribution['source'],
        'utm_source' => $attribution['utm_source'],
        'utm_medium' => $attribution['utm_medium'],
        'utm_campaign' => $attribution['utm_campaign'],
        'appointment_date' => $date,
        'appointment_time' => $time . ':00',
        'note' => $note,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    logAdminAction($storageDir, 'appointment_book', true, ['date' => $date, 'time' => $time, 'phone' => $phone]);
    notifyAppointmentBooked($storageDir, [
        'name' => $name,
        'phone' => $phone,
        'address' => $address,
        'service' => $service,
        'date' => $date,
        'time' => $time,
        'note' => $note,
    ]);
    respond(201, ['success' => true, 'message' => 'Randevu olusturuldu.']);
}

function handleSubscriptionCreate(string $storageDir): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        respond(405, ['success' => false, 'error' => 'Gecersiz istek.']);
    }

    $pdo = dbConnection();
    if (!($pdo instanceof PDO)) {
        respond(503, ['success' => false, 'error' => 'Uyelik sistemi su an aktif degil.']);
    }

    $payload = readJsonPayload();
    $attribution = leadAttributionFromPayload($payload);
    $name = trim((string) ($payload['name'] ?? ''));
    $phone = normalizePhone((string) ($payload['phone'] ?? ''));
    $address = trim((string) ($payload['address'] ?? ''));
    $planName = trim((string) ($payload['plan_name'] ?? ''));
    $planPrice = (int) ($payload['plan_price'] ?? 0);

    if ($name === '' || stringLength($name) < 2) {
        respond(422, ['success' => false, 'error' => 'Isim gecersiz.']);
    }
    if (stringLength($name) > 120) {
        respond(422, ['success' => false, 'error' => 'Isim cok uzun.']);
    }
    if (!preg_match('/^90[5][0-9]{9}$/', $phone)) {
        respond(422, ['success' => false, 'error' => 'Telefon numarasi gecersiz.']);
    }
    if ($address !== '' && stringLength($address) > 255) {
        respond(422, ['success' => false, 'error' => 'Adres cok uzun.']);
    }
    if ($planName === '' || stringLength($planName) < 2) {
        respond(422, ['success' => false, 'error' => 'Paket adi gecersiz.']);
    }
    if (stringLength($planName) > 80) {
        respond(422, ['success' => false, 'error' => 'Paket adi cok uzun.']);
    }
    if ($planPrice < 0 || $planPrice > 100000) {
        respond(422, ['success' => false, 'error' => 'Paket fiyati gecersiz.']);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO subscriptions
         (customer_name, phone, customer_address, plan_name, plan_price, lead_source, utm_source, utm_medium, utm_campaign, pipeline_stage, status, payload_json, created_at, updated_at)
         VALUES
         (:customer_name, :phone, :customer_address, :plan_name, :plan_price, :lead_source, :utm_source, :utm_medium, :utm_campaign, "new", "new", :payload_json, :created_at, :updated_at)'
    );
    $now = gmdate('Y-m-d H:i:s');
    $stmt->execute([
        'customer_name' => $name,
        'phone' => $phone,
        'customer_address' => substr($address, 0, 255),
        'plan_name' => substr($planName, 0, 80),
        'plan_price' => $planPrice,
        'lead_source' => $attribution['source'],
        'utm_source' => $attribution['utm_source'],
        'utm_medium' => $attribution['utm_medium'],
        'utm_campaign' => $attribution['utm_campaign'],
        'payload_json' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    logAdminAction($storageDir, 'subscription_create', true, ['phone' => $phone, 'plan' => $planName]);
    notifySubscriptionCreated($storageDir, [
        'name' => $name,
        'phone' => $phone,
        'address' => $address,
        'plan_name' => $planName,
        'plan_price' => $planPrice,
    ]);
    respond(201, ['success' => true, 'message' => 'Uyelik basvurunuz alindi. En kisa surede sizi arayacagiz.']);
}

function handleAdminSubscriptions(string $storageDir): void
{
    requireAdmin($storageDir);
    $pdo = dbConnection();
    if (!($pdo instanceof PDO)) {
        respond(503, ['success' => false, 'error' => 'Uyelik sistemi su an aktif degil.']);
    }

    $status = queryString('status', '');
    $page = max(1, queryInt('page', 1));
    $pageSize = max(5, min(100, queryInt('page_size', 20)));
    $offset = ($page - 1) * $pageSize;

    $where = '';
    $params = [];
    if ($status !== '' && in_array($status, ['new', 'contacted', 'confirmed', 'cancelled'], true)) {
        $where = ' WHERE status = :status ';
        $params['status'] = $status;
    }

    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM subscriptions' . $where);
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $sql = 'SELECT id, customer_name, phone, customer_address, plan_name, plan_price, lead_source, utm_source, utm_medium, utm_campaign, pipeline_stage, status, admin_note, follow_up_at, last_contact_at, review_requested, before_after_ready, created_at
            FROM subscriptions' . $where . '
            ORDER BY id DESC
            LIMIT :limit OFFSET :offset';
    $stmt = $pdo->prepare($sql);
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v);
    }
    $stmt->bindValue('limit', $pageSize, PDO::PARAM_INT);
    $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();
    if (!is_array($rows)) {
        $rows = [];
    }

    logAdminAction($storageDir, 'admin_subscriptions', true, ['total' => $total, 'page' => $page]);
    respond(200, ['success' => true, 'total' => $total, 'page' => $page, 'page_size' => $pageSize, 'records' => $rows]);
}

function handleAdminSubscriptionStatus(string $storageDir): void
{
    requireAdmin($storageDir);
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        respond(405, ['success' => false, 'error' => 'Gecersiz istek.']);
    }

    $pdo = dbConnection();
    if (!($pdo instanceof PDO)) {
        respond(503, ['success' => false, 'error' => 'Uyelik sistemi su an aktif degil.']);
    }

    $payload = readJsonPayload();
    $id = (int) ($payload['id'] ?? 0);
    $status = trim((string) ($payload['status'] ?? ''));
    if ($id <= 0 || !in_array($status, ['new', 'contacted', 'confirmed', 'cancelled'], true)) {
        respond(422, ['success' => false, 'error' => 'Parametre gecersiz.']);
    }

    $nextStage = $status === 'contacted'
        ? 'called'
        : ($status === 'confirmed' ? 'appointment' : 'new');
    $stmt = $pdo->prepare('UPDATE subscriptions SET status = :status, pipeline_stage = :pipeline_stage, last_contact_at = :last_contact_at, updated_at = :updated_at WHERE id = :id');
    $stmt->execute([
        'status' => $status,
        'pipeline_stage' => $nextStage,
        'last_contact_at' => $status === 'new' ? null : gmdate('Y-m-d H:i:s'),
        'updated_at' => gmdate('Y-m-d H:i:s'),
        'id' => $id,
    ]);
    if ($stmt->rowCount() === 0) {
        $existsStmt = $pdo->prepare('SELECT id FROM subscriptions WHERE id = :id LIMIT 1');
        $existsStmt->execute(['id' => $id]);
        if (!$existsStmt->fetch()) {
            respond(404, ['success' => false, 'error' => 'Basvuru bulunamadi.']);
        }
    }

    logAdminAction($storageDir, 'admin_subscription_status', true, ['id' => $id, 'status' => $status]);
    respond(200, ['success' => true]);
}

function handleAdminAppointments(string $storageDir): void
{
    requireAdmin($storageDir);
    $pdo = dbConnection();
    if (!($pdo instanceof PDO)) {
        respond(503, ['success' => false, 'error' => 'Randevu sistemi su an aktif degil.']);
    }

    $status = queryString('status', '');
    $page = max(1, queryInt('page', 1));
    $pageSize = max(5, min(100, queryInt('page_size', 20)));
    $offset = ($page - 1) * $pageSize;

    $where = '';
    $params = [];
    if ($status !== '' && in_array($status, ['pending', 'confirmed', 'cancelled', 'done'], true)) {
        $where = ' WHERE status = :status ';
        $params['status'] = $status;
    }

    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM appointments' . $where);
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $sql = 'SELECT id, customer_name, phone, customer_address, service_type, lead_source, utm_source, utm_medium, utm_campaign, pipeline_stage, appointment_date, appointment_time, status, note, admin_note, follow_up_at, last_contact_at, review_requested, before_after_ready, created_at
            FROM appointments' . $where . '
            ORDER BY appointment_date DESC, appointment_time DESC
            LIMIT :limit OFFSET :offset';
    $stmt = $pdo->prepare($sql);
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v);
    }
    $stmt->bindValue('limit', $pageSize, PDO::PARAM_INT);
    $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();
    if (!is_array($rows)) {
        $rows = [];
    }

    logAdminAction($storageDir, 'admin_appointments', true, ['total' => $total, 'page' => $page]);
    respond(200, ['success' => true, 'total' => $total, 'page' => $page, 'page_size' => $pageSize, 'records' => $rows]);
}

function handleAdminAppointmentStatus(string $storageDir): void
{
    requireAdmin($storageDir);
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        respond(405, ['success' => false, 'error' => 'Gecersiz istek.']);
    }

    $pdo = dbConnection();
    if (!($pdo instanceof PDO)) {
        respond(503, ['success' => false, 'error' => 'Randevu sistemi su an aktif degil.']);
    }

    $payload = readJsonPayload();
    $id = (int) ($payload['id'] ?? 0);
    $status = trim((string) ($payload['status'] ?? ''));
    if ($id <= 0 || !in_array($status, ['pending', 'confirmed', 'cancelled', 'done'], true)) {
        respond(422, ['success' => false, 'error' => 'Parametre gecersiz.']);
    }

    $nextStage = $status === 'done'
        ? 'completed'
        : ($status === 'confirmed' ? 'appointment' : 'new');
    $stmt = $pdo->prepare('UPDATE appointments SET status = :status, pipeline_stage = :pipeline_stage, last_contact_at = :last_contact_at, updated_at = :updated_at WHERE id = :id');
    $stmt->execute([
        'status' => $status,
        'pipeline_stage' => $nextStage,
        'last_contact_at' => $status === 'pending' ? null : gmdate('Y-m-d H:i:s'),
        'updated_at' => gmdate('Y-m-d H:i:s'),
        'id' => $id,
    ]);
    if ($stmt->rowCount() === 0) {
        $existsStmt = $pdo->prepare('SELECT id FROM appointments WHERE id = :id LIMIT 1');
        $existsStmt->execute(['id' => $id]);
        if (!$existsStmt->fetch()) {
            respond(404, ['success' => false, 'error' => 'Randevu bulunamadi.']);
        }
    }

    logAdminAction($storageDir, 'admin_appointment_status', true, ['id' => $id, 'status' => $status]);
    respond(200, ['success' => true]);
}

function fetchAdminLeadRows(PDO $pdo): array
{
    $appointmentRows = $pdo->query(
        'SELECT
            "appointment" AS lead_type,
            id,
            customer_name,
            phone,
            customer_address,
            service_type AS lead_title,
            lead_source,
            pipeline_stage,
            status,
            admin_note,
            follow_up_at,
            last_contact_at,
            review_requested,
            before_after_ready,
            created_at,
            appointment_date,
            appointment_time
        FROM appointments
        ORDER BY created_at DESC
        LIMIT 250'
    )->fetchAll();

    $subscriptionRows = $pdo->query(
        'SELECT
            "subscription" AS lead_type,
            id,
            customer_name,
            phone,
            customer_address,
            CONCAT(plan_name, " / ", plan_price, " TL") AS lead_title,
            lead_source,
            pipeline_stage,
            status,
            admin_note,
            follow_up_at,
            last_contact_at,
            review_requested,
            before_after_ready,
            created_at,
            NULL AS appointment_date,
            NULL AS appointment_time
        FROM subscriptions
        ORDER BY created_at DESC
        LIMIT 250'
    )->fetchAll();

    $rows = array_merge(is_array($appointmentRows) ? $appointmentRows : [], is_array($subscriptionRows) ? $subscriptionRows : []);
    usort($rows, static function (array $left, array $right): int {
        return strcmp((string) ($right['created_at'] ?? ''), (string) ($left['created_at'] ?? ''));
    });

    return $rows;
}

function handleAdminLeads(string $storageDir): void
{
    requireAdmin($storageDir);
    $pdo = dbConnection();
    if (!($pdo instanceof PDO)) {
        respond(503, ['success' => false, 'error' => 'Lead sistemi su an aktif degil.']);
    }

    $leadType = queryString('lead_type', '');
    $pipelineStage = normalizePipelineStage(queryString('pipeline_stage', ''), '');
    $source = cleanAttribution(queryString('source', ''), 64);
    $dueOnly = queryInt('due_only', 0) === 1;
    $page = max(1, queryInt('page', 1));
    $pageSize = max(5, min(100, queryInt('page_size', 50)));
    $rows = fetchAdminLeadRows($pdo);

    $filtered = array_values(array_filter($rows, static function (array $row) use ($leadType, $pipelineStage, $source, $dueOnly): bool {
        if ($leadType !== '' && (string) ($row['lead_type'] ?? '') !== $leadType) {
            return false;
        }
        if ($pipelineStage !== '' && (string) ($row['pipeline_stage'] ?? '') !== $pipelineStage) {
            return false;
        }
        if ($source !== '' && (string) ($row['lead_source'] ?? '') !== $source) {
            return false;
        }
        if ($dueOnly) {
            $followUpAt = (string) ($row['follow_up_at'] ?? '');
            if ($followUpAt === '' || $followUpAt > gmdate('Y-m-d H:i:s')) {
                return false;
            }
        }
        return true;
    }));

    $total = count($filtered);
    $offset = ($page - 1) * $pageSize;
    $records = array_map(static function (array $row): array {
        $priority = leadPriorityMeta($row);
        $row['priority_score'] = $priority['score'];
        $row['priority_label'] = $priority['label'];
        $row['suggested_message'] = leadSuggestedMessage($row);
        return $row;
    }, array_slice($filtered, $offset, $pageSize));

    logAdminAction($storageDir, 'admin_leads', true, ['total' => $total, 'page' => $page, 'filters' => ['lead_type' => $leadType, 'pipeline_stage' => $pipelineStage, 'source' => $source, 'due_only' => $dueOnly]]);
    respond(200, ['success' => true, 'total' => $total, 'page' => $page, 'page_size' => $pageSize, 'records' => $records]);
}

function handleAdminLeadUpdate(string $storageDir): void
{
    requireAdmin($storageDir);
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        respond(405, ['success' => false, 'error' => 'Gecersiz istek.']);
    }

    $pdo = dbConnection();
    if (!($pdo instanceof PDO)) {
        respond(503, ['success' => false, 'error' => 'Lead sistemi su an aktif degil.']);
    }

    $payload = readJsonPayload();
    $leadType = trim((string) ($payload['lead_type'] ?? ''));
    $id = (int) ($payload['id'] ?? 0);

    if (!in_array($leadType, ['appointment', 'subscription'], true) || $id <= 0) {
        respond(422, ['success' => false, 'error' => 'Lead bilgisi gecersiz.']);
    }

    $table = $leadType === 'appointment' ? 'appointments' : 'subscriptions';
    $currentStmt = $pdo->prepare(
        'SELECT pipeline_stage, follow_up_at, admin_note, review_requested, before_after_ready
         FROM ' . $table . '
         WHERE id = :id
         LIMIT 1'
    );
    $currentStmt->execute(['id' => $id]);
    $current = $currentStmt->fetch();
    if (!is_array($current)) {
        respond(404, ['success' => false, 'error' => 'Lead bulunamadi.']);
    }

    $pipelineStage = array_key_exists('pipeline_stage', $payload)
        ? normalizePipelineStage((string) $payload['pipeline_stage'], (string) ($current['pipeline_stage'] ?? 'new'))
        : (string) ($current['pipeline_stage'] ?? 'new');
    $followUpAt = array_key_exists('follow_up_at', $payload)
        ? parseNullableDatetimeInput($payload['follow_up_at'] ?? null)
        : ((string) ($current['follow_up_at'] ?? '') !== '' ? (string) $current['follow_up_at'] : null);
    $adminNote = array_key_exists('admin_note', $payload)
        ? trim((string) $payload['admin_note'])
        : (string) ($current['admin_note'] ?? '');
    $reviewRequested = array_key_exists('review_requested', $payload)
        ? boolInt($payload['review_requested'])
        : boolInt($current['review_requested'] ?? 0);
    $beforeAfterReady = array_key_exists('before_after_ready', $payload)
        ? boolInt($payload['before_after_ready'])
        : boolInt($current['before_after_ready'] ?? 0);

    if (stringLength($adminNote) > 1000) {
        respond(422, ['success' => false, 'error' => 'Admin notu cok uzun.']);
    }
    if ($reviewRequested === 1 && $pipelineStage === 'completed') {
        $pipelineStage = 'review_requested';
    }
    if ($pipelineStage === 'review_requested') {
        $reviewRequested = 1;
    }

    $stmt = $pdo->prepare(
        'UPDATE ' . $table . '
         SET pipeline_stage = :pipeline_stage,
             follow_up_at = :follow_up_at,
             admin_note = :admin_note,
             review_requested = :review_requested,
             before_after_ready = :before_after_ready,
             last_contact_at = :last_contact_at,
             updated_at = :updated_at
         WHERE id = :id'
    );
    $stmt->execute([
        'pipeline_stage' => $pipelineStage,
        'follow_up_at' => $followUpAt,
        'admin_note' => $adminNote,
        'review_requested' => $reviewRequested,
        'before_after_ready' => $beforeAfterReady,
        'last_contact_at' => gmdate('Y-m-d H:i:s'),
        'updated_at' => gmdate('Y-m-d H:i:s'),
        'id' => $id,
    ]);

    if ($stmt->rowCount() === 0) {
        // lead exists but update may be idempotent
    }

    logAdminAction($storageDir, 'admin_lead_update', true, ['lead_type' => $leadType, 'id' => $id, 'pipeline_stage' => $pipelineStage]);
    respond(200, ['success' => true]);
}

function handleAdminLeadReport(string $storageDir): void
{
    requireAdmin($storageDir);
    $pdo = dbConnection();
    if (!($pdo instanceof PDO)) {
        respond(503, ['success' => false, 'error' => 'Rapor sistemi su an aktif degil.']);
    }

    $days = max(1, min(365, queryInt('days', 30)));
    $since = (new DateTimeImmutable('-' . ($days - 1) . ' days'))->format('Y-m-d 00:00:00');

    $aggregate = static function (PDO $pdo, string $table, string $since): array {
        $sql = 'SELECT
                    COALESCE(NULLIF(lead_source, ""), "direct") AS lead_source,
                    COUNT(*) AS total
                FROM ' . $table . '
                WHERE created_at >= :since
                GROUP BY COALESCE(NULLIF(lead_source, ""), "direct")
                ORDER BY total DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['since' => $since]);
        $rows = $stmt->fetchAll();
        return is_array($rows) ? $rows : [];
    };

    $appointments = $aggregate($pdo, 'appointments', $since);
    $subscriptions = $aggregate($pdo, 'subscriptions', $since);

    logAdminAction($storageDir, 'admin_lead_report', true, ['days' => $days]);
    respond(200, [
        'success' => true,
        'days' => $days,
        'since' => $since,
        'appointments' => $appointments,
        'subscriptions' => $subscriptions,
    ]);
}

function handleAdminLeadDaySummary(string $storageDir): void
{
    requireAdmin($storageDir);
    $pdo = dbConnection();
    if (!($pdo instanceof PDO)) {
        respond(503, ['success' => false, 'error' => 'Rapor sistemi su an aktif degil.']);
    }

    $now = gmdate('Y-m-d H:i:s');
    $todayStart = gmdate('Y-m-d 00:00:00');
    $todayEnd = gmdate('Y-m-d 23:59:59');
    $tomorrowDate = (new DateTimeImmutable('+1 day'))->format('Y-m-d');

    $sumCount = static function (PDO $pdo, string $table, string $where, array $params): int {
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . $table . ' WHERE ' . $where);
        $stmt->execute($params);
        return (int) $stmt->fetchColumn();
    };

    $newToday =
        $sumCount($pdo, 'appointments', 'created_at BETWEEN :start AND :end', ['start' => $todayStart, 'end' => $todayEnd]) +
        $sumCount($pdo, 'subscriptions', 'created_at BETWEEN :start AND :end', ['start' => $todayStart, 'end' => $todayEnd]);

    $processedToday =
        $sumCount($pdo, 'appointments', 'last_contact_at BETWEEN :start AND :end', ['start' => $todayStart, 'end' => $todayEnd]) +
        $sumCount($pdo, 'subscriptions', 'last_contact_at BETWEEN :start AND :end', ['start' => $todayStart, 'end' => $todayEnd]);

    $calledToday =
        $sumCount($pdo, 'appointments', 'pipeline_stage = "called" AND last_contact_at BETWEEN :start AND :end', ['start' => $todayStart, 'end' => $todayEnd]) +
        $sumCount($pdo, 'subscriptions', 'pipeline_stage = "called" AND last_contact_at BETWEEN :start AND :end', ['start' => $todayStart, 'end' => $todayEnd]);

    $completedToday =
        $sumCount($pdo, 'appointments', 'pipeline_stage IN ("completed", "review_requested") AND updated_at BETWEEN :start AND :end', ['start' => $todayStart, 'end' => $todayEnd]) +
        $sumCount($pdo, 'subscriptions', 'pipeline_stage IN ("completed", "review_requested") AND updated_at BETWEEN :start AND :end', ['start' => $todayStart, 'end' => $todayEnd]);

    $followupDue =
        $sumCount($pdo, 'appointments', 'follow_up_at IS NOT NULL AND follow_up_at <= :now', ['now' => $now]) +
        $sumCount($pdo, 'subscriptions', 'follow_up_at IS NOT NULL AND follow_up_at <= :now', ['now' => $now]);

    $followupTomorrow =
        $sumCount($pdo, 'appointments', 'follow_up_at IS NOT NULL AND DATE(follow_up_at) = :tomorrow', ['tomorrow' => $tomorrowDate]) +
        $sumCount($pdo, 'subscriptions', 'follow_up_at IS NOT NULL AND DATE(follow_up_at) = :tomorrow', ['tomorrow' => $tomorrowDate]);

    $reviewsPending =
        $sumCount($pdo, 'appointments', 'pipeline_stage = "completed" AND review_requested = 0', []) +
        $sumCount($pdo, 'subscriptions', 'pipeline_stage = "completed" AND review_requested = 0', []);

    logAdminAction($storageDir, 'admin_lead_day_summary', true, ['today' => gmdate('Y-m-d')]);
    respond(200, [
        'success' => true,
        'today' => gmdate('Y-m-d'),
        'new_today' => $newToday,
        'processed_today' => $processedToday,
        'called_today' => $calledToday,
        'completed_today' => $completedToday,
        'followup_due' => $followupDue,
        'followup_tomorrow' => $followupTomorrow,
        'reviews_pending' => $reviewsPending,
    ]);
}

function fetchBlogPosts(string $storageDir, bool $includeDrafts = false, int $limit = 50, string $category = ''): array
{
    $pdo = dbConnection();
    $limit = max(1, min(100, $limit));

    if ($pdo instanceof PDO) {
        $where = [];
        $params = [];
        if (!$includeDrafts) {
            $where[] = 'status = "published"';
        }
        if ($category !== '') {
            $where[] = 'category = :category';
            $params['category'] = $category;
        }
        $sql = 'SELECT id, slug, title, category, excerpt, content, image_url, status, published_at, meta_title, meta_description, author, created_at, updated_at FROM blog_posts';
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY COALESCE(published_at, created_at) DESC, id DESC LIMIT :limit';
        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();
        return array_map('normalizeBlogPost', is_array($rows) ? $rows : []);
    }

    $rows = array_map('normalizeBlogPost', readJsonArrayFile(blogPostsPath($storageDir)));
    $rows = array_values(array_filter($rows, static function (array $row) use ($includeDrafts, $category): bool {
        if (!$includeDrafts && (string) ($row['status'] ?? '') !== 'published') {
            return false;
        }
        if ($category !== '' && (string) ($row['category'] ?? '') !== $category) {
            return false;
        }
        return true;
    }));
    usort($rows, static function (array $left, array $right): int {
        $leftDate = (string) ($left['published_at'] ?: $left['created_at']);
        $rightDate = (string) ($right['published_at'] ?: $right['created_at']);
        return strcmp($rightDate, $leftDate);
    });
    return array_slice($rows, 0, $limit);
}

function blogPayloadFromRequest(array $payload): array
{
    $title = cleanPlainText((string) ($payload['title'] ?? ''), 180);
    $slug = cleanSlug((string) ($payload['slug'] ?? $title));
    $content = cleanBlogContent((string) ($payload['content'] ?? ''));
    $excerpt = cleanPlainText((string) ($payload['excerpt'] ?? ''), 500);
    if ($excerpt === '') {
        $excerpt = cleanPlainText($content, 240);
    }
    $category = cleanPlainText((string) ($payload['category'] ?? 'Yerel Rehber'), 80);
    $imageUrl = trim((string) ($payload['image'] ?? ($payload['image_url'] ?? '')));
    if ($imageUrl !== '' && !preg_match('/^(https?:\/\/|\/)[^\s<>"]+$/i', $imageUrl)) {
        respond(422, ['success' => false, 'error' => 'Gorsel URL gecersiz.']);
    }
    $status = normalizeBlogStatus((string) ($payload['status'] ?? 'draft'));
    $publishedAt = trim((string) ($payload['published_at'] ?? ''));
    if ($status === 'published' && $publishedAt === '') {
        $publishedAt = gmdate('Y-m-d H:i:s');
    }
    if ($status === 'draft') {
        $publishedAt = '';
    }

    if ($title === '' || stringLength($title) < 10) {
        respond(422, ['success' => false, 'error' => 'Baslik en az 10 karakter olmali.']);
    }
    if ($slug === '' || stringLength($slug) < 3) {
        respond(422, ['success' => false, 'error' => 'Slug gecersiz.']);
    }
    if ($content === '' || stringLength(strip_tags($content)) < 80) {
        respond(422, ['success' => false, 'error' => 'Blog icerigi en az 80 karakter olmali.']);
    }

    return [
        'id' => (int) ($payload['id'] ?? 0),
        'slug' => $slug,
        'title' => $title,
        'category' => $category !== '' ? $category : 'Yerel Rehber',
        'excerpt' => $excerpt,
        'content' => $content,
        'image_url' => substr($imageUrl, 0, 500),
        'status' => $status,
        'published_at' => $publishedAt,
        'meta_title' => cleanPlainText((string) ($payload['meta_title'] ?? $title), 180),
        'meta_description' => cleanPlainText((string) ($payload['meta_description'] ?? $excerpt), 320),
        'author' => cleanPlainText((string) ($payload['author'] ?? 'NisanProClean'), 120) ?: 'NisanProClean',
    ];
}

function handleBlogList(string $storageDir): void
{
    $limit = max(1, min(100, queryInt('limit', 30)));
    $category = cleanPlainText(queryString('category', ''), 80);
    $posts = fetchBlogPosts($storageDir, false, $limit, $category);
    respond(200, ['success' => true, 'records' => $posts]);
}

function handleAdminBlogList(string $storageDir): void
{
    requireAdmin($storageDir);
    $limit = max(1, min(100, queryInt('limit', 50)));
    $category = cleanPlainText(queryString('category', ''), 80);
    $posts = fetchBlogPosts($storageDir, true, $limit, $category);
    logAdminAction($storageDir, 'admin_blog_list', true, ['total' => count($posts)]);
    respond(200, ['success' => true, 'records' => $posts]);
}

function handleAdminBlogUpsert(string $storageDir): void
{
    requireAdminOrBlogToken($storageDir, 'admin_blog_upsert');
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        respond(405, ['success' => false, 'error' => 'Gecersiz istek.']);
    }

    $post = blogPayloadFromRequest(readJsonPayload());
    $pdo = dbConnection();
    $now = gmdate('Y-m-d H:i:s');

    if ($pdo instanceof PDO) {
        if ($post['id'] > 0) {
            $stmt = $pdo->prepare(
                'UPDATE blog_posts
                 SET slug = :slug, title = :title, category = :category, excerpt = :excerpt, content = :content,
                     image_url = :image_url, status = :status, published_at = :published_at,
                     meta_title = :meta_title, meta_description = :meta_description, author = :author, updated_at = :updated_at
                 WHERE id = :id'
            );
            $stmt->execute([
                'id' => $post['id'],
                'slug' => $post['slug'],
                'title' => $post['title'],
                'category' => $post['category'],
                'excerpt' => $post['excerpt'],
                'content' => $post['content'],
                'image_url' => $post['image_url'],
                'status' => $post['status'],
                'published_at' => $post['published_at'] !== '' ? $post['published_at'] : null,
                'meta_title' => $post['meta_title'],
                'meta_description' => $post['meta_description'],
                'author' => $post['author'],
                'updated_at' => $now,
            ]);
            $id = $post['id'];
        } else {
            $stmt = $pdo->prepare(
                'INSERT INTO blog_posts (slug, title, category, excerpt, content, image_url, status, published_at, meta_title, meta_description, author, created_at, updated_at)
                 VALUES (:slug, :title, :category, :excerpt, :content, :image_url, :status, :published_at, :meta_title, :meta_description, :author, :created_at, :updated_at)
                 ON DUPLICATE KEY UPDATE
                    title = VALUES(title), category = VALUES(category), excerpt = VALUES(excerpt), content = VALUES(content),
                    image_url = VALUES(image_url), status = VALUES(status), published_at = VALUES(published_at),
                    meta_title = VALUES(meta_title), meta_description = VALUES(meta_description), author = VALUES(author), updated_at = VALUES(updated_at)'
            );
            $stmt->execute([
                'slug' => $post['slug'],
                'title' => $post['title'],
                'category' => $post['category'],
                'excerpt' => $post['excerpt'],
                'content' => $post['content'],
                'image_url' => $post['image_url'],
                'status' => $post['status'],
                'published_at' => $post['published_at'] !== '' ? $post['published_at'] : null,
                'meta_title' => $post['meta_title'],
                'meta_description' => $post['meta_description'],
                'author' => $post['author'],
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $id = (int) $pdo->lastInsertId();
            if ($id === 0) {
                $lookup = $pdo->prepare('SELECT id FROM blog_posts WHERE slug = :slug LIMIT 1');
                $lookup->execute(['slug' => $post['slug']]);
                $id = (int) $lookup->fetchColumn();
            }
        }

        logAdminAction($storageDir, 'admin_blog_upsert', true, ['id' => $id, 'slug' => $post['slug'], 'status' => $post['status']]);
        respond(200, ['success' => true, 'id' => $id, 'slug' => $post['slug'], 'status' => $post['status']]);
    }

    $path = blogPostsPath($storageDir);
    $rows = readJsonArrayFile($path);
    $nowIso = gmdate('c');
    $updated = false;
    $nextId = 1;
    foreach ($rows as $row) {
        $nextId = max($nextId, (int) ($row['id'] ?? 0) + 1);
    }
    foreach ($rows as $index => $row) {
        if ((int) ($row['id'] ?? 0) === $post['id'] || (string) ($row['slug'] ?? '') === $post['slug']) {
            $rows[$index] = array_merge($row, $post, [
                'id' => (int) ($row['id'] ?? $post['id']),
                'image' => $post['image_url'],
                'updated_at' => $nowIso,
                'published_at' => $post['published_at'] !== '' ? $post['published_at'] : '',
            ]);
            $updated = true;
            $post['id'] = (int) $rows[$index]['id'];
            break;
        }
    }
    if (!$updated) {
        $post['id'] = $post['id'] > 0 ? $post['id'] : $nextId;
        $rows[] = array_merge($post, [
            'image' => $post['image_url'],
            'created_at' => $nowIso,
            'updated_at' => $nowIso,
            'published_at' => $post['published_at'] !== '' ? $post['published_at'] : '',
        ]);
    }
    writeJsonArrayFile($path, $rows);
    logAdminAction($storageDir, 'admin_blog_upsert', true, ['id' => $post['id'], 'slug' => $post['slug'], 'status' => $post['status']]);
    respond(200, ['success' => true, 'id' => $post['id'], 'slug' => $post['slug'], 'status' => $post['status']]);
}

function handleAdminBlogDelete(string $storageDir): void
{
    requireAdminOrBlogToken($storageDir, 'admin_blog_delete');
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        respond(405, ['success' => false, 'error' => 'Gecersiz istek.']);
    }

    $payload = readJsonPayload();
    $id = (int) ($payload['id'] ?? 0);
    $slug = cleanSlug((string) ($payload['slug'] ?? ''));
    if ($id <= 0 && $slug === '') {
        respond(422, ['success' => false, 'error' => 'Silmek icin id veya slug gerekli.']);
    }

    $pdo = dbConnection();
    if ($pdo instanceof PDO) {
        $stmt = $id > 0
            ? $pdo->prepare('DELETE FROM blog_posts WHERE id = :id')
            : $pdo->prepare('DELETE FROM blog_posts WHERE slug = :slug');
        $stmt->execute($id > 0 ? ['id' => $id] : ['slug' => $slug]);
        logAdminAction($storageDir, 'admin_blog_delete', true, ['id' => $id, 'slug' => $slug]);
        respond(200, ['success' => true, 'deleted' => $stmt->rowCount()]);
    }

    $path = blogPostsPath($storageDir);
    $rows = readJsonArrayFile($path);
    $before = count($rows);
    $rows = array_values(array_filter($rows, static function (array $row) use ($id, $slug): bool {
        if ($id > 0 && (int) ($row['id'] ?? 0) === $id) {
            return false;
        }
        if ($slug !== '' && (string) ($row['slug'] ?? '') === $slug) {
            return false;
        }
        return true;
    }));
    writeJsonArrayFile($path, $rows);
    logAdminAction($storageDir, 'admin_blog_delete', true, ['id' => $id, 'slug' => $slug]);
    respond(200, ['success' => true, 'deleted' => $before - count($rows)]);
}

$storageDir = storageDir();
$pdo = dbConnection();

if ($pdo instanceof PDO) {
    initializeDbSchema($pdo);
}

$action = (string) ($_GET['action'] ?? 'health');
enforcePostSecurity($storageDir, $action);
switch ($action) {
    case 'health':
        respond(200, ['success' => true, 'status' => 'ok', 'db_configured' => usingDb(), 'using_db' => $pdo instanceof PDO]);
        break;
    case 'csrf_token':
        handleCsrfToken();
        break;
    case 'blog_list':
        handleBlogList($storageDir);
        break;
    case 'generate':
        handleGenerate($storageDir);
        break;
    case 'referral_otp_request':
        handleReferralOtpRequest($storageDir);
        break;
    case 'referral_otp_verify':
        handleReferralOtpVerify($storageDir);
        break;
    case 'admin_status':
        handleAdminStatus();
        break;
    case 'admin_login':
        handleAdminLogin($storageDir);
        break;
    case 'admin_logout':
        handleAdminLogout($storageDir);
        break;
    case 'admin_list':
        handleAdminList($storageDir);
        break;
    case 'admin_update_points':
        handleAdminUpdatePoints($storageDir);
        break;
    case 'admin_backup':
        handleAdminBackup($storageDir);
        break;
    case 'admin_logs':
        handleAdminLogs($storageDir);
        break;
    case 'admin_blog_list':
        handleAdminBlogList($storageDir);
        break;
    case 'admin_blog_upsert':
        handleAdminBlogUpsert($storageDir);
        break;
    case 'admin_blog_delete':
        handleAdminBlogDelete($storageDir);
        break;
    case 'cron_backup':
        handleCronBackup($storageDir);
        break;
    case 'appointment_slots':
        handleAppointmentSlots();
        break;
    case 'appointment_book':
        handleAppointmentBook($storageDir);
        break;
    case 'subscription_create':
        handleSubscriptionCreate($storageDir);
        break;
    case 'admin_appointments':
        handleAdminAppointments($storageDir);
        break;
    case 'admin_appointment_status':
        handleAdminAppointmentStatus($storageDir);
        break;
    case 'admin_subscriptions':
        handleAdminSubscriptions($storageDir);
        break;
    case 'admin_subscription_status':
        handleAdminSubscriptionStatus($storageDir);
        break;
    case 'admin_leads':
        handleAdminLeads($storageDir);
        break;
    case 'admin_lead_update':
        handleAdminLeadUpdate($storageDir);
        break;
    case 'admin_lead_report':
        handleAdminLeadReport($storageDir);
        break;
    case 'admin_lead_day_summary':
        handleAdminLeadDaySummary($storageDir);
        break;
    default:
        respond(405, ['success' => false, 'error' => 'Gecersiz istek.']);
}
