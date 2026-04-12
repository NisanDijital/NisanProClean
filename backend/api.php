<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Hostinger Veritabanı Bilgileriniz (Hostinger panelinden aldığınız bilgilerle değiştirin)
$host = "localhost";
$db_name = "u123456789_nisanpro"; // Kendi DB adınız
$username = "u123456789_user";    // Kendi DB kullanıcınız
$password = "Sifreniz123!";       // Kendi DB şifreniz

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name, $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $exception) {
    echo json_encode(["error" => "Veritabanı bağlantı hatası"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));
$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action === 'generate') {
    if (!empty($data->phone)) {
        $phone = htmlspecialchars(strip_tags($data->phone));
        
        // Önce bu numara var mı kontrol et
        $stmt = $conn->prepare("SELECT referral_code, points FROM users WHERE phone = ?");
        $stmt->execute([$phone]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row) {
            // Varsa mevcut kodu ve puanı döndür
            echo json_encode(["success" => true, "code" => $row['referral_code'], "points" => $row['points']]);
        } else {
            // Yoksa yeni kod oluştur (Örn: NPN4829)
            $code = "NPN" . rand(1000, 9999);
            $stmt = $conn->prepare("INSERT INTO users (phone, referral_code) VALUES (?, ?)");
            if ($stmt->execute([$phone, $code])) {
                echo json_encode(["success" => true, "code" => $code, "points" => 0]);
            } else {
                echo json_encode(["error" => "Kod oluşturulamadı."]);
            }
        }
    } else {
        echo json_encode(["error" => "Telefon numarası eksik."]);
    }
} else {
    echo json_encode(["error" => "Geçersiz işlem."]);
}
?>
