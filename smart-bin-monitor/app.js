/*
  ==============================================================
  KONFIGURASI FIREBASE
  ==============================================================
  Aplikasi ini memakai REST API Firebase Realtime Database.
  Jadi cukup isi URL database, tidak perlu konfigurasi Web App lengkap.
*/
const FIREBASE_DATABASE_URL = "https://smart-bin-monitor-6f0e1-default-rtdb.firebaseio.com";
const FIREBASE_AUTH = "";
const INTERVAL_FIREBASE_MS = 1500;
const JARAK_SAMPAH_KOSONG_CM = 16;
const BATAS_SAMPAH_PENUH_CM = 4;

// Semua path Firebase dikumpulkan di sini agar mudah dicari dan diganti.
const pathFirebase = {
  kapasitas: "smartbin/kapasitas",
  jarakOrang: "smartbin/jarakOrang",
  jarakSampah: "smartbin/jarakSampah",
  statusSampah: "smartbin/statusSampah",
  tutupTerbuka: "smartbin/tutupTerbuka",
  perintahTutup: "smartbin/perintahTutup",
  suaraAktif: "smartbin/suaraAktif",
  perintahSuara: "smartbin/perintahSuara",
  statusSuara: "smartbin/statusSuara"
};

// Data awal dipakai agar tampilan tidak kosong sebelum Firebase berhasil terhubung.
let dataTempatSampah = {
  kapasitas: 0,
  jarakOrang: 35,
  jarakSampah: 16,
  statusSampah: "Kosong",
  tutupTerbuka: false,
  suaraAktif: true,
  perintahSuara: 0,
  statusSuara: "Siap"
};

let firebaseSiap = false;
let intervalFirebase = null;
let sedangMengambilData = false;

// Mengambil elemen HTML agar JavaScript bisa memperbarui tampilan.
const kapasitasText = document.getElementById("kapasitasText");
const capacityCard = document.getElementById("capacityCard");
const capacityLevel = document.getElementById("capacityLevel");
const capacityBar = document.getElementById("capacityBar");
const binFill = document.getElementById("binFill");
const binLid = document.getElementById("binLid");
const statusSampah = document.getElementById("statusSampah");
const statusDescription = document.getElementById("statusDescription");
const jarakOrang = document.getElementById("jarakOrang");
const jarakSampah = document.getElementById("jarakSampah");
const statusTutup = document.getElementById("statusTutup");
const statusSuara = document.getElementById("statusSuara");
const suaraAktifStatus = document.getElementById("suaraAktifStatus");
const perintahSuara = document.getElementById("perintahSuara");
const soundMode = document.getElementById("soundMode");
const warningCard = document.getElementById("warningCard");
const lastUpdate = document.getElementById("lastUpdate");
const connectionStatus = document.getElementById("connectionStatus");
const toggleLidButton = document.getElementById("toggleLidButton");
const refreshButton = document.getElementById("refreshButton");
const toggleSoundButton = document.getElementById("toggleSoundButton");
const soundCommandButtons = document.querySelectorAll("[data-sound-command]");

// Menentukan status ringkas berdasarkan kapasitas sampah.
function tentukanStatusSampah(kapasitas) {
  if (kapasitas >= 80) {
    return "Penuh";
  }

  if (kapasitas >= 50) {
    return "Sedang";
  }

  return "Kosong";
}

// Menentukan label status yang tampil besar di halaman.
function buatLabelStatusKapasitas(kapasitas) {
  if (kapasitas >= 80) {
    return "Sampah Sudah Penuh";
  }

  if (kapasitas >= 50) {
    return "Sampah Sedang";
  }

  return "Sampah Masih Kosong";
}

// Memberikan kelas warna: hijau < 50, kuning 50-79, merah >= 80.
function tentukanKelasKapasitas(kapasitas) {
  if (kapasitas >= 80) {
    return "danger";
  }

  if (kapasitas >= 50) {
    return "warning";
  }

  return "safe";
}

// Membuat teks keterangan yang mudah dipahami pengguna.
function buatDeskripsiStatus(kapasitas) {
  if (kapasitas >= 80) {
    return "Tempat sampah perlu segera dikosongkan.";
  }

  if (kapasitas >= 50) {
    return "Kapasitas mulai terisi, tetap pantau secara berkala.";
  }

  return "Kapasitas masih rendah dan tempat sampah siap digunakan.";
}

// Membatasi nilai kapasitas agar selalu berada pada rentang 0 sampai 100.
function batasiKapasitas(nilai) {
  const angka = Number(nilai);

  if (!Number.isFinite(angka)) {
    return dataTempatSampah.kapasitas;
  }

  return Math.min(Math.max(Math.round(angka), 0), 100);
}

// Menghitung kapasitas dari jarak sensor sampah jika data kapasitas belum tersedia.
function hitungKapasitasDariJarakSampah(jarak) {
  const angka = Number(jarak);

  if (!Number.isFinite(angka) || angka <= 0) {
    return dataTempatSampah.kapasitas;
  }

  const rentang = JARAK_SAMPAH_KOSONG_CM - BATAS_SAMPAH_PENUH_CM;
  const persen = ((JARAK_SAMPAH_KOSONG_CM - angka) / rentang) * 100;

  return Math.min(Math.max(Math.round(persen), 0), 100);
}

// Mengubah nilai jarak dari Firebase menjadi angka aman untuk ditampilkan.
function bersihkanJarak(nilai, nilaiCadangan) {
  const angka = Number(nilai);

  if (!Number.isFinite(angka)) {
    return nilaiCadangan;
  }

  return Math.max(Math.round(angka), 0);
}

// Menerima boolean asli atau string "true"/"false" dari Firebase.
function bersihkanBoolean(nilai, nilaiCadangan) {
  if (typeof nilai === "boolean") {
    return nilai;
  }

  if (typeof nilai === "string") {
    const teks = nilai.trim().toLowerCase();

    if (teks === "true") {
      return true;
    }

    if (teks === "false") {
      return false;
    }
  }

  return nilaiCadangan;
}

// Memastikan perintah suara hanya berisi angka 0, 1, 2, atau 3.
function bersihkanPerintahSuara(nilai) {
  const angka = Number(nilai);

  if ([0, 1, 2, 3].includes(angka)) {
    return angka;
  }

  return dataTempatSampah.perintahSuara;
}

// Membersihkan teks agar status kosong tidak merusak tampilan.
function bersihkanTeks(nilai, nilaiCadangan) {
  if (typeof nilai === "string" && nilai.trim() !== "") {
    return nilai.trim();
  }

  return nilaiCadangan;
}

// Menampilkan jam pembaruan data terakhir pada bagian bawah aplikasi.
function formatWaktuSekarang() {
  return new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

// Mengubah label kecil di kanan atas agar pengguna tahu status koneksi.
function ubahStatusKoneksi(teks, tipe) {
  connectionStatus.className = `connection-pill ${tipe}`;
  connectionStatus.innerHTML = `<span class="pulse"></span>${teks}`;
}

// Mengecek apakah konfigurasi Firebase masih berisi placeholder.
function konfigurasiFirebaseBelumDiisi() {
  return !FIREBASE_DATABASE_URL ||
    FIREBASE_DATABASE_URL.includes("GANTI_") ||
    FIREBASE_DATABASE_URL.includes("console.firebase.google.com") ||
    FIREBASE_DATABASE_URL.includes("github.io");
}

// Mengunci tombol suara sebentar saat aplikasi sedang menulis ke Firebase.
function aturTombolSuaraNonaktif(nonaktif) {
  toggleSoundButton.disabled = nonaktif;

  soundCommandButtons.forEach(function (button) {
    button.disabled = nonaktif;
  });
}

// Fungsi utama untuk menyinkronkan data JavaScript ke tampilan HTML.
function tampilkanData(pesanTambahan) {
  const statusRingkas = tentukanStatusSampah(dataTempatSampah.kapasitas);
  const kelasKapasitas = tentukanKelasKapasitas(dataTempatSampah.kapasitas);
  const statusSuaraTampil = dataTempatSampah.suaraAktif
    ? dataTempatSampah.statusSuara
    : "Suara Nonaktif";

  dataTempatSampah.statusSampah = statusRingkas;

  kapasitasText.textContent = `${dataTempatSampah.kapasitas}%`;
  capacityLevel.textContent = statusRingkas;
  capacityBar.style.width = `${dataTempatSampah.kapasitas}%`;
  binFill.style.height = `${dataTempatSampah.kapasitas}%`;

  capacityCard.className = `capacity-card ${kelasKapasitas}`;
  capacityBar.className = `progress-bar ${kelasKapasitas}`;
  binFill.className = `bin-fill ${kelasKapasitas}`;

  statusSampah.textContent = buatLabelStatusKapasitas(dataTempatSampah.kapasitas);
  statusSampah.className = `status-${kelasKapasitas}`;
  statusDescription.textContent = buatDeskripsiStatus(dataTempatSampah.kapasitas);

  jarakOrang.textContent = dataTempatSampah.jarakOrang;
  jarakSampah.textContent = dataTempatSampah.jarakSampah;
  statusTutup.textContent = dataTempatSampah.tutupTerbuka ? "Terbuka" : "Tertutup";
  statusSuara.textContent = statusSuaraTampil;
  suaraAktifStatus.textContent = dataTempatSampah.suaraAktif ? "Aktif" : "Nonaktif";
  perintahSuara.textContent = dataTempatSampah.perintahSuara;
  soundMode.textContent = dataTempatSampah.suaraAktif ? "Suara Aktif" : "Suara Nonaktif";
  soundMode.classList.toggle("off", !dataTempatSampah.suaraAktif);

  // Peringatan merah hanya muncul saat kapasitas sampah mencapai 80% atau lebih.
  warningCard.classList.toggle("hidden", dataTempatSampah.kapasitas < 80);

  // Animasi tutup tempat sampah berubah sesuai nilai servo.
  binLid.classList.toggle("open", dataTempatSampah.tutupTerbuka);

  lastUpdate.textContent = pesanTambahan
    ? `${pesanTambahan}: ${formatWaktuSekarang()}`
    : `Terakhir diperbarui: ${formatWaktuSekarang()}`;
}

// Membuat URL REST Firebase untuk membaca atau menulis satu path.
function buatUrlFirebase(path) {
  let url = FIREBASE_DATABASE_URL.trim();

  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }

  url += `/${path}.json`;

  if (FIREBASE_AUTH) {
    url += `?auth=${encodeURIComponent(FIREBASE_AUTH)}`;
  }

  return url;
}

// Fungsi umum untuk komunikasi ke Firebase Realtime Database.
async function mintaFirebase(path, method, nilai) {
  const pilihan = {
    method,
    headers: {
      "Content-Type": "application/json"
    }
  };

  if (nilai !== undefined) {
    pilihan.body = JSON.stringify(nilai);
  }

  const response = await fetch(buatUrlFirebase(path), pilihan);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// Menyalin data dari Firebase ke variabel aplikasi sebelum ditampilkan.
function terapkanDataFirebase(data) {
  dataTempatSampah.jarakOrang = bersihkanJarak(data.jarakOrang, dataTempatSampah.jarakOrang);
  dataTempatSampah.jarakSampah = bersihkanJarak(data.jarakSampah, dataTempatSampah.jarakSampah);
  dataTempatSampah.kapasitas = Number.isFinite(Number(data.kapasitas))
    ? batasiKapasitas(data.kapasitas)
    : hitungKapasitasDariJarakSampah(dataTempatSampah.jarakSampah);
  dataTempatSampah.statusSampah = bersihkanTeks(data.statusSampah, tentukanStatusSampah(dataTempatSampah.kapasitas));
  dataTempatSampah.tutupTerbuka = bersihkanBoolean(data.tutupTerbuka, dataTempatSampah.tutupTerbuka);
  dataTempatSampah.suaraAktif = bersihkanBoolean(data.suaraAktif, dataTempatSampah.suaraAktif);
  dataTempatSampah.perintahSuara = bersihkanPerintahSuara(data.perintahSuara);
  dataTempatSampah.statusSuara = bersihkanTeks(data.statusSuara, dataTempatSampah.statusSuara);
}

// Mengambil semua data smartbin dari Firebase.
async function ambilDataDariFirebase(pesanSukses, tampilkanLoading) {
  if (sedangMengambilData) return;

  sedangMengambilData = true;

  if (tampilkanLoading) {
    refreshButton.disabled = true;
    lastUpdate.textContent = "Mengambil data terbaru dari Firebase...";
  }

  try {
    const data = await mintaFirebase("smartbin", "GET");

    if (!data) {
      ubahStatusKoneksi("Data smartbin belum ada", "warning");
      lastUpdate.textContent = "Node smartbin belum ditemukan di Firebase.";
      return;
    }

    terapkanDataFirebase(data);
    ubahStatusKoneksi("Firebase aktif", "online");
    tampilkanData(pesanSukses);
  } catch (error) {
    console.error("Gagal membaca Firebase:", error);
    ubahStatusKoneksi("Firebase gagal dibaca", "error");
    lastUpdate.textContent = "Periksa koneksi internet, URL database, atau rules Firebase.";
  } finally {
    sedangMengambilData = false;

    if (tampilkanLoading) {
      refreshButton.disabled = false;
    }
  }
}

// Mengambil data saat tombol Cek Status ditekan.
async function cekStatusDariFirebase() {
  await ambilDataDariFirebase("Data Firebase dicek manual", true);
}

// Fungsi simulasi tetap dipakai jika konfigurasi Firebase belum diisi.
function cekStatusSimulasi() {
  const jarakSampahSimulasi = Math.floor(Math.random() * (JARAK_SAMPAH_KOSONG_CM - BATAS_SAMPAH_PENUH_CM + 1)) + BATAS_SAMPAH_PENUH_CM;
  const kapasitasSimulasi = hitungKapasitasDariJarakSampah(jarakSampahSimulasi);
  const jarakSimulasi = Math.floor(Math.random() * 81) + 10;

  dataTempatSampah.kapasitas = kapasitasSimulasi;
  dataTempatSampah.jarakOrang = jarakSimulasi;
  dataTempatSampah.jarakSampah = jarakSampahSimulasi;
  dataTempatSampah.statusSuara = dataTempatSampah.suaraAktif ? "Simulasi siap" : "Suara Nonaktif";

  tampilkanData("Data simulasi diperbarui");
}

// Menulis nilai ke Firebase jika Firebase sudah siap.
async function tulisKeFirebase(path, nilai, pesanSukses, pesanGagal) {
  if (!firebaseSiap) {
    tampilkanData("Mode simulasi aktif");
    return false;
  }

  try {
    await mintaFirebase(path, "PUT", nilai);
    tampilkanData(pesanSukses);
    return true;
  } catch (error) {
    console.error(pesanGagal, error);
    ubahStatusKoneksi("Firebase gagal ditulis", "error");
    lastUpdate.textContent = pesanGagal;
    return false;
  }
}

// Tombol ini menulis nilai true/false ke smartbin/tutupTerbuka.
async function ubahStatusTutup() {
  const statusBaru = !dataTempatSampah.tutupTerbuka;

  dataTempatSampah.tutupTerbuka = statusBaru;
  tampilkanData(firebaseSiap ? "Perintah servo dikirim" : "Status tutup simulasi diubah");

  if (!firebaseSiap) {
    return;
  }

  toggleLidButton.disabled = true;
  const perintahTerkirim = await tulisKeFirebase(
    pathFirebase.perintahTutup,
    statusBaru,
    "Perintah servo dikirim ke Firebase",
    "Gagal menulis perintah servo ke Firebase."
  );

  if (perintahTerkirim) {
    await tulisKeFirebase(
      pathFirebase.tutupTerbuka,
      statusBaru,
      "Nilai tutupTerbuka diperbarui",
      "Gagal menulis nilai tutupTerbuka ke Firebase."
    );
  }

  toggleLidButton.disabled = false;
}

// Tombol ini mengaktifkan atau menonaktifkan suara DFPlayer Mini.
async function ubahStatusSuara() {
  const statusBaru = !dataTempatSampah.suaraAktif;

  dataTempatSampah.suaraAktif = statusBaru;
  dataTempatSampah.statusSuara = statusBaru ? "Siap" : "Suara Nonaktif";
  tampilkanData(firebaseSiap ? "Perintah suara dikirim" : "Status suara simulasi diubah");

  if (!firebaseSiap) {
    return;
  }

  aturTombolSuaraNonaktif(true);
  await tulisKeFirebase(
    pathFirebase.suaraAktif,
    statusBaru,
    "Nilai suaraAktif diperbarui",
    "Gagal menulis nilai suaraAktif ke Firebase."
  );
  aturTombolSuaraNonaktif(false);
}

// Tombol Tes Suara menulis angka 1, 2, atau 3 ke smartbin/perintahSuara.
async function kirimPerintahSuara(nomorSuara) {
  dataTempatSampah.perintahSuara = nomorSuara;
  dataTempatSampah.statusSuara = dataTempatSampah.suaraAktif
    ? `Memutar suara ${nomorSuara}`
    : "Suara Nonaktif";

  tampilkanData(firebaseSiap ? `Tes Suara ${nomorSuara} dikirim` : `Tes Suara ${nomorSuara} simulasi`);

  if (!firebaseSiap) {
    return;
  }

  aturTombolSuaraNonaktif(true);
  await tulisKeFirebase(
    pathFirebase.perintahSuara,
    nomorSuara,
    `Perintah Suara ${nomorSuara} dikirim`,
    "Gagal menulis nilai perintahSuara ke Firebase."
  );
  aturTombolSuaraNonaktif(false);
}

// Mengaktifkan koneksi Firebase REST dan membaca data secara berkala.
async function mulaiFirebase() {
  if (konfigurasiFirebaseBelumDiisi()) {
    ubahStatusKoneksi("Simulasi aktif", "warning");
    tampilkanData("Firebase belum dikonfigurasi");
    return;
  }

  firebaseSiap = true;
  ubahStatusKoneksi("Menghubungkan Firebase", "warning");
  await ambilDataDariFirebase("Data Firebase dimuat", false);

  if (intervalFirebase) {
    clearInterval(intervalFirebase);
  }

  intervalFirebase = setInterval(function () {
    ambilDataDariFirebase("Data Firebase diperbarui", false);
  }, INTERVAL_FIREBASE_MS);
}

// Tombol utama aplikasi.
toggleLidButton.addEventListener("click", ubahStatusTutup);
toggleSoundButton.addEventListener("click", ubahStatusSuara);

soundCommandButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    kirimPerintahSuara(Number(button.dataset.soundCommand));
  });
});

// Tombol Cek Status membaca Firebase sekali, atau simulasi jika config belum diisi.
refreshButton.addEventListener("click", function () {
  if (firebaseSiap) {
    cekStatusDariFirebase();
    return;
  }

  cekStatusSimulasi();
});

// Menampilkan data awal, lalu mencoba menghubungkan ke Firebase.
tampilkanData();
mulaiFirebase();

// Mendaftarkan service worker jika file PWA tersedia di folder aplikasi.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("service-worker.js")
      .then(function () {
        console.log("Service worker Smart Bin Monitor aktif.");
      })
      .catch(function (error) {
        console.error("Service worker gagal didaftarkan:", error);
      });
  });
}
