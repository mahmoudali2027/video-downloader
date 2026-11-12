# Video İndirici

YouTube bağlantısını kabul eden, tarayıcıdan kullanılan bir MP4 indirme uygulaması.

## VS Code’da çalıştırma

1. VS Code’da **Dosya → Klasör Aç** ile `video-indirici` klasörünü aç.
2. [Node.js’in resmi indirme sayfasından](https://nodejs.org/en/download) güncel LTS sürümünün **Windows Installer (.msi)** paketini kur. VS Code’u tamamen kapatıp yeniden aç. **Terminal → Yeni Terminal** menüsünden PowerShell’i açıp `node --version` ile kurulumu kontrol et. Proje Node.js 22.1 veya üzerini gerektirir.
3. Video indirme araçlarını kurmak için terminalde şu komutları bir kez çalıştır.

   ```powershell
   winget install --id yt-dlp.yt-dlp -e --source winget
   winget install --id DenoLand.Deno -e --source winget
   ```

4. Kurulum bitince VS Code’u kapatıp aç. Terminalde `node server.mjs` komutunu çalıştır.
5. Tarayıcıdan `http://localhost:3000` adresini aç ve indirme iznin olan bir video bağlantısı gir.

## İnternette yayınlama

Docker çalıştıran bir barındırma hizmetinde bu klasördeki `Dockerfile` ile dağıt. Uygulama varsayılan olarak `3000` numaralı portu kullanır ve hizmetin verdiği `PORT` değişkenini destekler. Yayın adresini hizmet verir. Bazı barındırma ağlarında YouTube bağlantıları engellenebildiği için paylaşmadan önce yayındaki adreste indirmeyi dene.

Uygulama ses ve görüntüsü bir arada bulunan, en fazla 720p MP4 biçimlerini kullanır. Video en fazla 20 dakika ve 100 MB olabilir. Sunucu aynı anda iki video hazırlar. İndirme dosyaları işlem bitince silinir.
