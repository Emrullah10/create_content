# OpenWolf — Operasyon Protokolu (minimum kurulum)

Bu proje OpenWolf'un **minimum** kurulumunu kullanir (hook'suz, talimat-tabanli).
Referans: `MONOREPO-ARCHITECTURE-TEMPLATE.md` Bolum 11 (find-job-mono-repo'daki tam kurulumun kaynagi).

## Her oturumda uy

1. Bir dosyayi tam okumadan once `.wolf/anatomy.md`'de bu dosya icin bir ozet olup olmadigina bak — yeterliyse dosyayi hic okuma.
2. Kod yazmadan once `.wolf/cerebrum.md`'deki `Key Learnings` ve `Do-Not-Repeat` bolumlerini kontrol et.
3. Bir bug/duzeltme yaptiginda `.wolf/buglog.json`'a `{error_message, root_cause, fix, tags}` seklinde bir kayit ekle.
4. Onemli bir mimari karar aldiginda `.wolf/cerebrum.md`'nin `Decision Log`'una ekle.
5. Oturum sonunda `.wolf/memory.md`'ye kisa bir eylem ozeti ekle.

## Tam kuruluma gecis

Proje oturdukca (bkz `MONOREPO-ARCHITECTURE-TEMPLATE.md` 12.3), `.wolf/hooks/*.js` + `.claude/settings.json`
hook baglantisi eklenerek bu disiplin zorunlu kilinabilir. Simdilik AI kendi inisiyatifiyle uyar.
