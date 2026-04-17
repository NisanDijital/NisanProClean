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
    ];

    foreach ($envMap as $env => $key) {
        $value = getenv($env);
        if ($value === false || $value === '') {
            continue;
        }

        if ($key === 'db_enabled') {
            $config[$key] = in_array(strtolower((string) $value), ['1', 'true', 'yes', 'on'], true);
            continue;
        }

        if ($key === 'db_port') {
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
        'ip' => (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'),
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
                'ip' => (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'),
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
    $payload = json_decode(file_get_contents('php://input') ?: '{}', true);
    if (!is_array($payload)) {
        respond(400, ['success' => false, 'error' => 'Gecersiz veri gonderildi.']);
    }
    return $payload;
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
    if (!preg_match('/^90[5][0-9]{9}$/', $phone)) {
        respond(422, ['success' => false, 'error' => 'Telefon numarasi gecersiz.']);
    }
    if ($address === '' || stringLength($address) < 5) {
        respond(422, ['success' => false, 'error' => 'Adres bilgisi gecersiz.']);
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
         (customer_name, phone, customer_address, service_type, appointment_date, appointment_time, status, note, created_at, updated_at)
         VALUES
         (:customer_name, :phone, :customer_address, :service_type, :appointment_date, :appointment_time, "pending", :note, :created_at, :updated_at)'
    );
    $now = gmdate('Y-m-d H:i:s');
    $stmt->execute([
        'customer_name' => $name,
        'phone' => $phone,
        'customer_address' => substr($address, 0, 255),
        'service_type' => $service,
        'appointment_date' => $date,
        'appointment_time' => $time . ':00',
        'note' => $note,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    logAdminAction($storageDir, 'appointment_book', true, ['date' => $date, 'time' => $time, 'phone' => $phone]);
    respond(201, ['success' => true, 'message' => 'Randevu olusturuldu.']);
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

    $sql = 'SELECT id, customer_name, phone, customer_address, service_type, appointment_date, appointment_time, status, note, created_at
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

$storageDir = storageDir();
$pdo = dbConnection();

if (usingDb() && !($pdo instanceof PDO)) {
    respond(500, ['success' => false, 'error' => 'MySQL baglantisi kurulamadi. backend/config.php kontrol edin.']);
}
if ($pdo instanceof PDO) {
    initializeDbSchema($pdo);
}

$action = (string) ($_GET['action'] ?? 'health');
switch ($action) {
    case 'health':
        respond(200, ['success' => true, 'status' => 'ok', 'using_db' => $pdo instanceof PDO]);
        break;
    case 'generate':
        handleGenerate($storageDir);
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
    case 'admin_appointments':
        handleAdminAppointments($storageDir);
        break;
    case 'admin_appointment_status':
        handleAdminAppointmentStatus($storageDir);
        break;
    default:
        respond(405, ['success' => false, 'error' => 'Gecersiz istek.']);
}
