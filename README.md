# Birlikte Al

Bir liste oluştur, bağlantıyı paylaş ve aynı alışverişi farklı telefonlardan takip et. Aynı ürün ve tercih birleştirilir. Satırın ayrıntılarında kimin ne istediği görünür.

## VS Code’da çalıştır

Node.js 22 LTS veya üzeriyle `node server.mjs` çalıştır ve `http://localhost:3000` adresini aç. Yerel veriler Windows’ta `%LOCALAPPDATA%\.birlikte-al` altında saklanır. Veri dizinini `DATA_DIR` ile belirleyebilirsin.

## Render

Mevcut Docker web hizmetiyle dağıtılabilir. Birden fazla telefonun aynı listeyi açabilmesi için bağlantıyı yayınlanan siteden oluştur. Linke sahip olan herkes listeye ekleme yapabilir, istek kaldırabilir ve ürünleri işaretleyebilir.

Uygulama tek sunucu örneği için tasarlanmıştır. Render Free kullanırsan uyku, yeniden başlatma veya yeniden yayınlama sonrasında listeler kaybolabilir. Listeleri uzun süre saklamak için kalıcı bir disk bağla ve `DATA_DIR` değerini diskin bağlandığı konuma ayarla. Docker varsayılan olarak `/data` dizinine yazar.
