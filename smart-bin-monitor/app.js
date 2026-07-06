/*
  ==============================================================
  KONFIGURASI FIREBASE
  ==============================================================
  Ganti semua nilai GANTI_... di bawah ini dengan konfigurasi
  Firebase Web App milik kamu dari Firebase Console.
*/
const firebaseConfig = {
  apiKey: "GANTI_API_KEY",
  authDomain: "GANTI_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://GANTI_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "GANTI_PROJECT_ID",
  storageBucket: "GANTI_PROJECT_ID.appspot.com",
  messagingSenderId: "GANTI_MESSAGING_SENDER_ID",
  appId: "GANTI_APP_ID"
};

// Firebase Web SDK dari CDN resmi Google.
const FIREBASE_SDK_VERSION = "12.15.0";

// Semua path Firebase dikumpulkan di sini agar mudah dicari dan diganti.
const pathFirebase = {
  kapasitas: "smartbin/kapasitas",
  jarakOrang: "smartbin/jarakOrang",
  statusSampah: "smartbin/statusSampah",
  tutupTerbuka: "smartbin/tutupTerbuka",
  suaraAktif: "smartbin/suaraAktif",
  perintahSuara: "smartbin/perintahSuara",
  statusSuara: "smartbin/statusSuara"
};

// Data awal dipakai agar tampilan tidak kosong sebelum Firebase berhasil terhubung.
let dataTempatSampah = {
  kapasitas: 65,
  jarakOrang: 35,
  statusSampah: "Sedang",
  tutupTerbuka: false,
  suaraAktif: true,
  perintahSuara: 0,
  statusSuara: "Siap"
};

let database = null;
let firebaseSiap = false;
let fungsiFirebase = {};

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

// Mengubah nilai jarak dari Firebase menjadi angka aman untuk ditampilkan.
function bersihkanJarak(nilai) {
  const angka = Number(nilai);

  if (!Number.isFinite(angka)) {
    return dataTempatSampah.jarakOrang;
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
  const kunciWajib = ["apiKey", "authDomain", "databaseURL", "projectId", "storageBucket", "messagingSenderId", "appId"];

  return kunciWajib.some(function (kunci) {
    const nilai = firebaseConfig[kunci];
    return !nilai || String(nilai).includes("GANTI_");
  });
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

// Listener realtime untuk satu path Firebase.
function dengarkanPath(path, saatDataMasuk) {
  const dataRef = fungsiFirebase.ref(database, path);

  fungsiFirebase.onValue(dataRef, function (snapshot) {
    if (snapshot.exists()) {
      saatDataMasuk(snapshot.val());
      ubahStatusKoneksi("Firebase realtime aktif", "online");
      tampilkanData("Data Firebase diperbarui");
      return;
    }

    ubahStatusKoneksi("Data Firebase belum lengkap", "warning");
  }, function (error) {
    console.error("Gagal membaca Firebase:", error);
    ubahStatusKoneksi("Firebase gagal dibaca", "error");
    lastUpdate.textContent = "Periksa koneksi, konfigurasi, atau rules database Firebase.";
  });
}

// Memasang listener agar perubahan di Firebase otomatis mengubah tampilan.
function pasangListenerRealtime() {
  dengarkanPath(pathFirebase.kapasitas, function (nilai) {
    dataTempatSampah.kapasitas = batasiKapasitas(nilai);
  });

  dengarkanPath(pathFirebase.jarakOrang, function (nilai) {
    dataTempatSampah.jarakOrang = bersihkanJarak(nilai);
  });

  dengarkanPath(pathFirebase.statusSampah, function (nilai) {
    dataTempatSampah.statusSampah = bersihkanTeks(nilai, dataTempatSampah.statusSampah);
  });

  dengarkanPath(pathFirebase.tutupTerbuka, function (nilai) {
    dataTempatSampah.tutupTerbuka = bersihkanBoolean(nilai, dataTempatSampah.tutupTerbuka);
  });

  dengarkanPath(pathFirebase.suaraAktif, function (nilai) {
    dataTempatSampah.suaraAktif = bersihkanBoolean(nilai, dataTempatSampah.suaraAktif);
  });

  dengarkanPath(pathFirebase.perintahSuara, function (nilai) {
    dataTempatSampah.perintahSuara = bersihkanPerintahSuara(nilai);
  });

  dengarkanPath(pathFirebase.statusSuara, function (nilai) {
    dataTempatSampah.statusSuara = bersihkanTeks(nilai, dataTempatSampah.statusSuara);
  });
}

// Mengambil semua data smartbin sekali saat tombol Cek Status ditekan.
async function cekStatusDariFirebase() {
  refreshButton.disabled = true;
  lastUpdate.textContent = "Mengambil data terbaru dari Firebase...";

  try {
    const smartbinRef = fungsiFirebase.ref(database, "smartbin");
    const snapshot = await fungsiFirebase.get(smartbinRef);

    if (!snapshot.exists()) {
      ubahStatusKoneksi("Data smartbin belum ada", "warning");
      lastUpdate.textContent = "Node smartbin belum ditemukan di Firebase.";
      return;
    }

    const data = snapshot.val();
    dataTempatSampah.kapasitas = batasiKapasitas(data.kapasitas);
    dataTempatSampah.jarakOrang = bersihkanJarak(data.jarakOrang);
    dataTempatSampah.statusSampah = bersihkanTeks(data.statusSampah, tentukanStatusSampah(dataTempatSampah.kapasitas));
    dataTempatSampah.tutupTerbuka = bersihkanBoolean(data.tutupTerbuka, dataTempatSampah.tutupTerbuka);
    dataTempatSampah.suaraAktif = bersihkanBoolean(data.suaraAktif, dataTempatSampah.suaraAktif);
    dataTempatSampah.perintahSuara = bersihkanPerintahSuara(data.perintahSuara);
    dataTempatSampah.statusSuara = bersihkanTeks(data.statusSuara, dataTempatSampah.statusSuara);

    tampilkanData("Data Firebase dicek manual");
  } catch (error) {
    console.error("Gagal cek status Firebase:", error);
    ubahStatusKoneksi("Cek Firebase gagal", "error");
    lastUpdate.textContent = "Gagal mengambil data terbaru dari Firebase.";
  } finally {
    refreshButton.disabled = false;
  }
}

// Fungsi simulasi tetap dipakai jika konfigurasi Firebase belum diisi.
function cekStatusSimulasi() {
  const kapasitasSimulasi = Math.floor(Math.random() * 101);
  const jarakSimulasi = Math.floor(Math.random() * 81) + 10;

  dataTempatSampah.kapasitas = kapasitasSimulasi;
  dataTempatSampah.jarakOrang = jarakSimulasi;
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
    const dataRef = fungsiFirebase.ref(database, path);
    await fungsiFirebase.set(dataRef, nilai);
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
  await tulisKeFirebase(
    pathFirebase.tutupTerbuka,
    statusBaru,
    "Nilai tutupTerbuka diperbarui",
    "Gagal menulis nilai tutupTerbuka ke Firebase."
  );
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

// Memuat Firebase dari CDN dan mengaktifkan Realtime Database.
async function mulaiFirebase() {
  if (konfigurasiFirebaseBelumDiisi()) {
    ubahStatusKoneksi("Simulasi aktif", "warning");
    tampilkanData("Firebase belum dikonfigurasi");
    return;
  }

  try {
    ubahStatusKoneksi("Menghubungkan Firebase", "warning");

    const firebaseApp = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`);
    const firebaseDatabase = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-database.js`);

    const app = firebaseApp.initializeApp(firebaseConfig);
    database = firebaseDatabase.getDatabase(app);

    fungsiFirebase = {
      ref: firebaseDatabase.ref,
      onValue: firebaseDatabase.onValue,
      get: firebaseDatabase.get,
      set: firebaseDatabase.set
    };

    firebaseSiap = true;
    pasangListenerRealtime();
    ubahStatusKoneksi("Firebase realtime aktif", "online");
    lastUpdate.textContent = "Menunggu data realtime dari Firebase...";
  } catch (error) {
    console.error("Gagal menghubungkan Firebase:", error);
    firebaseSiap = false;
    ubahStatusKoneksi("Firebase gagal terhubung", "error");
    lastUpdate.textContent = "Periksa konfigurasi Firebase dan koneksi internet.";
  }
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
