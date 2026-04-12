# NisanProClean Backend (Hostinger İçin)

Bu klasördeki dosyalar, sitenizin "Referans (Kazan)" sistemini Hostinger paylaşımlı hostinginizde çalıştırmak için hazırlanmıştır.

## Kurulum Adımları

1. **Veritabanı Oluşturma:**
   - Hostinger hPanel'e giriş yapın.
   - Veritabanları > MySQL Veritabanları bölümünden yeni bir veritabanı ve kullanıcı oluşturun.
   - phpMyAdmin'e girin ve `schema.sql` dosyasının içindeki SQL kodunu kopyalayıp "SQL" sekmesinde çalıştırın. Bu işlem `users` tablosunu oluşturacaktır.

2. **API Dosyasını Düzenleme:**
   - `api.php` dosyasını açın.
   - 10, 11 ve 12. satırlardaki `$db_name`, `$username` ve `$password` alanlarına Hostinger'da oluşturduğunuz veritabanı bilgilerini yazın.

3. **Sunucuya Yükleme:**
   - React projenizi `npm run build` komutuyla derleyin.
   - `dist` klasörünün içindekileri Hostinger `public_html` klasörüne yükleyin.
   - Bu `api.php` dosyasını da `public_html` klasörünün içine (index.html ile aynı yere) yükleyin.

4. **React Kodunu Güncelleme (Canlıya Alırken):**
   - `src/components/Referral.tsx` dosyasındaki `setTimeout` ile yapılan simülasyonu silip yerine şu `fetch` kodunu eklemeniz yeterlidir:

```javascript
// Referral.tsx içindeki handleGenerateCode fonksiyonunun içi:
const response = await fetch('https://siteniz.com/api.php?action=generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone })
});
const data = await response.json();
if (data.success) {
  setReferralData({ code: data.code, points: data.points });
}
```
