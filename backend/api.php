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
            appointment_date DATE NOT NULL,
            appointment_time TIME NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT "pending",
            note TEXT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            INDEX idx_appointments_dt (appointment_date, appointment_time),
            INDEX idx_appointments_status (status)
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
            status VARCHAR(20) NOT NULL DEFAULT "new",
            payload_json TEXT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            INDEX idx_subscriptions_status (status),
            INDEX idx_subscriptions_phone (phone)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    // Backward-compatible migrations for existing tables.
    $safeExec('ALTER TABLE appointments ADD COLUMN lead_source VARCHAR(64) NOT NULL DEFAULT "direct"');
    $safeExec('ALTER TABLE appointments ADD COLUMN utm_source VARCHAR(80) NOT NULL DEFAULT ""');
    $safeExec('ALTER TABLE appointments ADD COLUMN utm_medium VARCHAR(80) NOT NULL DEFAULT ""');
    $safeExec('ALTER TABLE appointments ADD COLUMN utm_campaign VARCHAR(120) NOT NULL DEFAULT ""');

    $safeExec('ALTER TABLE subscriptions ADD COLUMN lead_source VARCHAR(64) NOT NULL DEFAULT "direct"');
    $safeExec('ALTER TABLE subscriptions ADD COLUMN utm_source VARCHAR(80) NOT NULL DEFAULT ""');
    $safeExec('ALTER TABLE subscriptions ADD COLUMN utm_medium VARCHAR(80) NOT NULL DEFAULT ""');
    $safeExec('ALTER TABLE subscriptions ADD COLUMN utm_campaign VARCHAR(120) NOT NULL DEFAULT ""');

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
         (customer_name, phone, customer_address, service_type, lead_source, utm_source, utm_medium, utm_campaign, appointment_date, appointment_time, status, note, created_at, updated_at)
         VALUES
         (:customer_name, :phone, :customer_address, :service_type, :lead_source, :utm_source, :utm_medium, :utm_campaign, :appointment_date, :appointment_time, "pending", :note, :created_at, :updated_at)'
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
         (customer_name, phone, customer_address, plan_name, plan_price, lead_source, utm_source, utm_medium, utm_campaign, status, payload_json, created_at, updated_at)
         VALUES
         (:customer_name, :phone, :customer_address, :plan_name, :plan_price, :lead_source, :utm_source, :utm_medium, :utm_campaign, "new", :payload_json, :created_at, :updated_at)'
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

    $sql = 'SELECT id, customer_name, phone, customer_address, plan_name, plan_price, lead_source, utm_source, utm_medium, utm_campaign, status, created_at
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

    $stmt = $pdo->prepare('UPDATE subscriptions SET status = :status, updated_at = :updated_at WHERE id = :id');
    $stmt->execute(['status' => $status, 'updated_at' => gmdate('Y-m-d H:i:s'), 'id' => $id]);
    if ($stmt->rowCount() === 0) {
        respond(404, ['success' => false, 'error' => 'Basvuru bulunamadi.']);
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

    $sql = 'SELECT id, customer_name, phone, customer_address, service_type, lead_source, utm_source, utm_medium, utm_campaign, appointment_date, appointment_time, status, note, created_at
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

    $stmt = $pdo->prepare('UPDATE appointments SET status = :status, updated_at = :updated_at WHERE id = :id');
    $stmt->execute(['status' => $status, 'updated_at' => gmdate('Y-m-d H:i:s'), 'id' => $id]);
    if ($stmt->rowCount() === 0) {
        respond(404, ['success' => false, 'error' => 'Randevu bulunamadi.']);
    }

    logAdminAction($storageDir, 'admin_appointment_status', true, ['id' => $id, 'status' => $status]);
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

$storageDir = storageDir();
$pdo = dbConnection();

if (usingDb() && !($pdo instanceof PDO)) {
    respond(500, ['success' => false, 'error' => 'MySQL baglantisi kurulamadi. backend/config.php kontrol edin.']);
}
if ($pdo instanceof PDO) {
    initializeDbSchema($pdo);
}

$action = (string) ($_GET['action'] ?? 'health');
enforcePostSecurity($storageDir, $action);
switch ($action) {
    case 'health':
        respond(200, ['success' => true, 'status' => 'ok', 'using_db' => $pdo instanceof PDO]);
        break;
    case 'csrf_token':
        handleCsrfToken();
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
    case 'admin_lead_report':
        handleAdminLeadReport($storageDir);
        break;
    default:
        respond(405, ['success' => false, 'error' => 'Gecersiz istek.']);
}
